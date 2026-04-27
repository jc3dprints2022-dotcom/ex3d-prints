import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId, trackingNumber, carrier } = await req.json();

    if (!trackingNumber) {
      return Response.json({ error: 'trackingNumber is required' }, { status: 400 });
    }

    const SHIPPO_API_KEY = Deno.env.get('SHIPPO_API_KEY');
    if (!SHIPPO_API_KEY) {
      return Response.json({ error: 'Shippo not configured' }, { status: 500 });
    }

    // Detect carrier from tracking number pattern if not provided
    const detectedCarrier = carrier || detectCarrier(trackingNumber);

    console.log(`Fetching tracking for ${trackingNumber} via ${detectedCarrier}`);

    const res = await fetch(
      `https://api.goshippo.com/tracks/${detectedCarrier}/${trackingNumber}`,
      {
        headers: {
          'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Shippo tracking error:', res.status, err);
      return Response.json({ error: `Shippo returned ${res.status}`, details: err }, { status: 502 });
    }

    const trackData = await res.json();

    // Map Shippo status to friendly label
    const statusMap = {
      UNKNOWN: 'Unknown',
      PRE_TRANSIT: 'Label Created',
      TRANSIT: 'In Transit',
      DELIVERED: 'Delivered',
      RETURNED: 'Returned',
      FAILURE: 'Exception / Issue',
    };

    const latestEvent = trackData.tracking_history?.length
      ? trackData.tracking_history[trackData.tracking_history.length - 1]
      : null;

    const result = {
      status: trackData.tracking_status?.status || 'UNKNOWN',
      status_label: statusMap[trackData.tracking_status?.status] || trackData.tracking_status?.status,
      status_details: trackData.tracking_status?.status_details || '',
      location: trackData.tracking_status?.location?.city
        ? `${trackData.tracking_status.location.city}, ${trackData.tracking_status.location.state || ''}`
        : null,
      eta: trackData.eta || null,
      latest_event_date: trackData.tracking_status?.status_date || null,
      delivered_at: trackData.tracking_status?.status === 'DELIVERED'
        ? trackData.tracking_status.status_date
        : null,
      history: (trackData.tracking_history || []).slice(-5).reverse().map(h => ({
        date: h.status_date,
        status: statusMap[h.status] || h.status,
        details: h.status_details,
        location: h.location?.city
          ? `${h.location.city}, ${h.location.state || ''}`
          : null,
      })),
      carrier: detectedCarrier,
      tracking_number: trackingNumber,
    };

    // Optionally persist delivery status to the order
    if (orderId && result.delivered_at) {
      try {
        await base44.asServiceRole.entities.Order.update(orderId, {
          delivered_at: result.delivered_at,
          status: 'delivered',
        });
        console.log(`Order ${orderId} marked delivered`);
      } catch (e) {
        console.error('Failed to update order delivery status:', e.message);
      }
    }

    return Response.json({ success: true, tracking: result });
  } catch (error) {
    console.error('getShippoTracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectCarrier(trackingNumber) {
  const tn = trackingNumber.toUpperCase().replace(/\s/g, '');
  if (/^1Z/.test(tn)) return 'ups';
  if (/^\d{22}$/.test(tn) || /^9[2345]\d{18,20}$/.test(tn)) return 'usps';
  if (/^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn)) return 'fedex';
  return 'usps'; // default
}