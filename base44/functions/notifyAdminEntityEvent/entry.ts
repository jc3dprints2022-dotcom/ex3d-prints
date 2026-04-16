import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, args } = payload;

    const entityName = event?.entity_name || args?.entity_name || 'Unknown';
    let subject = '';
    let body = '';

    if (entityName === 'CalibrationSubmission') {
      subject = `New Calibration Submission from Maker`;
      body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">🔧 New Calibration Submission</h2>
<p>A maker has submitted a calibration approval request.</p>
<p><strong>Maker ID:</strong> ${data?.maker_id || 'N/A'}</p>
<p><strong>Status:</strong> ${data?.status || 'pending'}</p>
<p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
<p style="color:#666;font-size:12px;margin-top:15px;">Review in JC3D Command Center → Maker Tools &amp; Performance</p>
</div>`;
    } else if (entityName === 'ShippingKitOrder') {
      subject = `New Shipping Kit Order`;
      body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">📦 New Shipping Kit Order</h2>
<p>A maker has placed a shipping kit order.</p>
<p><strong>Maker ID:</strong> ${data?.user_id || 'N/A'}</p>
<p><strong>Cost:</strong> $${(data?.cost || 0).toFixed(2)}</p>
<p><strong>Status:</strong> ${data?.status || 'pending'}</p>
${data?.shipping_address ? `<p><strong>Ship To:</strong> ${data.shipping_address.name || ''}, ${data.shipping_address.city || ''}, ${data.shipping_address.state || ''}</p>` : ''}
<p style="color:#666;font-size:12px;margin-top:15px;">Fulfill in JC3D Command Center → Maker Tools &amp; Performance → Shipping Kit Orders</p>
</div>`;
    } else if (entityName === 'Filament') {
      subject = `New Filament Submission`;
      body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#8b5cf6;">🧵 New Filament Submission</h2>
<p><strong>Maker ID:</strong> ${data?.maker_id || 'N/A'}</p>
<p><strong>Material:</strong> ${data?.material_type || 'N/A'}</p>
<p><strong>Color:</strong> ${data?.color || 'N/A'}</p>
<p><strong>Quantity:</strong> ${data?.quantity_kg || 'N/A'} kg</p>
</div>`;
    } else {
      subject = `New ${entityName} Created`;
      body = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">New ${entityName}</h2>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;">${JSON.stringify(data, null, 2)}</pre>
</div>`;
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'jc3dprints2022@gmail.com',
      subject,
      body
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});