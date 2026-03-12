import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { rewardId, shippingAddress } = await req.json();

        if (!rewardId) {
            return Response.json({ error: 'Reward ID is required' }, { status: 400 });
        }

        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
            return Response.json({ error: 'Complete shipping address is required' }, { status: 400 });
        }

        const reward = await base44.asServiceRole.entities.ExpReward.get(rewardId);

        if (!reward || !reward.is_active) {
            return Response.json({ error: 'Reward not available' }, { status: 400 });
        }

        if (reward.stock_quantity !== undefined && reward.stock_quantity <= 0) {
            return Response.json({ error: 'Reward is out of stock' }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'));
        const APP_URL = Deno.env.get('BASE44_APP_URL') || 'https://ex3dprints.com';

        const itemPrice = 1500; // $15.00
        const shippingCost = itemPrice >= 3500 ? 0 : 500; // Free shipping over $35
        const totalAmount = itemPrice + shippingCost;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: reward.name,
                            description: reward.description,
                            images: reward.image_url ? [reward.image_url] : []
                        },
                        unit_amount: itemPrice
                    },
                    quantity: 1
                },
                ...(shippingCost > 0 ? [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Shipping'
                        },
                        unit_amount: shippingCost
                    },
                    quantity: 1
                }] : [])
            ],
            mode: 'payment',
            success_url: `${APP_URL}/ConsumerDashboard?tab=maker&payment=success`,
            cancel_url: `${APP_URL}/ConsumerDashboard?tab=maker`,
            metadata: {
                user_id: user.id,
                reward_id: rewardId,
                reward_name: reward.name,
                payment_type: 'filament_reward',
                shipping_address: JSON.stringify(shippingAddress)
            }
        });

        return Response.json({ 
            success: true,
            checkout_url: session.url
        });

    } catch (error) {
        console.error('Create filament checkout error:', error);
        return Response.json({ 
            error: error.message || 'Failed to create checkout session' 
        }, { status: 500 });
    }
});