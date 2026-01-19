import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    console.log('=== Running Email Campaigns ===');

    try {
        const base44 = createClientFromRequest(req);

        // Check for active campaigns
        const campaigns = await base44.entities.EmailCampaign.filter({ is_active: true });

        if (campaigns.length === 0) {
            console.log('No active campaigns found');
            return Response.json({ 
                success: true, 
                message: 'No active campaigns to run',
                emails_sent: 0 
            });
        }

        console.log(`Found ${campaigns.length} active campaigns`);

        // Call all email campaign functions
        const functionCalls = [
            base44.functions.invoke('sendCartAbandonmentEmail').catch(err => ({ 
                error: err.message, 
                function: 'Cart Abandonment' 
            })),
            base44.functions.invoke('sendWishlistReminderEmail').catch(err => ({ 
                error: err.message, 
                function: 'Wishlist Reminder' 
            })),
            base44.functions.invoke('sendInactiveUsersEmail').catch(err => ({ 
                error: err.message, 
                function: 'Inactive Users' 
            })),
            base44.functions.invoke('sendOrderDeliveredEmail').catch(err => ({ 
                error: err.message, 
                function: 'Order Delivered' 
            }))
        ];

        const results = await Promise.all(functionCalls);

        // Count successful emails
        let totalSent = 0;
        const errors = [];
        const successResults = [];

        results.forEach((result) => {
            if (result.error) {
                errors.push(result);
                console.error(`❌ ${result.function} failed:`, result.error);
            } else if (result.data?.emails_sent) {
                totalSent += result.data.emails_sent;
                successResults.push({
                    function: result.data.campaign_type || 'Unknown',
                    emails_sent: result.data.emails_sent
                });
                console.log(`✅ ${result.data.campaign_type}: ${result.data.emails_sent} emails sent`);
            }
        });

        console.log(`Total emails sent: ${totalSent}`);

        return Response.json({
            success: true,
            emails_sent: totalSent,
            results: successResults,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email campaign runner error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});