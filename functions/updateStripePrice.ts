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

        const { stripePriceId, updates } = await req.json();
        
        if (!stripePriceId) {
            return Response.json({ error: 'Stripe price ID required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Update Stripe price (note: most price fields are immutable)
        const price = await stripe.prices.update(stripePriceId, updates);

        console.log('✅ Updated Stripe price:', stripePriceId);

        return Response.json({ 
            success: true,
            price: price
        });

    } catch (error) {
        console.error('Stripe price update error:', error);
        return Response.json({ 
            error: 'Failed to update Stripe price',
            details: error.message 
        }, { status: 500 });
    }
});