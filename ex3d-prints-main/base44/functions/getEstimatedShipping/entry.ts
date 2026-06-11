import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SHIPPO_BASE = 'https://api.goshippo.com';

async function getShippoKey(base44) {
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (admins[0]?.shipping_api_mode === 'test') {
      return Deno.env.get('SHIPPO_TEST_API_KEY');
    }
  } catch (_) {}
  return Deno.env.get('SHIPPO_API_KEY');
}

async function shippoPost(path, body, apiKey) {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shippo ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

function mmToIn(mm) {
  return Math.max(1, parseFloat((mm / 25.4).toFixed(1)));
}

function gToLb(grams) {
  return Math.max(0.1, Math.round((grams / 453.592) * 100) / 100);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { shippingAddress, items } = await req.json();

    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
      return Response.json({ error: 'Complete shipping address required' }, { status: 400 });
    }

    const apiKey = await getShippoKey(base44);
    if (!apiKey) return Response.json({ shipping_cost: 5.99, fallback: true });

    // Get active makers with valid addresses AND at least one free printer
    const [allUsers, allPrinters, allOrders] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ account_status: 'active' }),
      base44.asServiceRole.entities.Printer.list(),
      base44.asServiceRole.entities.Order.list(),
    ]);

    // Count active orders per maker (occupying printers)
    const activePrinterOrdersMap = {};
    allOrders.forEach(o => {
      if (!['pending', 'accepted', 'printing'].includes(o.status)) return;
      if (!o.maker_id) return;
      activePrinterOrdersMap[o.maker_id] = (activePrinterOrdersMap[o.maker_id] || 0) + 1;
    });

    let makers = allUsers.filter(u => {
      if (!u.business_roles?.includes('maker')) return false;
      if (!u.maker_id) return false;
      if (!u.address?.street || !u.address?.city || !u.address?.state || !u.address?.zip) return false;
      // Only include makers with at least one free printer
      const makerActivePrinters = allPrinters.filter(p => p.maker_id === u.maker_id && p.status === 'active');
      const occupiedPrinters = activePrinterOrdersMap[u.maker_id] || 0;
      return makerActivePrinters.length > 0 && occupiedPrinters < makerActivePrinters.length;
    });

    // Prefer same-state makers (nearest approximation without geocoding)
    const sameState = makers.filter(m => m.address.state === shippingAddress.state);
    const others = makers.filter(m => m.address.state !== shippingAddress.state);
    const selectedMakers = [...sameState, ...others].slice(0, 3);

    // Fall back to ERAU Prescott if no makers
    if (selectedMakers.length === 0) {
      selectedMakers.push({
        full_name: 'EX3D Prints',
        address: { street: '1 N Gurley St', city: 'Prescott', state: 'AZ', zip: '86301' }
      });
    }

    // Calculate parcel from cart items
    const totalWeightGrams = (items || []).reduce((sum, item) => sum + ((item.weight_grams || 60) * (item.quantity || 1)), 0);
    const weightLb = gToLb(totalWeightGrams || 100);

    let parcelLength = 6, parcelWidth = 6, parcelHeight = 4;
    const dims = (items || []).map(i => i.dimensions).filter(Boolean);
    if (dims.length > 0) {
      parcelLength = Math.max(4, Math.max(...dims.map(d => mmToIn(d.length || 150))));
      parcelWidth = Math.max(4, Math.max(...dims.map(d => mmToIn(d.width || 150))));
      parcelHeight = Math.max(3, Math.max(...dims.map(d => mmToIn(d.height || 60))));
    }

    // Get rates from makers in parallel
    const ratePromises = selectedMakers.map(async (maker) => {
      try {
        const [addrFrom, addrTo] = await Promise.all([
          shippoPost('/addresses/', {
            name: maker.full_name || 'EX3D Maker',
            street1: maker.address.street,
            city: maker.address.city,
            state: maker.address.state,
            zip: maker.address.zip,
            country: 'US',
            validate: false
          }, apiKey),
          shippoPost('/addresses/', {
            name: shippingAddress.name || 'Customer',
            street1: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            country: 'US',
            validate: false
          }, apiKey)
        ]);

        const shipment = await shippoPost('/shipments/', {
          address_from: addrFrom.object_id,
          address_to: addrTo.object_id,
          parcels: [{
            length: parcelLength.toString(),
            width: parcelWidth.toString(),
            height: parcelHeight.toString(),
            distance_unit: 'in',
            weight: weightLb.toString(),
            mass_unit: 'lb'
          }],
          async: false
        }, apiKey);

        if (!shipment.rates || shipment.rates.length === 0) return null;

        const uspsRates = shipment.rates.filter(r => r.provider === 'USPS');
        const ratePool = uspsRates.length > 0 ? uspsRates : shipment.rates;
        const cheapest = ratePool.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
        return parseFloat(cheapest.amount);
      } catch (err) {
        console.error(`Rate calc failed for maker:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(ratePromises);
    const validRates = results.filter(r => r !== null && r > 0);

    if (validRates.length === 0) {
      return Response.json({ shipping_cost: 5.99, fallback: true });
    }

    const avg = validRates.reduce((s, r) => s + r, 0) / validRates.length;
    const shippingCost = Math.round(avg * 100) / 100;

    return Response.json({
      shipping_cost: shippingCost,
      makers_sampled: validRates.length,
      estimated: true
    });

  } catch (error) {
    console.error('getEstimatedShipping error:', error);
    return Response.json({ shipping_cost: 5.99, fallback: true });
  }
});