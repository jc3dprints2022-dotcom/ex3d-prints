import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productId, boostWeeks } = await req.json();

        if (!productId || !boostWeeks || boostWeeks < 1 || boostWeeks > 4) {
            return Response.json({ error: 'Invalid boost parameters' }, { status: 400 });
        }

        // Get the product to verify ownership
        const product = await base44.entities.Product.get(productId);
        
        if (!product) {
            return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.designer_id !== user.designer_id) {
            return Response.json({ error: 'You can only boost your own products' }, { status: 403 });
        }

        if (product.status !== 'active') {
            return Response.json({ error: 'Only active products can be boosted' }, { status: 400 });
        }

        const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
        if (!STRIPE_SECRET_KEY) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });

        // Calculate boost cost ($5 per week)
        const boostCost = boostWeeks * 5;

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Boost Listing: ${product.name}`,
                            description: `${boostWeeks} week${boostWeeks > 1 ? 's' : ''} of boosted visibility`,
                        },
                        unit_amount: boostCost * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/DesignerDashboard?boost_success=true`,
            cancel_url: `${req.headers.get('origin')}/DesignerDashboard?boost_cancelled=true`,
            metadata: {
                product_id: productId,
                designer_id: user.designer_id,
                designer_user_id: user.id,
                boost_weeks: boostWeeks.toString(),
                boost_type: 'listing_boost'
            }
        });

        return Response.json({ 
            sessionId: session.id,
            url: session.url 
        });

    } catch (error) {
        console.error('Boost checkout error:', error);
        return Response.json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        }, { status: 500 });
    }
});