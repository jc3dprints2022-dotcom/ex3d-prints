import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Called directly by OrderRoutingSection with explicit params
    const { orderId, makerEmail, makerName, makerId } = payload;

    // Also handle entity automation payload (when called as webhook)
    const order = payload.data;
    const oldOrder = payload.old_data;

    if (orderId && makerEmail) {
      // Direct call: notify the NEW maker about their reassigned order
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: makerEmail,
        subject: `📦 New Order Assigned to You — #${orderId?.slice(-8)}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">New Order Assigned</h2>
<p>Hi ${makerName || 'Maker'},</p>
<p>An order (<strong>#${orderId?.slice(-8)}</strong>) has been assigned to you. Please log in to your Maker Hub to review and accept it.</p>
<div style="text-align:center;margin:24px 0;">
  <a href="https://ex3dprints.com/ConsumerDashboard?tab=maker" style="background:#f97316;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">View Order in Maker Hub →</a>
</div>
<p>— The EX3D Team</p>
</div>`,
      }).catch(() => {});

      // Notify old maker if this was a reassignment
      if (oldOrder?.maker_id && oldOrder.maker_id !== makerId) {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const oldMaker = allUsers.find(u => u.maker_id === oldOrder.maker_id);
        if (oldMaker?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: oldMaker.email,
            subject: `Order #${orderId?.slice(-8)} Reassigned`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2>Order Reassigned</h2>
<p>Hi ${oldMaker.full_name},</p>
<p>Order <strong>#${orderId?.slice(-8)}</strong> has been reassigned to another maker. You no longer need to fulfill this order.</p>
<p>— The EX3D Team</p>
</div>`,
          }).catch(() => {});
        }
      }

      return Response.json({ ok: true });
    }

    // Entity automation path: only notify if maker changed
    if (order && oldOrder) {
      const oldMakerId = oldOrder?.maker_id;
      const newMakerId = order?.maker_id;
      if (oldMakerId && oldMakerId !== newMakerId) {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const oldMaker = allUsers.find(u => u.maker_id === oldMakerId);
        const entityOrderId = order?.id || payload?.event?.entity_id;
        if (oldMaker?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: oldMaker.email,
            subject: `Order #${entityOrderId?.slice(-8)} Reassigned`,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2>Order Reassigned</h2>
<p>Hi ${oldMaker.full_name},</p>
<p>Order <strong>#${entityOrderId?.slice(-8)}</strong> has been reassigned to another maker. You no longer need to fulfill this order.</p>
<p>— The EX3D Team</p>
</div>`,
          }).catch(() => {});
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('notifyMakerOrderAssigned error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});