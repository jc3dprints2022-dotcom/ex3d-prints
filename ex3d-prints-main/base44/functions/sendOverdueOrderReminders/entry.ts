import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sends reminder emails to makers with orders that haven't been completed 48+ hours after acceptance.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const allOrders = await base44.asServiceRole.entities.Order.list();
        const now = new Date();
        const cutoffMs = 48 * 60 * 60 * 1000; // 48 hours

        const overdueOrders = allOrders.filter(o => {
            if (!['accepted', 'printing'].includes(o.status)) return false;
            if (!o.maker_id) return false;
            const created = new Date(o.created_date);
            return (now - created) >= cutoffMs;
        });

        if (overdueOrders.length === 0) {
            return Response.json({ sent: 0, message: 'No overdue orders found' });
        }

        // Group by maker_id to avoid spamming the same maker
        const byMaker = {};
        overdueOrders.forEach(o => {
            if (!byMaker[o.maker_id]) byMaker[o.maker_id] = [];
            byMaker[o.maker_id].push(o);
        });

        let emailsSent = 0;

        for (const [makerId, orders] of Object.entries(byMaker)) {
            // Find maker user
            const users = await base44.asServiceRole.entities.User.filter({ maker_id: makerId });
            const maker = users[0];
            if (!maker || !maker.email) continue;

            const orderList = orders.map(o => {
                const itemNames = (o.items || []).map(i => `${i.product_name} (×${i.quantity})`).join(', ');
                const hoursOld = Math.round((now - new Date(o.created_date)) / (1000 * 60 * 60));
                return `• Order #${o.id.slice(-8)} — ${itemNames} — ${hoursOld} hours old`;
            }).join('\n');

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: maker.email,
                subject: 'Reminder: You have an order that needs attention — EX3D Prints',
                body: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#f97316;">Order Reminder</h2>
  <p>Hi ${maker.full_name || 'Maker'},</p>
  <p>This is a friendly reminder that you have ${orders.length > 1 ? 'orders that are' : 'an order that is'} awaiting completion on EX3D Prints.</p>
  <div style="background:#fff7ed;border-left:4px solid #f97316;padding:15px;margin:20px 0;border-radius:4px;">
    <pre style="margin:0;font-family:inherit;white-space:pre-wrap;">${orderList}</pre>
  </div>
  <p>Please complete ${orders.length > 1 ? 'these orders' : 'this order'} as soon as possible to keep customers happy and maintain your maker rating.</p>
  <p>If you're running into any issues, please reach out to us at <a href="mailto:EX3Dprint@gmail.com">EX3Dprint@gmail.com</a> and we'll be happy to help.</p>
  <p style="margin-top:20px;color:#666;">— The EX3D Prints Team</p>
</div>
                `.trim()
            });

            emailsSent++;
        }

        return Response.json({ sent: emailsSent, overdue: overdueOrders.length });
    } catch (error) {
        console.error('sendOverdueOrderReminders error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});