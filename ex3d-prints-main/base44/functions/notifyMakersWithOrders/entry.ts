import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find all orders that are assigned to a maker and not yet complete/cancelled
    const activeStatuses = ['pending', 'accepted', 'printing', 'done_printing'];
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const assignedOrders = allOrders.filter(o =>
      o.maker_id && activeStatuses.includes(o.status)
    );

    if (assignedOrders.length === 0) {
      return Response.json({ success: true, message: 'No assigned orders found', emailed: 0 });
    }

    // Collect unique maker_ids
    const makerIds = [...new Set(assignedOrders.map(o => o.maker_id).filter(Boolean))];
    console.log(`Found ${makerIds.length} makers with assigned orders`);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const makerUsers = allUsers.filter(u => makerIds.includes(u.maker_id));

    // Deduplicate by email to avoid double-sending
    const emailedIds = new Set();
    let sentCount = 0;

    for (const maker of makerUsers) {
      if (!maker.email || emailedIds.has(maker.email)) continue;
      emailedIds.add(maker.email);

      const makerOrders = assignedOrders.filter(o => o.maker_id === maker.maker_id);
      console.log(`Emailing ${maker.email} — ${makerOrders.length} assigned order(s)`);

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'EX3D Prints',
          to: maker.email,
          subject: 'Orders May Now Be Visible in Your Maker Hub',
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
<p>Hi ${maker.full_name || 'Maker'},</p>
<p>We were having an issue where some assigned orders were not showing correctly in Maker Hub.</p>
<p>This should now be fixed. If you were not seeing orders before, please log in and check your Maker Hub to see whether you currently have any assigned orders waiting for you.</p>
<p style="margin-top:24px;">Thank you for your patience,<br><strong>EX3D Prints</strong></p>
</div>`
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to email ${maker.email}:`, err.message);
      }
    }

    return Response.json({ success: true, emailed: sentCount, makerCount: makerUsers.length });
  } catch (error) {
    console.error('notifyMakersWithOrders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});