import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Inactive Users Email Trigger ===');

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
            trigger_type: 'inactive_days',
            is_active: true
        });

        if (campaigns.length === 0) {
            console.log('No active inactive user campaigns');
            return Response.json({ message: 'No active inactive user campaigns', emails_sent: 0 });
        }

        const users = await base44.entities.User.list();
        const products = await base44.entities.Product.filter({ status: 'active' });
        const allCarts = await base44.entities.Cart.list();
        const emailLogs = await base44.entities.EmailCampaignLog.list();

        let totalEmailsSent = 0;

        for (const campaign of campaigns) {
            console.log(`Processing campaign: ${campaign.name}`);
            const daysThreshold = parseInt(campaign.trigger_condition?.days) || 3;
            const thresholdTime = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

            const inactiveUsers = users.filter(user => {
                if (!user.email) return false;
                
                const userCreated = new Date(user.created_date);
                if (userCreated > thresholdTime) return false;

                const lastActivity = new Date(user.updated_date || user.created_date);
                return lastActivity < thresholdTime;
            });

            console.log(`Found ${inactiveUsers.length} inactive users`);

            for (const user of inactiveUsers) {
                const alreadySent = emailLogs.some(log => 
                    log.campaign_id === campaign.id && 
                    log.user_id === user.id &&
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
                if (campaign.include_dynamic_content) {
                    let contentHeader = 'Check Out What\'s New';
                    let productsToShow = [];

                    if (campaign.dynamic_content_type === 'recently_viewed' && user.recently_viewed && user.recently_viewed.length > 0) {
                        contentHeader = 'Your Recently Viewed Items';
                        productsToShow = user.recently_viewed
                            .slice(0, 2)
                            .map(pid => products.find(p => p.id === pid))
                            .filter(p => p);
                    } else if (campaign.dynamic_content_type === 'cart_items') {
                        contentHeader = 'Items Still in Your Cart';
                        const userCarts = allCarts.filter(cart => cart.user_id === user.id);
                        productsToShow = userCarts
                            .slice(0, 2)
                            .map(cart => products.find(p => p.id === cart.product_id))
                            .filter(p => p);
                    } else if (campaign.dynamic_content_type === 'wishlist_items' && user.wishlist && user.wishlist.length > 0) {
                        contentHeader = 'Items on Your Wishlist';
                        productsToShow = user.wishlist
                            .slice(0, 2)
                            .map(pid => products.find(p => p.id === pid))
                            .filter(p => p);
                    } else if (campaign.dynamic_content_type === 'popular_products') {
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
                    }

                    if (productsToShow.length === 0) {
                        productsToShow = products
                            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                            .slice(0, 2);
                    }

                    if (productsToShow.length > 0) {
                        emailBody += `\n\n<div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">`;
                        emailBody += `<h3 style="color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${contentHeader}</h3>\n`;
                        
                        emailBody += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 600px;">';
                        productsToShow.forEach(product => {
                            productIds.push(product.id);
                            emailBody += `
                                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />` : ''}
                                    <h4 style="margin: 6px 0; font-size: 14px; color: #111827; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.name}</h4>
                                    <p style="font-size: 16px; font-weight: bold; color: #14b8a6; margin: 6px 0;">$${product.price.toFixed(2)}</p>
                                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/ProductDetail?id=${product.id}" style="display: block; background: #14b8a6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; margin-top: 8px; font-size: 12px; font-weight: 600; text-align: center;">Shop Now</a>
                                </div>
                            `;
                        });
                        emailBody += '</div>';
                        
                        emailBody += '</div>';
                    }
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

                    console.log(`✅ Sent inactive user email to ${user.email}`);

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

        console.log(`✅ Inactive user emails sent: ${totalEmailsSent}`);
        return Response.json({ 
            success: true, 
            emails_sent: totalEmailsSent,
            message: `Successfully sent ${totalEmailsSent} inactive user emails`
        });

    } catch (error) {
        console.error('❌ Inactive users email error:', error);
        return Response.json({ 
            error: error.message,
            emails_sent: 0
        }, { status: 500 });
    }
});