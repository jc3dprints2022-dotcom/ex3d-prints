import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Order Delivered Email Trigger ===');

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
            trigger_type: 'order_delivered',
            is_active: true
        });

        if (campaigns.length === 0) {
            console.log('No active order delivered campaigns');
            return Response.json({ message: 'No active order delivered campaigns', emails_sent: 0 });
        }

        const orders = await base44.entities.Order.filter({ status: 'delivered' });
        const users = await base44.entities.User.list();
        const products = await base44.entities.Product.list();
        const allLogs = await base44.entities.EmailCampaignLog.list();

        let totalEmailsSent = 0;

        for (const campaign of campaigns) {
            const daysAfterDelivery = campaign.trigger_condition?.days || 1;
            const targetTime = new Date(Date.now() - daysAfterDelivery * 24 * 60 * 60 * 1000);
            const windowStart = new Date(targetTime.getTime() - 12 * 60 * 60 * 1000);

            const eligibleOrders = orders.filter(order => {
                if (!order.picked_up_at) return false;
                
                const deliveredDate = new Date(order.picked_up_at);
                if (deliveredDate > targetTime || deliveredDate < windowStart) return false;

                const alreadySent = allLogs.some(log => 
                    log.campaign_id === campaign.id && 
                    log.user_id === order.customer_id &&
                    log.dynamic_content_included?.includes(order.id)
                );
                
                return !alreadySent;
            });

            for (const order of eligibleOrders) {
                const user = users.find(u => u.id === order.customer_id);
                if (!user || !user.email) {
                    console.log(`Skipping order ${order.id} - no user email found`);
                    continue;
                }

                let emailBody = campaign.email_body
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString())
                    .replace(/\{order\.id\}/g, order.id.slice(-8));

                const productIds = [order.id];
                if (campaign.include_dynamic_content) {
                    let contentHeader = 'You Might Also Like';
                    let productsToShow = [];
                    
                    if (campaign.dynamic_content_type === 'popular_products') {
                        contentHeader = 'Popular Products Right Now';
                        productsToShow = products
                            .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
                            .slice(0, 2);
                    } else if (campaign.dynamic_content_type === 'specific_product' && campaign.specific_product_id) {
                        contentHeader = 'Featured Product for You';
                        const specificProduct = products.find(p => p.id === campaign.specific_product_id);
                        if (specificProduct) {
                            productsToShow = [specificProduct];
                        }
                    } else {
                        productsToShow = products
                            .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
                            .slice(0, 2);
                    }

                    if (productsToShow.length > 0) {
                        emailBody += `\n\n<div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">`;
                        emailBody += `<h3 style="color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${contentHeader}</h3>\n`;
                        
                        if (productsToShow.length === 1) {
                            const product = productsToShow[0];
                            productIds.push(product.id);
                            emailBody += `
                                <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; width: 300px; border-radius: 8px; margin-bottom: 16px;" />` : ''}
                                    <h4 style="margin: 12px 0; font-size: 20px; color: #111827; font-weight: 600;">${product.name}</h4>
                                    <p style="color: #6b7280; font-size: 15px; margin: 12px 0; line-height: 1.5;">${product.description || ''}</p>
                                    <p style="font-size: 24px; font-weight: bold; color: #14b8a6; margin: 12px 0;">$${product.price.toFixed(2)}</p>
                                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/ProductDetail?id=${product.id}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 12px; font-weight: 600;">Shop Now</a>
                                </div>
                            `;
                        } else {
                            emailBody += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 600px;">';
                            productsToShow.forEach(product => {
                                productIds.push(product.id);
                                emailBody += `
                                    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; width: 100%; border-radius: 8px; margin-bottom: 12px;" />` : ''}
                                        <h4 style="margin: 8px 0; font-size: 16px; color: #111827; font-weight: 600;">${product.name}</h4>
                                        <p style="font-size: 20px; font-weight: bold; color: #14b8a6; margin: 8px 0;">$${product.price.toFixed(2)}</p>
                                        <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/ProductDetail?id=${product.id}" style="display: inline-block; background: #14b8a6; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; margin-top: 8px; font-size: 14px; font-weight: 600; width: 100%; text-align: center; box-sizing: border-box;">Shop Now</a>
                                    </div>
                                `;
                            });
                            emailBody += '</div>';
                        }
                        emailBody += '</div>';
                    }
                }

                const emailSubject = campaign.email_subject
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{order\.id\}/g, order.id.slice(-8));

                try {
                    await base44.integrations.Core.SendEmail({
                        to: user.email,
                        subject: emailSubject,
                        body: emailBody
                    });

                    console.log(`✅ Sent order delivered email to ${user.email} for order ${order.id}`);

                    await base44.entities.EmailCampaignLog.create({
                        campaign_id: campaign.id,
                        user_id: user.id,
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

        console.log(`✅ Order delivered emails sent: ${totalEmailsSent}`);
        return Response.json({ 
            success: true, 
            emails_sent: totalEmailsSent,
            message: `Successfully sent ${totalEmailsSent} order delivered emails`
        });

    } catch (error) {
        console.error('❌ Order delivered email error:', error);
        return Response.json({ 
            error: error.message,
            emails_sent: 0
        }, { status: 500 });
    }
});