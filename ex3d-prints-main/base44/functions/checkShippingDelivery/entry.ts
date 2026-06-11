import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Checks Shippo tracking for all shipped orders and marks them as delivered if tracking shows delivered.
// Designed to run on a daily schedule via automation.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const SHIPPO_API_KEY = Deno.env.get('SHIPPO_API_KEY');

        if (!SHIPPO_API_KEY) {
            return Response.json({ error: 'SHIPPO_API_KEY not configured' }, { status: 500 });
        }

        // Get all orders that are shipped but not yet delivered
        const shippedOrders = await base44.asServiceRole.entities.Order.filter({ status: 'shipped' });

        // Also check orders with tracking numbers that might have been missed
        const ordersWithTracking = shippedOrders.filter(o => o.tracking_number);

        if (ordersWithTracking.length === 0) {
            console.log('No shipped orders with tracking numbers to check.');
            return Response.json({ success: true, checked: 0, delivered: 0 });
        }

        let delivered = 0;
        const errors = [];

        for (const order of ordersWithTracking) {
            try {
                // Query Shippo tracking API
                const trackingRes = await fetch(
                    `https://api.goshippo.com/tracks/${order.tracking_number}`,
                    {
                        headers: {
                            'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (!trackingRes.ok) {
                    console.warn(`Shippo API error for order ${order.id}: ${trackingRes.status}`);
                    continue;
                }

                const trackingData = await trackingRes.json();
                const trackingStatus = trackingData.tracking_status?.status;

                console.log(`Order ${order.id} (${order.tracking_number}): status = ${trackingStatus}`);

                if (trackingStatus === 'DELIVERED') {
                    const deliveredAt = trackingData.tracking_status?.status_date || new Date().toISOString();

                    await base44.asServiceRole.entities.Order.update(order.id, {
                        status: 'delivered',
                        delivered_at: deliveredAt,
                    });

                    console.log(`✅ Marked order ${order.id} as delivered (${deliveredAt})`);
                    delivered++;

                    // Send delivered email notification to customer
                    const users = await base44.asServiceRole.entities.User.filter({ id: order.customer_id });
                    const customer = users[0];
                    if (customer?.email) {
                        const APP_URL = Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com';
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            from_name: 'EX3D Prints',
                            to: customer.email,
                            subject: '📦 Your order has been delivered!',
                            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="border-bottom: 3px solid #14b8a6; margin-bottom: 20px; padding-bottom: 10px;">
        <h2 style="color: #14b8a6; margin: 0;">EX3D Prints</h2>
    </div>
    <h2 style="color: #111827;">Your order has been delivered! 🎉</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Hi ${customer.full_name || 'there'},<br><br>
        Great news — your order <strong>#${order.id.slice(-8)}</strong> has been delivered!
    </p>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        We hope you love your rocket model. If you have any questions or concerns, please don't hesitate to reach out.
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${APP_URL}/ConsumerDashboard" style="display: inline-block; background: #14b8a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View My Orders</a>
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            The Best Rocket Models You Can Buy · <a href="mailto:ex3dprint@gmail.com" style="color: #14b8a6; text-decoration: none;">ex3dprint@gmail.com</a>
        </p>
    </div>
</div>
                            `.trim()
                        });
                    }
                }
            } catch (orderError) {
                console.error(`Error checking order ${order.id}:`, orderError.message);
                errors.push(order.id);
            }
        }

        console.log(`✅ Checked ${ordersWithTracking.length} orders, marked ${delivered} as delivered.`);
        return Response.json({
            success: true,
            checked: ordersWithTracking.length,
            delivered,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('checkShippingDelivery error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});