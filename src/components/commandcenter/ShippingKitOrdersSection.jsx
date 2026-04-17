import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SHIPPO_BASE = 'https://api.goshippo.com';
const ADMIN_EMAIL = 'jc3dprints2022@gmail.com';
const ADMIN_PHONE = '6108583200';

function cleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

async function shippoRequest(path, options, apiKey) {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));

  return {
    ok: res.ok,
    status: res.status,
    data
  };
}

async function shippoPost(path, body, apiKey) {
  return shippoRequest(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    apiKey
  );
}

async function shippoGet(path, apiKey) {
  return shippoRequest(
    path,
    {
      method: 'GET'
    },
    apiKey
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const kitOrderId = body?.kitOrderId;

    if (!kitOrderId) {
      return Response.json({ error: 'Missing kitOrderId' }, { status: 400 });
    }

    const kitOrder = await base44.asServiceRole.entities.ShippingKitOrder.get(kitOrderId);
    if (!kitOrder) {
      return Response.json({ error: 'Kit order not found' }, { status: 404 });
    }

    const makerUser = await base44.asServiceRole.entities.User.get(kitOrder.user_id);
    if (!makerUser) {
      return Response.json({ error: 'Maker user not found' }, { status: 404 });
    }

    const addr = kitOrder.shipping_address?.street
      ? kitOrder.shipping_address
      : makerUser.address;

    if (!addr?.street || !addr?.city || !addr?.state || !addr?.zip) {
      return Response.json(
        { error: 'No complete shipping address found for this maker' },
        { status: 400 }
      );
    }

    const SHIPPO_KEY = Deno.env.get('SHIPPO_API_KEY');
    if (!SHIPPO_KEY) {
      return Response.json({ error: 'Missing SHIPPO_API_KEY' }, { status: 500 });
    }

    const sender = {
      name: 'EX3D Prints',
      company: 'EX3D Prints',
      street1: '3700 Willow Creek Rd',
      city: 'Prescott',
      state: 'AZ',
      zip: '86301',
      country: 'US',
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE
    };

    const recipient = {
      name: cleanString(addr.name) || cleanString(makerUser.full_name) || 'Maker',
      street1: cleanString(addr.street),
      city: cleanString(addr.city),
      state: cleanString(addr.state),
      zip: cleanString(addr.zip),
      country: 'US',
      email: cleanString(makerUser.email) || ADMIN_EMAIL,
      phone: cleanString(addr.phone) || cleanString(makerUser.phone) || ''
    };

    if (!sender.email || !sender.phone) {
      return Response.json(
        {
          error: 'Sender info missing before Shippo request',
          sender
        },
        { status: 400 }
      );
    }

    const shipmentPayload = {
      address_from: sender,
      address_to: recipient,
      address_return: sender,
      parcels: [
        {
          length: '12',
          width: '10',
          height: '8',
          distance_unit: 'in',
          weight: '3',
          mass_unit: 'lb'
        }
      ],
      async: false
    };

    console.log('Shippo shipment payload:', JSON.stringify(shipmentPayload, null, 2));

    const shipmentResult = await shippoPost('/shipments/', shipmentPayload, SHIPPO_KEY);

    if (!shipmentResult.ok) {
      return Response.json(
        {
          error: 'Failed to create shipment',
          details: shipmentResult.data
        },
        { status: 500 }
      );
    }

    const shipment = shipmentResult.data;
    console.log('Shippo shipment response:', JSON.stringify(shipment, null, 2));

    if (!shipment.rates || shipment.rates.length === 0) {
      return Response.json(
        {
          error: 'No shipping rates available',
          details: shipment,
          shippo_address_from: shipment.address_from || null,
          shippo_address_return: shipment.address_return || null
        },
        { status: 500 }
      );
    }

    const uspsRates = shipment.rates.filter((r) => r.provider === 'USPS');

    const selectedRate =
      uspsRates.length > 0
        ? [...uspsRates].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
        : [...shipment.rates].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];

    if (!selectedRate?.object_id) {
      return Response.json(
        {
          error: 'No valid shipping rate found',
          details: shipment
        },
        { status: 500 }
      );
    }

    const transactionPayload = {
      rate: selectedRate.object_id,
      label_file_type: 'PDF',
      async: false
    };

    console.log('Shippo transaction payload:', JSON.stringify(transactionPayload, null, 2));

    const transactionResult = await shippoPost('/transactions/', transactionPayload, SHIPPO_KEY);

    if (!transactionResult.ok) {
      return Response.json(
        {
          error: 'Failed to purchase label',
          details: transactionResult.data,
          shippo_address_from: shipment.address_from || null,
          shippo_address_return: shipment.address_return || null
        },
        { status: 500 }
      );
    }

    let transaction = transactionResult.data;
    console.log('Shippo transaction create response:', JSON.stringify(transaction, null, 2));

    const transactionId = transaction.object_id || '';
    let labelUrl = transaction.label_url || '';
    let trackingNumber = transaction.tracking_number || '';

    // Recovery step: fetch the transaction again by object_id if label_url is missing
    if (transactionId && !labelUrl) {
      const retrieveResult = await shippoGet(`/transactions/${transactionId}/`, SHIPPO_KEY);

      console.log('Shippo transaction retrieve response:', JSON.stringify(retrieveResult.data, null, 2));

      if (retrieveResult.ok) {
        transaction = retrieveResult.data;
        labelUrl = transaction.label_url || '';
        trackingNumber = transaction.tracking_number || trackingNumber || '';
      }
    }

    if (transaction.status !== 'SUCCESS') {
      return Response.json(
        {
          error: 'Failed to purchase label',
          details: transaction,
          shippo_address_from: shipment.address_from || null,
          shippo_address_return: shipment.address_return || null
        },
        { status: 500 }
      );
    }

    await base44.asServiceRole.entities.ShippingKitOrder.update(kitOrderId, {
      shipping_label_url: labelUrl || '',
      tracking_number: trackingNumber || '',
      shippo_transaction_id: transactionId || '',
      status: 'processing'
    });

    return Response.json({
      success: true,
      label_url: labelUrl || '',
      tracking_number: trackingNumber || '',
      shippo_transaction_id: transactionId || '',
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel?.name,
      cost: selectedRate.amount,
      warning: !labelUrl
        ? 'Transaction succeeded, but no label_url was returned by Shippo.'
        : ''
    });
  } catch (error) {
    console.error('generate shipping label error:', error);

    return Response.json(
      {
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
});