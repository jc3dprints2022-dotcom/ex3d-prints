import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Cart Abandonment Email Trigger ===');

    const BASE44_SUPABASE_URL = Deno.env.get('BASE44_SUPABASE_URL');
    const BASE44_SUPABASE_SERVICE_KEY = Deno.env.get('BASE44_SUPABASE_SERVICE_KEY');

    if (!BASE44_SUPABASE_URL || !BASE44_SUPABASE_SERVICE_KEY) {
        console.error('Missing Base44 configuration');
        return Response.json({ error: 'Server configuration error', emails_sent: 0 }, { status: 500 });
    }

    try {
        const base44 = createClient({
            supabaseUrl: BASE44_SUPABASE_URL,
            supabaseKey: BASE44_SUPABASE_SERVICE_KEY
        });

        const campaigns = await base44.entities.EmailCampaign.filter({
            trigger_type: 'cart_abandoned',
            is_active: true
        });

        if (campaigns.length === 0) {
            console.log('No active cart abandonment campaigns');
            return Response.json({ message: 'No active cart abandonment campaigns', emails_sent: 0 });
        }

        const allCarts = await base44.entities.Cart.list();
        const users = await base44.entities.User.list();
        const products = await base44.entities.Product.list();
        const emailLogs = await base44.entities.EmailCampaignLog.list();

        let totalEmailsSent = 0;

        for (const campaign of campaigns) {
            console.log(`Processing campaign: ${campaign.name}`);
            const hoursThreshold = parseInt(campaign.trigger_condition?.hours) || 24;
            const thresholdTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

            const cartsByUser = {};
            allCarts.forEach(cart => {
                if (!cartsByUser[cart.user_id]) {
                    cartsByUser[cart.user_id] = [];
                }
                cartsByUser[cart.user_id].push(cart);
            });

            for (const [userId, userCarts] of Object.entries(cartsByUser)) {
                const user = users.find(u => u.id === userId);
                if (!user || !user.email) {
                    console.log(`Skipping user ${userId} - no email found`);
                    continue;
                }

                const hasAbandonedCart = userCarts.some(cart => 
                    new Date(cart.created_date) < thresholdTime
                );

                if (!hasAbandonedCart) {
                    console.log(`User ${user.email} - cart not old enough`);
                    continue;
                }

                const alreadySent = emailLogs.some(log => 
                    log.campaign_id === campaign.id && 
                    log.user_id === userId &&
                    new Date(log.sent_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                );

                if (alreadySent) {
                    console.log(`User ${user.email} - already received email in last 7 days`);
                    continue;
                }

                let emailBody = campaign.email_body
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString());

                const productIds = [];
                
                if (campaign.include_dynamic_content && campaign.dynamic_content_type === 'cart_items') {
                    const contentHeader = 'Items Still in Your Cart';
                    emailBody += `\n\n<div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">`;
                    emailBody += `<h3 style="color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${contentHeader}</h3>\n`;
                    emailBody += '<div style="display: grid; grid-template-columns: repeat(2, 1fr);; gap: 16px; max-width: 600px;">';

                    for (const cart of userCarts.slice(0, 4)) {
                        const product = products.find(p => p.id === cart.product_id);
                        if (product) {
                            productIds.push(product.id);
                            emailBody += `
                                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />` : ''}
                                    <h4 style="margin: 6px 0; font-size: 14px; color: #111827; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.name}</h4>
                                    <p style="font-size: 16px; font-weight: bold; color: #14b8a6; margin: 6px 0;">$${cart.unit_price.toFixed(2)}</p>
                                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/ProductDetail?id=${product.id}" style="display: block; background: #14b8a6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; margin-top: 8px; font-size: 12px; font-weight: 600; text-align: center;">View Item</a>
                                </div>
                            `;
                        }
                    }
                    emailBody += '</div></div>';
                }

                const emailSubject = campaign.email_subject
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString());

                try {
                    await base44.integrations.Core.SendEmail({
                        to: user.email,
                        subject: emailSubject,
                        body: emailBody
                    });

                    console.log(`✅ Sent cart abandonment email to ${user.email}`);

                    await base44.entities.EmailCampaignLog.create({
                        campaign_id: campaign.id,
                        user_id: userId,
                        sent_at: new Date().toISOString(),
                        status: 'sent',
                        dynamic_content_included: productIds
                    });

                    totalEmailsSent++;

                    await base44.entities.EmailCampaign.update(campaign.id, {
                        emails_sent: (campaign.emails_sent || 0) + 1,
                        emails_sent_last_24h: ((campaign.emails_sent_last_24h || 0) + 1),
                        last_run: new Date().toISOString()
                    });
                } catch (emailError) {
                    console.error(`Error sending email to ${user.email}:`, emailError);
                }
            }
        }

        console.log(`✅ Cart abandonment emails sent: ${totalEmailsSent}`);
        return Response.json({ 
            success: true, 
            emails_sent: totalEmailsSent,
            message: `Successfully sent ${totalEmailsSent} cart abandonment emails`
        });

    } catch (error) {
        console.error('❌ Cart abandonment email error:', error);
        return Response.json({ 
            error: error.message,
            emails_sent: 0
        }, { status: 500 });
    }
});