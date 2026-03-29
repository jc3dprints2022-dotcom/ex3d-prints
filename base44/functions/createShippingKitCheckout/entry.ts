import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'));
        const APP_URL = Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com';

        const kitPrice = 2000; // $20.00 in cents

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'EX3D Prints Shipping Kit',
                            description: '5 Large Boxes, 5 Small Boxes, Packing Paper, Labels, EX3D Stickers & Packing Tape',
                        },
                        unit_amount: kitPrice
                    },
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: `${APP_URL}/ConsumerDashboard?tab=maker&kit_payment=success`,
            cancel_url: `${APP_URL}/ConsumerDashboard?tab=maker`,
            metadata: {
                user_id: user.id,
                payment_type: 'shipping_kit',
                kit_cost: kitPrice
            }
        });

        return Response.json({ 
            success: true,
            checkout_url: session.url
        });

    } catch (error) {
        console.error('Create shipping kit checkout error:', error);
        return Response.json({ 
            error: error.message || 'Failed to create checkout session' 
        }, { status: 500 });
    }
});