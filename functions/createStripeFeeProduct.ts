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

        const { name, amount, description } = await req.json();
        
        if (!name || !amount) {
            return Response.json({ error: 'Name and amount required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Create Stripe product for fee
        const product = await stripe.products.create({
            name: name,
            description: description || '',
            default_price_data: {
                unit_amount: Math.round(amount * 100),
                currency: 'usd',
            },
            expand: ['default_price'],
        });

        console.log('✅ Created Stripe fee product:', product.id);

        return Response.json({ 
            success: true,
            product_id: product.id,
            price_id: product.default_price?.id || product.default_price
        });

    } catch (error) {
        console.error('Stripe fee product creation error:', error);
        return Response.json({ 
            error: 'Failed to create fee product',
            details: error.message 
        }, { status: 500 });
    }
});