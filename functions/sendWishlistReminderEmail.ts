import { createClient } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== Wishlist Reminder Email Trigger ===');

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
            trigger_type: 'wishlist_abandoned',
            is_active: true
        });

        if (campaigns.length === 0) {
            console.log('No active wishlist abandonment campaigns');
            return Response.json({ message: 'No active wishlist abandonment campaigns', emails_sent: 0 });
        }

        const users = await base44.entities.User.list();
        const products = await base44.entities.Product.list();
        const emailLogs = await base44.entities.EmailCampaignLog.list();

        let totalEmailsSent = 0;

        for (const campaign of campaigns) {
            console.log(`Processing campaign: ${campaign.name}`);
            const hoursThreshold = parseInt(campaign.trigger_condition?.hours) || 24;
            const thresholdTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

            const usersWithOldWishlists = users.filter(user => {
                if (!user.wishlist || user.wishlist.length === 0) return false;
                if (!user.email) return false;
                
                if (!user.wishlist_last_updated) return true;
                return new Date(user.wishlist_last_updated) < thresholdTime;
            });

            console.log(`Found ${usersWithOldWishlists.length} users with old wishlists`);

            for (const user of usersWithOldWishlists) {
                const alreadySent = emailLogs.some(log => 
                    log.campaign_id === campaign.id && 
                    log.user_id === user.id &&
                    new Date(log.sent_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                );

                if (alreadySent) {
                    console.log(`User ${user.email} - already received email in last 7 days`);
                    continue;
                }

                let bodyContent = campaign.email_body
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString())
                    .replace(/\n/g, '<br>');
                
                let emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="border-bottom: 3px solid #14b8a6; margin-bottom: 20px; padding-bottom: 10px;">
        <h2 style="color: #14b8a6; margin: 0;">EX3D Prints</h2>
    </div>
    <div style="color: #374151; font-size: 16px; line-height: 1.6;">
        ${bodyContent}
    </div>
                `.trim();

                const productIds = [];
                
                if (campaign.include_dynamic_content && campaign.dynamic_content_type === 'wishlist_items') {
                    const contentHeader = 'Items on Your Wishlist';
                    emailBody += `\n\n<div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">`;
                    emailBody += `<h3 style="color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${contentHeader}</h3>\n`;
                    emailBody += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 600px;">';

                    for (const productId of user.wishlist.slice(0, 4)) {
                        const product = products.find(p => p.id === productId);
                        if (product) {
                            productIds.push(product.id);
                            emailBody += `
                                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />` : ''}
                                    <h4 style="margin: 6px 0; font-size: 14px; color: #111827; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.name}</h4>
                                    <p style="font-size: 16px; font-weight: bold; color: #14b8a6; margin: 6px 0;">$${product.price.toFixed(2)}</p>
                                    <a href="${Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com'}/ProductDetail?id=${product.id}" style="display: block; background: #14b8a6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; margin-top: 8px; font-size: 12px; font-weight: 600; text-align: center;">Add to Cart</a>
                                </div>
                            `;
                        }
                    }
                    emailBody += '</div></div>';
                }

                // Close HTML wrapper
                emailBody += `
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            Need help? Contact us at <a href="mailto:ex3dprint.@gmail.com" style="color: #14b8a6; text-decoration: none;">ex3dprint.@gmail.com</a>
        </p>
    </div>
</div>
                `.trim();
                
                const emailSubject = campaign.email_subject
                    .replace(/\{user\.full_name\}/g, user.full_name || 'Valued Customer')
                    .replace(/\{user\.exp_points\}/g, (user.exp_points || 0).toString());

                try {
                    await base44.integrations.Core.SendEmail({
                        to: user.email,
                        subject: emailSubject,
                        body: emailBody
                    });

                    console.log(`✅ Sent wishlist reminder email to ${user.email}`);

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

        console.log(`✅ Wishlist reminder emails sent: ${totalEmailsSent}`);
        return Response.json({ 
            success: true, 
            emails_sent: totalEmailsSent,
            message: `Successfully sent ${totalEmailsSent} wishlist reminder emails`
        });

    } catch (error) {
        console.error('❌ Wishlist reminder email error:', error);
        return Response.json({ 
            error: error.message,
            emails_sent: 0
        }, { status: 500 });
    }
});