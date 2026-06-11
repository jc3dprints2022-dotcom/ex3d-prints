import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    console.log('=== Order Delivered Email Trigger ===');

    try {
        const base44 = createClientFromRequest(req);

        const campaigns = await base44.asServiceRole.entities.EmailCampaign.filter({
            trigger_type: 'order_delivered',
            is_active: true
        }).catch(() => []);

        if (campaigns.length === 0) {
            console.log('No active order delivered campaigns');
            return Response.json({ message: 'No active order delivered campaigns', emails_sent: 0 });
        }

        const [orders, users, products, allLogs] = await Promise.all([
            base44.asServiceRole.entities.Order.filter({ status: 'delivered' }).catch(() => []),
            base44.asServiceRole.entities.User.list().catch(() => []),
            base44.asServiceRole.entities.Product.list().catch(() => []),
            base44.asServiceRole.entities.EmailCampaignLog.list().catch(() => []),
        ]);

        let totalEmailsSent = 0;

        for (const campaign of campaigns) {
            const daysAfterDelivery = campaign.trigger_condition?.days || 1;
            const targetTime = new Date(Date.now() - daysAfterDelivery * 24 * 60 * 60 * 1000);
            const windowStart = new Date(targetTime.getTime() - 12 * 60 * 60 * 1000);

            const eligibleOrders = orders.filter(order => {
                // Local pickups set picked_up_at; shipped orders set delivered_at
                // (via checkShippingDelivery). Use whichever exists so shipped
                // orders also receive the delivered campaign email.
                const deliveredTimestamp = order.picked_up_at || order.delivered_at;
                if (!deliveredTimestamp) return false;
                const deliveredDate = new Date(deliveredTimestamp);
                if (deliveredDate > targetTime || deliveredDate < windowStart) return false;
                return !allLogs.some(log =>
                    log.campaign_id === campaign.id &&
                    log.user_id === order.customer_id &&
                    log.dynamic_content_included?.includes(order.id)
                );
            });

            for (const order of eligibleOrders) {
                const user = users.find(u => u.id === order.customer_id);
                if (!user?.email) continue;

                let bodyContent = (campaign.email_body || '')
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString())
                    .replace(/\{order\.id\}/g, order.id.slice(-8))
                    .replace(/\n/g, '<br>');

                let emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;">
    <div style="border-bottom:3px solid #14b8a6;margin-bottom:20px;padding-bottom:10px;">
        <h2 style="color:#14b8a6;margin:0;">EX3D Prints</h2>
    </div>
    <div style="color:#374151;font-size:16px;line-height:1.6;">${bodyContent}</div>`;

                const productIds = [order.id];

                if (campaign.include_dynamic_content) {
                    let productsToShow = [];
                    if (campaign.dynamic_content_type === 'specific_product' && campaign.specific_product_id) {
                        const p = products.find(p => p.id === campaign.specific_product_id);
                        if (p) productsToShow = [p];
                    } else {
                        productsToShow = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 2);
                    }

                    if (productsToShow.length > 0) {
                        emailBody += `<div style="border-top:2px solid #e5e7eb;margin-top:30px;padding-top:20px;"><h3 style="color:#111827;">You Might Also Like</h3><div style="display:flex;gap:20px;flex-wrap:wrap;">`;
                        productsToShow.forEach(product => {
                            productIds.push(product.id);
                            emailBody += `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;flex:1;min-width:200px;">
                                ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width:100%;border-radius:8px;margin-bottom:12px;" />` : ''}
                                <h4 style="margin:8px 0;color:#111827;">${product.name}</h4>
                                <p style="font-size:20px;font-weight:bold;color:#14b8a6;margin:8px 0;">$${(product.price || 0).toFixed(2)}</p>
                                <a href="https://ex3dprints.com/ProductDetail?id=${product.id}" style="display:inline-block;background:#14b8a6;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:600;">Shop Now</a>
                            </div>`;
                        });
                        emailBody += '</div></div>';
                    }
                }

                emailBody += `<div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:30px;text-align:center;">
        <p style="color:#9ca3af;font-size:14px;">Need help? Contact us at <a href="mailto:jc3dprints2022@gmail.com" style="color:#14b8a6;">jc3dprints2022@gmail.com</a></p>
    </div></div>`;

                const emailSubject = (campaign.email_subject || 'Thanks for your order!')
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{order\.id\}/g, order.id.slice(-8));

                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: user.email,
                        subject: emailSubject,
                        body: emailBody
                    });

                    await base44.asServiceRole.entities.EmailCampaignLog.create({
                        campaign_id: campaign.id,
                        user_id: user.id,
                        sent_at: new Date().toISOString(),
                        status: 'sent',
                        dynamic_content_included: productIds
                    });

                    await base44.asServiceRole.entities.EmailCampaign.update(campaign.id, {
                        emails_sent: (campaign.emails_sent || 0) + 1,
                        last_run: new Date().toISOString()
                    });

                    totalEmailsSent++;
                    console.log(`✅ Sent order delivered email to ${user.email} for order ${order.id}`);
                } catch (emailError) {
                    console.error(`Error sending email to ${user.email}:`, emailError.message);
                }
            }
        }

        return Response.json({ success: true, emails_sent: totalEmailsSent });

    } catch (error) {
        console.error('❌ Order delivered email error:', error.message);
        return Response.json({ error: error.message, emails_sent: 0 }, { status: 500 });
    }
});