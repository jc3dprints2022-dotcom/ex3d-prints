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

        const { stripeProductId, updates } = await req.json();
        
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

        // Update Stripe product
        const product = await stripe.products.update(stripeProductId, updates);

        console.log('✅ Updated Stripe product:', stripeProductId);

        return Response.json({ 
            success: true,
            product: product
        });

    } catch (error) {
        console.error('Stripe product update error:', error);
        return Response.json({ 
            error: 'Failed to update Stripe product',
            details: error.message 
        }, { status: 500 });
    }
});