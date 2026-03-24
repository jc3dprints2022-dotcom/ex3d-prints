import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SHIPPO_BASE = 'https://api.goshippo.com';
const TEST_EMAIL = 'jc3dprints2022@gmail.com';

async function getShippoKey(userEmail, base44) {
  if (userEmail === TEST_EMAIL) {
    return Deno.env.get('SHIPPO_TEST_API_KEY');
  }
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (admins[0]?.shipping_api_mode === 'test') {
      return Deno.env.get('SHIPPO_TEST_API_KEY');
    }
  } catch (_) {}
  return Deno.env.get('SHIPPO_API_KEY');
}

function gToLb(grams) {
  return Math.max(0.1, Math.round((grams / 453.592) * 100) / 100);
}

async function shippoPost(path, body, apiKey) {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shippo ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId } = await req.json();
    if (!orderId) return Response.json({ error: 'orderId is required' }, { status: 400 });

    const apiKey = await getShippoKey(user.email, base44);
    if (!apiKey) return Response.json({ error: 'Shippo API key not configured' }, { status: 500 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    if (order.is_local_delivery) {
      return Response.json({ success: true, message: 'Local delivery — no label needed', is_local_delivery: true });
    }

    if (!order.shipping_address?.street) {
      return Response.json({ error: 'Order has no shipping address' }, { status: 400 });
    }

    let fromAddr = { name: 'EX3D Prints', street: '1 N Gurley St', city: 'Prescott', state: 'AZ', zip: '86301' };
    if (order.maker_id) {
      try {
        const makers = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
        if (makers.length > 0 && makers[0].address?.street) {
          const m = makers[0];
          fromAddr = { name: m.full_name || 'EX3D Maker', street: m.address.street, city: m.address.city, state: m.address.state, zip: m.address.zip, phone: m.phone || '' };
        }
      } catch (e) {
        console.error('Could not fetch maker address, using default:', e.message);
      }
    }

    const toAddr = order.shipping_address;
    const totalGrams = order.items.reduce((sum, item) => sum + ((item.weight_grams || 50) * (item.quantity || 1)), 0);
    const weightLb = gToLb(totalGrams);

    // Calculate parcel dimensions from order items
    const mmToIn = (mm) => Math.max(1, parseFloat((mm / 25.4).toFixed(1)));
    const dims = order.items.map(i => i.dimensions).filter(Boolean);
    let parcelL = 6, parcelW = 6, parcelH = 4;
    if (dims.length > 0) {
      parcelL = Math.max(4, Math.max(...dims.map(d => mmToIn(d.length || 150))));
      parcelW = Math.max(4, Math.max(...dims.map(d => mmToIn(d.width || 150))));
      parcelH = Math.max(3, Math.max(...dims.map(d => mmToIn(d.height || 60))));
    }

    const [addrFrom, addrTo] = await Promise.all([
      shippoPost('/addresses/', { name: fromAddr.name, street1: fromAddr.street, city: fromAddr.city, state: fromAddr.state, zip: fromAddr.zip, country: 'US', phone: fromAddr.phone || '', validate: false }, apiKey),
      shippoPost('/addresses/', { name: toAddr.name || 'Customer', street1: toAddr.street, city: toAddr.city, state: toAddr.state, zip: toAddr.zip, country: 'US', phone: toAddr.phone || '', validate: true }, apiKey)
    ]);

    const shipment = await shippoPost('/shipments/', {
      address_from: addrFrom.object_id,
      address_to: addrTo.object_id,
      parcels: [{ length: parcelL.toString(), width: parcelW.toString(), height: parcelH.toString(), distance_unit: 'in', weight: weightLb.toString(), mass_unit: 'lb' }],
      async: false
    }, apiKey);

    if (!shipment.rates || shipment.rates.length === 0) {
      return Response.json({ error: 'No shipping rates available for this address' }, { status: 400 });
    }

    const uspsRates = shipment.rates.filter(r => r.provider === 'USPS');
    let selectedRate;
    if (order.is_priority) {
      selectedRate = uspsRates.find(r => r.servicelevel?.token?.includes('priority')) || uspsRates[0] || shipment.rates[0];
    } else {
      const sorted = (uspsRates.length > 0 ? uspsRates : shipment.rates).sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
      selectedRate = sorted[0];
    }

    const transaction = await shippoPost('/transactions/', { rate: selectedRate.object_id, label_file_type: 'PDF', async: false }, apiKey);

    if (transaction.status !== 'SUCCESS') {
      return Response.json({ error: 'Label purchase failed', details: transaction.messages || transaction.status }, { status: 500 });
    }

    await base44.asServiceRole.entities.Order.update(orderId, {
      tracking_number: transaction.tracking_number,
      shipping_label_url: transaction.label_url,
      shipping_cost: parseFloat(selectedRate.amount)
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'shipping_label_purchase',
      user_id: user.id,
      file_id: orderId,
      details: { orderId, trackingNumber: transaction.tracking_number, carrier: selectedRate.provider, service: selectedRate.servicelevel?.name, cost: selectedRate.amount, weightLb },
      severity: 'info'
    });

    return Response.json({
      success: true,
      tracking_number: transaction.tracking_number,
      label_url: transaction.label_url,
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel?.name,
      cost: selectedRate.amount
    });

  } catch (error) {
    console.error('generateShippingLabel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});