import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get all pending scheduled emails
        const scheduledEmails = await base44.asServiceRole.entities.ScheduledEmail.filter({
            status: 'pending'
        });

        const now = new Date();
        const emailsToSend = scheduledEmails.filter(email => {
            const scheduledTime = new Date(email.scheduled_for);
            return scheduledTime <= now;
        });

        if (emailsToSend.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'No scheduled emails ready to send',
                emails_sent: 0
            });
        }

        // Get all users
        const allUsers = await base44.asServiceRole.entities.User.list();
        const allProducts = await base44.asServiceRole.entities.Product.filter({ status: 'active' });

        let successCount = 0;
        let failCount = 0;

        for (const scheduledEmail of emailsToSend) {
            try {
                // Get recipient users
                const recipients = allUsers.filter(u => scheduledEmail.recipient_ids.includes(u.id));
                
                for (const recipient of recipients) {
                    try {
                        // Convert newlines to HTML breaks to preserve formatting
                        let finalMessage = scheduledEmail.body.replace(/\n/g, '<br>');

                        // Add product recommendations if user has recently viewed items
                        if (recipient.recently_viewed && recipient.recently_viewed.length > 0) {
                            const recentProducts = recipient.recently_viewed
                                .map(id => allProducts.find(p => p.id === id))
                                .filter(p => p)
                                .slice(0, 3);

                            if (recentProducts.length > 0) {
                                const productsHTML = `
                                    <div style="margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
                                        <h3 style="margin: 0 0 16px 0; color: #111827;">Products You Viewed</h3>
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                                            ${recentProducts.map(p => `
                                                <div style="width: 90px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                                    ${p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.name}" style="width: 100%; height: 70px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;" />` : ''}
                                                    <h4 style="margin: 0 0 3px 0; font-size: 10px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</h4>
                                                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: bold; color: #14b8a6;">$${p.price.toFixed(2)}</p>
                                                    <a href="https://ex3dprints.com/ProductDetail?id=${p.id}" style="display: inline-block; padding: 3px 6px; background: #14b8a6; color: white; text-decoration: none; border-radius: 4px; font-size: 9px; font-weight: 500;">View</a>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                                finalMessage += productsHTML;
                            }
                        }

                        await base44.asServiceRole.integrations.Core.SendEmail({
                            to: recipient.email,
                            subject: scheduledEmail.subject,
                            body: finalMessage,
                            from_name: 'EX3D Prints Admin'
                        });

                        successCount++;
                    } catch (emailError) {
                        console.error(`Failed to send to ${recipient.email}:`, emailError);
                        failCount++;
                    }
                }

                // Mark as sent
                await base44.asServiceRole.entities.ScheduledEmail.update(scheduledEmail.id, {
                    status: 'sent',
                    sent_at: new Date().toISOString()
                });

            } catch (error) {
                console.error(`Failed to process scheduled email ${scheduledEmail.id}:`, error);
                
                // Mark as failed
                await base44.asServiceRole.entities.ScheduledEmail.update(scheduledEmail.id, {
                    status: 'failed',
                    error_message: error.message
                });
                
                failCount++;
            }
        }

        return Response.json({
            success: true,
            emails_sent: successCount,
            failed: failCount,
            processed: emailsToSend.length
        });

    } catch (error) {
        console.error('Scheduled emails error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});