import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SHIPPO_BASE = 'https://api.goshippo.com';

// Keep API key in Base44 Secrets
function getShippoKey() {
  return Deno.env.get('SHIPPO_API_KEY');
}

// Default business sender info for USPS fallback
// Replace these with your real business details
const DEFAULT_SENDER = {
  name: 'EX3D Prints',
  street: '1 N Gurley St',
  city: 'Prescott',
  state: 'AZ',
  zip: '86301',
  country: 'US',
  phone: '9285551234',
  email: 'jc3dprints2022@gmail.com',
};

function gToLb(grams) {
  return Math.max(0.1, Math.round((grams / 453.592) * 100) / 100);
}

function mmToIn(mm) {
  return Math.max(1, parseFloat((Number(mm || 0) / 25.4).toFixed(1)));
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cleanPhone(value) {
  return cleanString(value);
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function shippoPost(path, body, apiKey) {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Shippo ${path} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await req.json().catch(() => null);
    const orderId = requestBody?.orderId;

    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 });
    }

    const apiKey = getShippoKey();
    if (!apiKey) {
      return Response.json({ error: 'Shippo API key not configured' }, { status: 500 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.is_local_delivery) {
      return Response.json({
        success: true,
        message: 'Local delivery — no label needed',
        is_local_delivery: true,
      });
    }

    if (!order.shipping_address?.street) {
      return Response.json({ error: 'Order has no shipping address' }, { status: 400 });
    }

    // Start with default business sender info
    let fromAddr = {
      name: DEFAULT_SENDER.name,
      street: DEFAULT_SENDER.street,
      city: DEFAULT_SENDER.city,
      state: DEFAULT_SENDER.state,
      zip: DEFAULT_SENDER.zip,
      country: DEFAULT_SENDER.country,
      phone: DEFAULT_SENDER.phone,
      email: DEFAULT_SENDER.email,
    };

    // If the order has a maker, try to use that maker as sender
    if (order.maker_id) {
      try {
        const makers = await base44.asServiceRole.entities.User.filter({
          maker_id: order.maker_id,
        });

        if (makers.length > 0 && makers[0].address?.street) {
          const maker = makers[0];

          fromAddr = {
            name: cleanString(maker.full_name) || 'EX3D Maker',
            street: cleanString(maker.address?.street) || DEFAULT_SENDER.street,
            city: cleanString(maker.address?.city) || DEFAULT_SENDER.city,
            state: cleanString(maker.address?.state) || DEFAULT_SENDER.state,
            zip: cleanString(maker.address?.zip) || DEFAULT_SENDER.zip,
            country: 'US',
            phone: cleanPhone(maker.phone) || DEFAULT_SENDER.phone,
            email: cleanString(maker.email) || DEFAULT_SENDER.email,
          };
        }
      } catch (e) {
        console.error('Could not fetch maker address, using default sender:', e);
      }
    }

    // USPS specifically needs sender email + phone
    if (!fromAddr.email || !fromAddr.phone) {
      return Response.json(
        {
          error: 'Sender info missing email or phone. USPS requires both for the sender address.',
          sender: {
            name: fromAddr.name,
            email: fromAddr.email || null,
            phone: fromAddr.phone || null,
          },
        },
        { status: 400 }
      );
    }

    const toAddr = order.shipping_address;

    const orderItems = Array.isArray(order.items) ? order.items : [];

    const totalGrams = orderItems.reduce((sum, item) => {
      const itemWeight = safeNumber(item?.weight_grams, 50);
      const quantity = safeNumber(item?.quantity, 1);
      return sum + itemWeight * quantity;
    }, 0);

    const weightLb = gToLb(totalGrams || 50);

    let parcelL = 6;
    let parcelW = 6;
    let parcelH = 4;

    const dims = orderItems.map((item) => item?.dimensions).filter(Boolean);

    if (dims.length > 0) {
      parcelL = Math.max(4, ...dims.map((d) => mmToIn(d?.length || 150)));
      parcelW = Math.max(4, ...dims.map((d) => mmToIn(d?.width || 150)));
      parcelH = Math.max(3, ...dims.map((d) => mmToIn(d?.height || 60)));
    }

    const [addrFrom, addrTo] = await Promise.all([
      shippoPost(
        '/addresses/',
        {
          name: fromAddr.name,
          street1: fromAddr.street,
          city: fromAddr.city,
          state: fromAddr.state,
          zip: fromAddr.zip,
          country: fromAddr.country,
          phone: fromAddr.phone,
          email: fromAddr.email,
          validate: false,
        },
        apiKey
      ),
      shippoPost(
        '/addresses/',
        {
          name: cleanString(toAddr.name) || 'Customer',
          street1: cleanString(toAddr.street),
          city: cleanString(toAddr.city),
          state: cleanString(toAddr.state),
          zip: cleanString(toAddr.zip),
          country: 'US',
          phone: cleanPhone(toAddr.phone) || '',
          email: cleanString(toAddr.email) || DEFAULT_SENDER.email,
          validate: false,
        },
        apiKey
      ),
    ]);

    const shipment = await shippoPost(
      '/shipments/',
      {
        address_from: addrFrom.object_id,
        address_to: addrTo.object_id,
        parcels: [
          {
            length: String(parcelL),
            width: String(parcelW),
            height: String(parcelH),
            distance_unit: 'in',
            weight: String(weightLb),
            mass_unit: 'lb',
          },
        ],
        async: false,
      },
      apiKey
    );

    if (!shipment.rates || shipment.rates.length === 0) {
      return Response.json(
        { error: 'No shipping rates available for this address' },
        { status: 400 }
      );
    }

    const uspsRates = shipment.rates.filter((r) => r.provider === 'USPS');

    let selectedRate = null;

    if (order.is_priority) {
      selectedRate =
        uspsRates.find((r) =>
          cleanString(r.servicelevel?.token).toLowerCase().includes('priority')
        ) ||
        uspsRates[0] ||
        shipment.rates[0];
    } else {
      const candidateRates = uspsRates.length > 0 ? uspsRates : shipment.rates;
      const sortedRates = [...candidateRates].sort(
        (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
      );
      selectedRate = sortedRates[0];
    }

    if (!selectedRate?.object_id) {
      return Response.json(
        { error: 'No valid shipping rate could be selected' },
        { status: 400 }
      );
    }

    const transaction = await shippoPost(
      '/transactions/',
      {
        rate: selectedRate.object_id,
        label_file_type: 'PDF',
        async: false,
      },
      apiKey
    );

    if (transaction.status !== 'SUCCESS') {
      return Response.json(
        {
          error: 'Label purchase failed',
          details: transaction.messages || transaction.status,
        },
        { status: 500 }
      );
    }

    await base44.asServiceRole.entities.Order.update(orderId, {
      tracking_number: transaction.tracking_number,
      shipping_label_url: transaction.label_url,
      shipping_cost: parseFloat(selectedRate.amount),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'shipping_label_purchase',
      user_id: user.id,
      file_id: orderId,
      details: {
        orderId,
        trackingNumber: transaction.tracking_number,
        carrier: selectedRate.provider,
        service: selectedRate.servicelevel?.name,
        cost: selectedRate.amount,
        weightLb,
      },
      severity: 'info',
    });

    return Response.json({
      success: true,
      tracking_number: transaction.tracking_number,
      label_url: transaction.label_url,
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel?.name,
      cost: selectedRate.amount,
    });
  } catch (error) {
    console.error('generateShippingLabel error:', error);

    return Response.json(
      {
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});