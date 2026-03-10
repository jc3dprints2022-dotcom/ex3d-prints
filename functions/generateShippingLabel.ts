import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SHIPPO_BASE = 'https://api.goshippo.com';

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

    const apiKey = Deno.env.get('SHIPPO_API_KEY');
    if (!apiKey) return Response.json({ error: 'SHIPPO_API_KEY not configured' }, { status: 500 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Local delivery — no label needed
    if (order.is_local_delivery) {
      return Response.json({ success: true, message: 'Local delivery — no label needed', is_local_delivery: true });
    }

    if (!order.shipping_address?.street) {
      return Response.json({ error: 'Order has no shipping address' }, { status: 400 });
    }

    // Get maker's address as "from"
    let fromAddr = { name: 'EX3D Prints', street: '1 N Gurley St', city: 'Prescott', state: 'AZ', zip: '86301' };
    if (order.maker_id) {
      try {
        const makers = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
        if (makers.length > 0 && makers[0].address?.street) {
          const m = makers[0];
          fromAddr = {
            name: m.full_name || 'EX3D Maker',
            street: m.address.street,
            city: m.address.city,
            state: m.address.state,
            zip: m.address.zip,
            phone: m.phone || ''
          };
        }
      } catch (e) {
        console.error('Could not fetch maker address, using default:', e.message);
      }
    }

    const toAddr = order.shipping_address;
    const totalGrams = order.items.reduce((sum, item) => sum + ((item.weight_grams || 50) * (item.quantity || 1)), 0);
    const weightLb = gToLb(totalGrams);

    // 1. Create address objects in Shippo
    const [addrFrom, addrTo] = await Promise.all([
      shippoPost('/addresses/', {
        name: fromAddr.name,
        street1: fromAddr.street,
        city: fromAddr.city,
        state: fromAddr.state,
        zip: fromAddr.zip,
        country: 'US',
        phone: fromAddr.phone || '',
        validate: false
      }, apiKey),
      shippoPost('/addresses/', {
        name: toAddr.name || 'Customer',
        street1: toAddr.street,
        city: toAddr.city,
        state: toAddr.state,
        zip: toAddr.zip,
        country: 'US',
        phone: toAddr.phone || '',
        validate: true
      }, apiKey)
    ]);

    console.log('Addresses created. From:', addrFrom.object_id, 'To:', addrTo.object_id);

    // 2. Create shipment to get rates
    const shipment = await shippoPost('/shipments/', {
      address_from: addrFrom.object_id,
      address_to: addrTo.object_id,
      parcels: [{
        length: '6',
        width: '6',
        height: '4',
        distance_unit: 'in',
        weight: weightLb.toString(),
        mass_unit: 'lb'
      }],
      async: false
    }, apiKey);

    console.log('Shipment created:', shipment.object_id, '| Rates count:', shipment.rates?.length);

    if (!shipment.rates || shipment.rates.length === 0) {
      return Response.json({ error: 'No shipping rates available for this address' }, { status: 400 });
    }

    // 3. Pick best rate: Priority for priority orders, otherwise cheapest USPS rate
    let selectedRate = null;
    const uspsRates = shipment.rates.filter(r => r.provider === 'USPS');

    if (order.is_priority) {
      selectedRate = uspsRates.find(r => r.servicelevel?.token?.includes('priority'))
        || uspsRates[0]
        || shipment.rates[0];
    } else {
      // Pick cheapest USPS rate, fallback to cheapest overall
      const sorted = (uspsRates.length > 0 ? uspsRates : shipment.rates)
        .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
      selectedRate = sorted[0];
    }

    console.log('Selected rate:', selectedRate.provider, selectedRate.servicelevel?.name, '$' + selectedRate.amount);

    // 4. Purchase label (transaction)
    const transaction = await shippoPost('/transactions/', {
      rate: selectedRate.object_id,
      label_file_type: 'PDF',
      async: false
    }, apiKey);

    if (transaction.status !== 'SUCCESS') {
      return Response.json({
        error: 'Label purchase failed',
        details: transaction.messages || transaction.status
      }, { status: 500 });
    }

    const trackingNumber = transaction.tracking_number;
    const labelUrl = transaction.label_url;

    console.log('Label purchased. Tracking:', trackingNumber, 'URL:', labelUrl);

    // 5. Update order
    await base44.asServiceRole.entities.Order.update(orderId, {
      tracking_number: trackingNumber,
      shipping_label_url: labelUrl,
      shipping_cost: parseFloat(selectedRate.amount)
    });

    // 6. Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'shipping_label_purchase',
      user_id: user.id,
      file_id: orderId,
      details: {
        orderId,
        trackingNumber,
        carrier: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        cost: selectedRate.amount,
        weightLb
      },
      severity: 'info'
    });

    return Response.json({
      success: true,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel?.name,
      cost: selectedRate.amount
    });

  } catch (error) {
    console.error('generateShippingLabel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});