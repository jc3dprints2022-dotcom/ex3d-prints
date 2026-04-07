import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { kitOrderId } = await req.json();
    if (!kitOrderId) return Response.json({ error: 'Missing kitOrderId' }, { status: 400 });

    const kitOrder = await base44.asServiceRole.entities.ShippingKitOrder.get(kitOrderId);
    if (!kitOrder) return Response.json({ error: 'Kit order not found' }, { status: 404 });

    // Get maker user for their address
    const makerUser = await base44.asServiceRole.entities.User.get(kitOrder.user_id);
    if (!makerUser) return Response.json({ error: 'Maker user not found' }, { status: 404 });

    const addr = kitOrder.shipping_address?.street ? kitOrder.shipping_address : makerUser.address;
    if (!addr?.street) return Response.json({ error: 'No shipping address found for this maker' }, { status: 400 });

    const SHIPPO_KEY = Deno.env.get('SHIPPO_API_KEY');
    const adminUser = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminEmail = 'jc3dprints2022@gmail.com';

    // Use Shippo to create a shipment and purchase a label
    const shipmentRes = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: {
            'Authorization': `ShippoToken ${SHIPPO_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            address_from: {
                name: 'EX3D Prints',
                street1: '3700 Willow Creek Rd',
                city: 'Prescott',
                state: 'AZ',
                zip: '86301',
                country: 'US',
                email: adminEmail
            },
            address_to: {
                name: addr.name || makerUser.full_name,
                street1: addr.street,
                city: addr.city,
                state: addr.state,
                zip: addr.zip,
                country: 'US',
                email: makerUser.email
            },
            parcels: [{
                length: '12',
                width: '10',
                height: '8',
                distance_unit: 'in',
                weight: '3',
                mass_unit: 'lb'
            }],
            async: false
        })
    });

    const shipment = await shipmentRes.json();
    if (!shipment.rates || shipment.rates.length === 0) {
        return Response.json({ error: 'No shipping rates available', details: shipment }, { status: 500 });
    }

    // Pick cheapest USPS rate
    const uspsRates = shipment.rates.filter(r => r.provider === 'USPS');
    const selectedRate = uspsRates.length > 0
        ? uspsRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
        : shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];

    // Purchase the label
    const transactionRes = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: {
            'Authorization': `ShippoToken ${SHIPPO_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            rate: selectedRate.object_id,
            label_file_type: 'PDF',
            async: false
        })
    });

    const transaction = await transactionRes.json();
    if (transaction.status !== 'SUCCESS') {
        return Response.json({ error: 'Failed to purchase label', details: transaction }, { status: 500 });
    }

    // Save label URL and tracking to the kit order
    await base44.asServiceRole.entities.ShippingKitOrder.update(kitOrderId, {
        shipping_label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        status: 'processing'
    });

    return Response.json({
        success: true,
        label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        carrier: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        cost: selectedRate.amount
    });
});