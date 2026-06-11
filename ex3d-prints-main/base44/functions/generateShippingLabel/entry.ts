import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SHIPPO_BASE = 'https://api.goshippo.com';

const DEFAULT_SENDER = {
  name: 'EX3D Prints',
  company: 'EX3D Prints',
  street1: '3700 Willow Creek Rd',
  city: 'Prescott',
  state: 'AZ',
  zip: '86301',
  country: 'US',
  phone: '6108583200',
  email: 'jc3dprints2022@gmail.com',
};

function getShippoKey() {
  return Deno.env.get('SHIPPO_API_KEY');
}

function cleanString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function gToLb(grams) {
  return Math.max(0.1, Math.round((grams / 453.592) * 100) / 100);
}

function mmToIn(mm) {
  return Math.max(1, parseFloat((Number(mm || 0) / 25.4).toFixed(1)));
}

function buildPhone(value, fallback) {
  return cleanString(value) || cleanString(fallback);
}

function buildEmail(value, fallback) {
  return cleanString(value) || cleanString(fallback);
}

async function shippoPost(path, body, apiKey) {
  console.log(`[Shippo] POST ${path}`, JSON.stringify(body, null, 2));

  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  console.log(`[Shippo] Response ${path} status=${res.status}`, JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(`Shippo ${path} failed [${res.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

Deno.serve(async (req) => {
  console.log('[generateShippingLabel] Function called');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.log('[generateShippingLabel] Unauthorized — no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await req.json().catch(() => null);
    console.log('[generateShippingLabel] Request body:', JSON.stringify(requestBody));
    const orderId = requestBody?.orderId;

    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 });
    }

    const apiKey = getShippoKey();
    if (!apiKey) {
      console.error('[generateShippingLabel] SHIPPO_API_KEY not set!');
      return Response.json({ error: 'Shippo API key not configured — set SHIPPO_API_KEY in environment variables' }, { status: 500 });
    }
    console.log('[generateShippingLabel] API key present, length:', apiKey.length);

    const orderResults = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orderResults?.[0];
    if (!order) {
      console.error('[generateShippingLabel] Order not found:', orderId);
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log('[generateShippingLabel] Order found:', orderId, 'status:', order.status, 'is_local_delivery:', order.is_local_delivery);

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

    // ── Build sender address ──────────────────────────────────────────────────
    let sender = { ...DEFAULT_SENDER };

    if (order.maker_id) {
      try {
        const makers = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
        if (makers.length > 0) {
          const maker = makers[0];
          const makerStreet = cleanString(maker.address?.street);
          const makerCity = cleanString(maker.address?.city);
          const makerState = cleanString(maker.address?.state);
          const makerZip = cleanString(maker.address?.zip);

          // Only override sender if maker has a complete address
          if (makerStreet && makerCity && makerState && makerZip) {
            sender = {
              name: cleanString(maker.full_name) || DEFAULT_SENDER.name,
              company: cleanString(maker.full_name) || DEFAULT_SENDER.company,
              street1: makerStreet,
              city: makerCity,
              state: makerState,
              zip: makerZip,
              country: 'US',
              phone: buildPhone(maker.phone, DEFAULT_SENDER.phone),
              email: buildEmail(maker.email, DEFAULT_SENDER.email),
            };
            console.log('[generateShippingLabel] Using maker sender address:', sender.street1, sender.city, sender.state);
          } else {
            console.log('[generateShippingLabel] Maker address incomplete — falling back to default sender. maker_id:', order.maker_id);
          }
        }
      } catch (e) {
        console.error('[generateShippingLabel] Could not fetch maker, using default sender:', e.message);
      }
    }

    // Ensure phone & email are never empty (Shippo requires them)
    if (!sender.phone) sender.phone = DEFAULT_SENDER.phone;
    if (!sender.email) sender.email = DEFAULT_SENDER.email;

    console.log('[generateShippingLabel] Final sender:', JSON.stringify(sender));

    // ── Build recipient address ───────────────────────────────────────────────
    const recipientSource = order.shipping_address;
    const destCountry = (cleanString(recipientSource.country) || 'US').toUpperCase();

    const recipient = {
      name: cleanString(recipientSource.name) || 'Customer',
      street1: cleanString(recipientSource.street),
      city: cleanString(recipientSource.city),
      country: destCountry,
    };

    // Optional fields — only include if non-empty to avoid Shippo validation errors
    const street2 = cleanString(recipientSource.street2);
    if (street2) recipient.street2 = street2;

    const state = cleanString(recipientSource.state);
    if (state) recipient.state = state;

    const zip = cleanString(recipientSource.zip);
    if (zip) recipient.zip = zip;

    const phone = cleanString(recipientSource.phone);
    if (phone) recipient.phone = phone;

    const recipientEmail = buildEmail(recipientSource.email, null);
    if (recipientEmail) recipient.email = recipientEmail;

    console.log('[generateShippingLabel] Recipient:', JSON.stringify(recipient));

    // ── Parcel dimensions ────────────────────────────────────────────────────
    const orderItems = Array.isArray(order.items) ? order.items : [];

    const totalGrams = orderItems.reduce((sum, item) => {
      return sum + safeNumber(item?.weight_grams, 50) * safeNumber(item?.quantity, 1);
    }, 0);

    const weightLb = gToLb(totalGrams || 50);

    let parcelL = 6, parcelW = 6, parcelH = 4;
    const dims = orderItems.map(item => item?.dimensions).filter(Boolean);
    if (dims.length > 0) {
      parcelL = Math.max(4, ...dims.map(d => mmToIn(d?.length || 150)));
      parcelW = Math.max(4, ...dims.map(d => mmToIn(d?.width || 150)));
      parcelH = Math.max(3, ...dims.map(d => mmToIn(d?.height || 60)));
    }

    console.log(`[generateShippingLabel] Parcel: ${parcelL}"x${parcelW}"x${parcelH}" @ ${weightLb}lb`);

    // ── International customs declaration ────────────────────────────────────
    let customsDeclaration = null;
    const isInternational = destCountry !== 'US';

    if (isInternational) {
      const customsItems = orderItems.map(item => ({
        description: (item.product_name || '3D Printed Plastic Model').slice(0, 100),
        quantity: String(safeNumber(item.quantity, 1)),
        net_weight: String(Math.max(0.01, (safeNumber(item.weight_grams, 50)) / 453.592).toFixed(3)),
        mass_unit: 'lb',
        value_amount: String(Math.max(5, safeNumber(item.unit_price, 5) * safeNumber(item.quantity, 1)).toFixed(2)),
        value_currency: 'USD',
        origin_country: 'US',
        tariff_number: '9503.00',
      }));

      if (customsItems.length === 0) {
        customsItems.push({
          description: '3D Printed Plastic Model',
          quantity: '1',
          net_weight: String(weightLb.toFixed(3)),
          mass_unit: 'lb',
          value_amount: String(Math.max(5, safeNumber(order.total_amount, 10)).toFixed(2)),
          value_currency: 'USD',
          origin_country: 'US',
          tariff_number: '9503.00',
        });
      }

      const shipmentValue = customsItems.reduce((s, i) => s + parseFloat(i.value_amount), 0);

      if (shipmentValue >= 2500) {
        console.warn(`[generateShippingLabel] Shipment value $${shipmentValue} >= $2,500 — manual review required`);
        return Response.json({
          error: `Shipment value $${shipmentValue.toFixed(2)} exceeds $2,500 — requires manual processing. Please contact support.`,
          requires_manual_review: true,
        }, { status: 400 });
      }

      // Shippo new API uses underscore enum tokens (not the human-readable string format)
      // NOEEI_30_37_a = commercial goods valued $2,500 or less per Schedule B number
      const eelPfc = 'NOEEI_30_37_a';
      console.log(`[generateShippingLabel] International customs: value=$${shipmentValue}, eel_pfc=${eelPfc}, items=${customsItems.length}`);

      const customsRes = await shippoPost('/customs/declarations/', {
        certify: true,
        certify_signer: sender.name,
        contents_type: 'MERCHANDISE',
        non_delivery_option: 'RETURN',
        eel_pfc: eelPfc,
        items: customsItems,
      }, apiKey);

      if (customsRes?.object_id) {
        customsDeclaration = customsRes.object_id;
        console.log('[generateShippingLabel] Customs declaration created:', customsDeclaration);
      } else {
        // Never proceed with an international label without a customs declaration —
        // the transaction would fail downstream with an opaque error.
        console.error('[generateShippingLabel] Customs declaration returned no object_id:', JSON.stringify(customsRes));
        return Response.json({
          error: 'Could not create customs declaration for this international shipment. Please verify the destination address and item details, then try again.',
          customs_response: customsRes || null,
        }, { status: 400 });
      }

      // Many international carriers require a recipient phone — fall back to sender's
      if (!recipient.phone) recipient.phone = sender.phone;
    }

    // ── Create shipment ───────────────────────────────────────────────────────
    const shipmentPayload = {
      address_from: sender,
      address_to: recipient,
      address_return: sender,
      parcels: [{
        length: String(parcelL),
        width: String(parcelW),
        height: String(parcelH),
        distance_unit: 'in',
        weight: String(weightLb),
        mass_unit: 'lb',
      }],
      ...(customsDeclaration ? { customs_declaration: customsDeclaration } : {}),
      async: false,
    };

    const shipment = await shippoPost('/shipments/', shipmentPayload, apiKey);

    if (!shipment.rates || shipment.rates.length === 0) {
      return Response.json({
        error: 'No shipping rates available for this address. Check that the address is complete and correct.',
        shipment_messages: shipment.messages || [],
        address_to_seen_by_shippo: shipment.address_to || null,
      }, { status: 400 });
    }

    console.log(`[generateShippingLabel] Got ${shipment.rates.length} rates from Shippo`);

    // ── Select best rate ──────────────────────────────────────────────────────
    const uspsRates = shipment.rates.filter(r => r.provider === 'USPS');
    let selectedRate = null;

    if (order.is_priority && !isInternational) {
      selectedRate =
        uspsRates.find(r => cleanString(r.servicelevel?.token).toLowerCase().includes('priority')) ||
        uspsRates[0] ||
        shipment.rates[0];
    } else if (isInternational) {
      const intlRates = [...shipment.rates].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
      selectedRate = intlRates[0];
    } else {
      const candidates = uspsRates.length > 0 ? uspsRates : shipment.rates;
      selectedRate = [...candidates].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
    }

    if (!selectedRate?.object_id) {
      return Response.json({
        error: 'No valid shipping rate could be selected',
        rates: shipment.rates || [],
      }, { status: 400 });
    }

    console.log(`[generateShippingLabel] Selected rate: ${selectedRate.provider} ${selectedRate.servicelevel?.name} $${selectedRate.amount}`);

    // ── Purchase label ────────────────────────────────────────────────────────
    const transactionPayload = {
      rate: selectedRate.object_id,
      label_file_type: 'PDF',
      async: false,
    };

    const transaction = await shippoPost('/transactions/', transactionPayload, apiKey);

    if (transaction.status !== 'SUCCESS') {
      const errorDetails = Array.isArray(transaction.messages)
        ? transaction.messages.map(m => m.text || m).join('; ')
        : (transaction.status || 'Unknown');
      console.error('[generateShippingLabel] Transaction failed:', JSON.stringify(transaction));
      return Response.json({
        error: `Label purchase failed: ${errorDetails}`,
        transaction_status: transaction.status,
        messages: transaction.messages || [],
      }, { status: 500 });
    }

    console.log('[generateShippingLabel] Label created! Tracking:', transaction.tracking_number);

    // ── Update order record ───────────────────────────────────────────────────
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
        destCountry,
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
    console.error('[generateShippingLabel] Unhandled error:', error?.message || error);
    return Response.json({
      error: error?.message || 'Unknown error generating shipping label',
    }, { status: 500 });
  }
});