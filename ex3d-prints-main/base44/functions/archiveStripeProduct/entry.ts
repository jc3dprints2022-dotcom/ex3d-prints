import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin-only function
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { stripeProductId, archive } = await req.json();
        
        if (!stripeProductId) {
            return Response.json({ error: 'Stripe product ID required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Archive or unarchive Stripe product
        const product = await stripe.products.update(stripeProductId, {
            active: !archive
        });

        console.log(`✅ ${archive ? 'Archived' : 'Unarchived'} Stripe product:`, stripeProductId);

        return Response.json({ 
            success: true,
            product: product
        });

    } catch (error) {
        console.error('Stripe product archive error:', error);
        return Response.json({ 
            error: 'Failed to archive/unarchive Stripe product',
            details: error.message 
        }, { status: 500 });
    }
});