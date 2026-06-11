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

        const { stripeProductId, amount, recurring } = await req.json();
        
        if (!stripeProductId || !amount) {
            return Response.json({ error: 'Product ID and amount required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        const priceData = {
            product: stripeProductId,
            unit_amount: Math.round(amount * 100),
            currency: 'usd',
        };

        if (recurring) {
            priceData.recurring = {
                interval: recurring.interval || 'month',
            };
        }

        // Create Stripe price
        const price = await stripe.prices.create(priceData);

        console.log('✅ Created Stripe price:', price.id);

        return Response.json({ 
            success: true,
            price: price
        });

    } catch (error) {
        console.error('Stripe price creation error:', error);
        return Response.json({ 
            error: 'Failed to create Stripe price',
            details: error.message 
        }, { status: 500 });
    }
});