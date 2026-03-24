import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const STRIPE_PUBLISHABLE_KEY = Deno.env.get('Stripe_Publishable_Key');
        
        if (!STRIPE_PUBLISHABLE_KEY) {
            return Response.json({ 
                error: 'Stripe not configured on server' 
            }, { status: 500 });
        }

        return Response.json({ 
            publishableKey: STRIPE_PUBLISHABLE_KEY 
        });

    } catch (error) {
        console.error('Error getting publishable key:', error);
        return Response.json({ 
            error: error.message || 'Failed to get publishable key' 
        }, { status: 500 });
    }
});