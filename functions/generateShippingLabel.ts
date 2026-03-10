import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const USPS_TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token';
const USPS_LABELS_URL = 'https://apis.usps.com/labels/v3/label';

async function getUSPSToken(clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'labels'
  });

  const res = await fetch(USPS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`USPS auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

function gramsToOz(grams) {
  // 1 gram = 0.035274 oz, minimum 1 oz
  return Math.max(1, Math.round(grams * 0.035274 * 10) / 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Local delivery orders don't need labels
    if (order.is_local_delivery) {
      return Response.json({
        success: true,
        message: 'Local delivery — no shipping label needed',
        is_local_delivery: true
      });
    }

    if (!order.shipping_address?.street) {
      return Response.json({ error: 'Order has no shipping address — cannot generate label' }, { status: 400 });
    }

    const clientId = Deno.env.get('USPS_CLIENT_ID');
    const clientSecret = Deno.env.get('USPS_CLIENT_SECRET');
    const paymentToken = Deno.env.get('USPS_PAYMENT_AUTH_TOKEN');

    if (!clientId || !clientSecret || !paymentToken) {
      return Response.json({ error: 'USPS credentials not fully configured (need USPS_CLIENT_ID, USPS_CLIENT_SECRET, USPS_PAYMENT_AUTH_TOKEN)' }, { status: 500 });
    }

    // Get maker's address as the "from" address
    let fromAddr = { street: '1 N GURLEY ST', city: 'PRESCOTT', state: 'AZ', zip: '86301' };
    if (order.maker_id) {
      try {
        const makers = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
        if (makers.length > 0 && makers[0].address?.street) {
          fromAddr = makers[0].address;
        }
      } catch (e) {
        console.error('Could not get maker address, using default:', e.message);
      }
    }

    // Calculate total package weight from items (default 50g per item if unknown)
    const totalGrams = order.items.reduce((sum, item) => {
      return sum + ((item.weight_grams || 50) * (item.quantity || 1));
    }, 0);
    const weightOz = gramsToOz(totalGrams);

    // Priority orders use Priority Mail, standard use Ground Advantage
    const mailClass = order.is_priority ? 'PRIORITY_MAIL' : 'USPS_GROUND_ADVANTAGE';

    const today = new Date().toISOString().split('T')[0];

    const labelRequest = {
      toAddress: {
        streetAddress: order.shipping_address.street,
        city: order.shipping_address.city,
        state: order.shipping_address.state,
        ZIPCode: (order.shipping_address.zip || '').replace(/-.*/,'').slice(0, 5),
      },
      fromAddress: {
        streetAddress: fromAddr.street,
        city: fromAddr.city,
        state: fromAddr.state,
        ZIPCode: (fromAddr.zip || '').replace(/-.*/,'').slice(0, 5),
      },
      packageDescription: {
        weightUOM: 'oz',
        weight: weightOz,
        mailingDate: today,
        mailClass,
        rateIndicator: 'DR',
        processingCategory: 'MACHINABLE',
        destinationEntryFacilityType: 'NONE'
      },
      imageInfo: {
        imageType: 'PDF',
        labelType: 'SHIPPING_LABEL'
      }
    };

    console.log('Generating USPS label for order:', orderId, JSON.stringify(labelRequest));

    const token = await getUSPSToken(clientId, clientSecret);

    const labelResponse = await fetch(USPS_LABELS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Payment-Authorization-Token': paymentToken,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.usps.labels+json'
      },
      body: JSON.stringify(labelRequest)
    });

    if (!labelResponse.ok) {
      const errText = await labelResponse.text();
      console.error('USPS label generation failed:', errText);
      return Response.json({
        error: 'USPS label generation failed',
        details: errText
      }, { status: 500 });
    }

    const labelData = await labelResponse.json();
    console.log('USPS label response received. Keys:', Object.keys(labelData));

    const trackingNumber = labelData?.labelMetadata?.trackingNumber
      || labelData?.trackingNumber
      || null;

    const postage = labelData?.labelMetadata?.postage || null;

    // Upload label PDF to storage if base64 image is returned
    let labelUrl = null;
    const labelImageBase64 = labelData?.labelImage || labelData?.labelMetadata?.labelImage;

    if (labelImageBase64) {
      try {
        const binaryString = atob(labelImageBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfFile = new File([bytes], `label_${orderId}.pdf`, { type: 'application/pdf' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
        labelUrl = file_url;
        console.log('Label PDF uploaded:', labelUrl);
      } catch (uploadErr) {
        console.error('Failed to upload label PDF:', uploadErr.message);
      }
    }

    // Update order with tracking number, label URL, and postage cost
    await base44.asServiceRole.entities.Order.update(orderId, {
      tracking_number: trackingNumber,
      shipping_label_url: labelUrl,
      shipping_cost: postage
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'shipping_label_purchase',
      user_id: user.id,
      file_id: orderId,
      details: { orderId, trackingNumber, mailClass, weightOz, postage },
      severity: 'info'
    });

    return Response.json({
      success: true,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      mail_class: mailClass,
      weight_oz: weightOz,
      postage
    });

  } catch (error) {
    console.error('generateShippingLabel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});