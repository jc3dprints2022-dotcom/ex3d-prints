import { createClient } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    console.log('=== Stripe Webhook Received ===');
    
    const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const APP_ID = Deno.env.get('BASE44_APP_ID');

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error('Missing Stripe configuration');
        return new Response('Server configuration error', { status: 500 });
    }

    if (!APP_ID) {
        console.error('Missing BASE44_APP_ID');
        return new Response('Server configuration error', { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
        console.error('Missing stripe-signature header');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let event;
    let body;
    
    try {
        body = await req.text();
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(JSON.stringify({ error: `Webhook signature failed: ${err.message}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Initialize Base44 SDK using app ID (service role, no user context needed for webhooks)
    const base44 = createClient({ appId: APP_ID });

    console.log('Webhook event received:', event.type);

    try {
        // Handle maker subscription events
        if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            console.log('Processing subscription event:', subscription.id);

            const userId = subscription.metadata?.user_id;
            const planId = subscription.metadata?.plan_id;
            const billingCycle = subscription.metadata?.billing_cycle;

            if (userId && planId && subscription.status === 'active') {
                try {
                    await base44.asServiceRole.entities.User.update(userId, {
                        subscription_plan: planId,
                        subscription_billing_cycle: billingCycle,
                        subscription_status: 'active',
                        stripe_subscription_id: subscription.id,
                        subscription_started_at: new Date().toISOString()
                    });
                    console.log(`Activated subscription for user ${userId}: ${planId} (${billingCycle})`);
                } catch (error) {
                    console.error('Failed to update subscription:', error);
                }
            }

            return Response.json({ success: true });
        }

        // Handle subscription cancellation
        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            console.log('Processing subscription cancellation:', subscription.id);

            const userId = subscription.metadata?.user_id;

            if (userId) {
                try {
                    await base44.asServiceRole.entities.User.update(userId, {
                        subscription_plan: null,
                        subscription_billing_cycle: null,
                        subscription_status: 'cancelled',
                        stripe_subscription_id: null
                    });
                    console.log(`Cancelled subscription for user ${userId}`);
                } catch (error) {
                    console.error('Failed to cancel subscription:', error);
                }
            }

            return Response.json({ success: true });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            console.log('Processing completed checkout session:', session.id);

            // Handle business subscription checkout
            if (session.metadata?.subscription_id) {
                console.log('Processing business subscription payment');
                const subscriptionId = session.metadata.subscription_id;
                
                try {
                    const subRows = await base44.asServiceRole.entities.BusinessSubscription.filter({ id: subscriptionId });
                    const subscription = subRows?.[0];
                    
                    if (subscription) {
                        await base44.asServiceRole.entities.BusinessSubscription.update(subscriptionId, {
                            status: 'active',
                            stripe_subscription_id: session.subscription
                        });
                        
                        await base44.asServiceRole.functions.invoke('createBusinessSubscriptionOrders', {
                            subscriptionId: subscriptionId
                        });
                        
                        console.log('Business subscription activated and orders created');
                    }
                    
                    return Response.json({ success: true });
                } catch (error) {
                    console.error('Failed to process business subscription:', error);
                    return Response.json({ error: error.message }, { status: 500 });
                }
            }

            // Handle filament reward payment
            if (session.metadata?.payment_type === 'filament_reward') {
                console.log('Processing filament reward payment');
                
                const rewardId = session.metadata?.reward_id;
                const rewardName = session.metadata?.reward_name;
                const userId = session.metadata?.user_id;
                const shippingAddress = JSON.parse(session.metadata?.shipping_address || '{}');
                
                if (!rewardId || !userId) {
                    console.error('Missing filament reward metadata');
                    return Response.json({ error: 'Missing filament reward metadata' }, { status: 400 });
                }

                try {
                    const redemption = await base44.asServiceRole.entities.ExpRedemption.create({
                        user_id: userId,
                        reward_id: rewardId,
                        reward_name: rewardName,
                        exp_cost: 0,
                        payment_type: 'money',
                        status: 'pending'
                    });

                    const rewardRows = await base44.asServiceRole.entities.ExpReward.filter({ id: rewardId });
                    const reward = rewardRows?.[0];
                    if (reward && reward.stock_quantity !== undefined) {
                        await base44.asServiceRole.entities.ExpReward.update(rewardId, {
                            stock_quantity: reward.stock_quantity - 1
                        });
                    }

                    const userRows = await base44.asServiceRole.entities.User.filter({ id: userId });
                    const user = userRows?.[0];

                    const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #14b8a6;">New Filament Reward Order</h1>
    <p><strong>Order ID:</strong> ${redemption.id}</p>
    <p><strong>Reward:</strong> ${rewardName}</p>
    <p><strong>Payment Method:</strong> Card Payment (Stripe)</p>
    <p><strong>Amount Paid:</strong> $${(session.amount_total / 100).toFixed(2)}</p>
    <h2 style="color: #111827; margin-top: 30px;">Customer Information</h2>
    <p><strong>Name:</strong> ${user?.full_name || 'Unknown'}</p>
    <p><strong>Email:</strong> ${user?.email || 'Unknown'}</p>
    <h2 style="color: #111827; margin-top: 30px;">Shipping Address</h2>
    <p>${shippingAddress.name || user?.full_name || 'Unknown'}<br>
    ${shippingAddress.street || 'N/A'}<br>
    ${shippingAddress.city || 'N/A'}, ${shippingAddress.state || 'N/A'} ${shippingAddress.zip || 'N/A'}</p>
</div>`;

                    await base44.asServiceRole.integrations.Core.SendEmail({
                        from_name: 'EX3D Prints',
                        to: 'jc3dprints2022@gmail.com',
                        subject: `New Filament Order - ${rewardName} (Card Payment)`,
                        body: emailBody
                    });

                    console.log('Filament reward order processed and email sent');
                    return Response.json({ success: true });
                } catch (error) {
                    console.error('Failed to process filament reward:', error);
                    return Response.json({ error: 'Failed to process filament reward' }, { status: 500 });
                }
            }

            // Handle shipping kit payment
            if (session.metadata?.payment_type === 'shipping_kit') {
                console.log('Processing shipping kit payment');
                const userId = session.metadata?.user_id;
                const kitCost = session.amount_total || 2000;

                if (!userId) {
                    console.error('Missing user_id in shipping kit metadata');
                    return Response.json({ error: 'Missing user_id' }, { status: 400 });
                }

                try {
                    await base44.asServiceRole.entities.ShippingKitOrder.create({
                        user_id: userId,
                        cost: kitCost,
                        status: 'pending',
                        kit_contents: ['packing_tape', 'boxes', 'packing_paper']
                    });

                    const makerUserRows = await base44.asServiceRole.entities.User.filter({ id: userId });
                    const makerUser = makerUserRows?.[0];
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        from_name: 'EX3D Prints',
                        to: 'jc3dprints2022@gmail.com',
                        subject: `New Shipping Kit Order - ${makerUser?.full_name || userId}`,
                        body: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2>New Shipping Kit Order</h2><p><strong>Maker:</strong> ${makerUser?.full_name || 'Unknown'}</p><p><strong>Email:</strong> ${makerUser?.email || 'N/A'}</p><p><strong>Amount Paid:</strong> $${(kitCost / 100).toFixed(2)}</p><p>Please fulfill this order from the Command Center.</p></div>`
                    }).catch(() => {});

                    console.log('Shipping kit order created for user', userId);
                    return Response.json({ success: true });
                } catch (error) {
                    console.error('Failed to create shipping kit order:', error);
                    return Response.json({ error: error.message }, { status: 500 });
                }
            }

            // Handle listing boost payment
            if (session.metadata?.boost_type === 'listing_boost') {
                console.log('Processing listing boost payment');
                
                const productId = session.metadata?.product_id;
                const boostWeeks = parseInt(session.metadata?.boost_weeks || '0');
                const designerUserId = session.metadata?.designer_user_id;
                
                if (!productId || !boostWeeks || !designerUserId) {
                    console.error('Missing boost metadata');
                    return Response.json({ error: 'Missing boost metadata' }, { status: 400 });
                }

                try {
                    const now = new Date();
                    const endDate = new Date();
                    endDate.setDate(now.getDate() + (boostWeeks * 7));
                    
                    await base44.asServiceRole.entities.Product.update(productId, {
                        is_boosted: true,
                        boost_start_date: now.toISOString(),
                        boost_end_date: endDate.toISOString(),
                        boost_duration_weeks: boostWeeks
                    });

                    const designerRows = await base44.asServiceRole.entities.User.filter({ id: designerUserId });
                    const designer = designerRows?.[0];
                    const productRows = await base44.asServiceRole.entities.Product.filter({ id: productId });
                    const product = productRows?.[0];
                    
                    if (designer && product) {
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            to: designer.email,
                            subject: '🚀 Your Listing Boost is Active!',
                            body: `Hi ${designer.full_name},\n\nYour boost for ${product.name} is now live for ${boostWeeks} week(s) until ${endDate.toLocaleDateString()}.\n\nBest regards,\nThe EX3D Team`
                        });
                    }

                    console.log(`Boost activated for product ${productId} for ${boostWeeks} weeks`);
                    return Response.json({ success: true, message: 'Boost activated successfully' });
                } catch (boostError) {
                    console.error('Failed to activate boost:', boostError);
                    return Response.json({ error: 'Failed to activate boost' }, { status: 500 });
                }
            }

            // ── Regular product order ────────────────────────────────────────────
            const customerId = session.metadata?.customer_id || session.metadata?.user_id;
            const sessionId = session.id;
            
            console.log('Processing regular order for session:', sessionId, 'customer:', customerId);

            // Idempotency check — if order already exists for this session, skip
            try {
                const existingOrders = await base44.asServiceRole.entities.Order.filter({
                    stripe_session_id: sessionId
                });
                if (existingOrders.length > 0) {
                    console.log('Order already exists for session (webhook deduplication):', existingOrders[0].id);
                    return Response.json({ success: true, order_id: existingOrders[0].id, message: 'Already processed' });
                }
            } catch (checkErr) {
                console.warn('Could not check for existing orders:', checkErr.message);
            }

            // Invoke verifyPaymentAndCreateOrder to handle the actual order creation
            // Pass session ID and customer ID — the function handles all the logic
            console.log('Invoking verifyPaymentAndCreateOrder from webhook...');
            
            const invokeResult = await base44.asServiceRole.functions.invoke('verifyPaymentAndCreateOrder', {
                sessionId: sessionId,
                customerId: customerId,
                _fromWebhook: true,
            });

            console.log('verifyPaymentAndCreateOrder result:', JSON.stringify(invokeResult).slice(0, 500));

            if (invokeResult?.success || invokeResult?.order_id) {
                console.log('✅ Order created via webhook:', invokeResult.order_id);
                return Response.json({ success: true, order_id: invokeResult.order_id });
            } else if (invokeResult?.message === 'Order already processed') {
                console.log('✅ Order already existed (idempotent):', invokeResult.order_id);
                return Response.json({ success: true, order_id: invokeResult.order_id });
            } else {
                console.error('❌ Order creation failed:', invokeResult);
                return Response.json({ error: 'Order creation failed', details: invokeResult }, { status: 500 });
            }
        }

        // All other event types — acknowledge receipt
        console.log('Acknowledged unhandled event type:', event.type);
        return Response.json({ received: true, event_type: event.type });

    } catch (err) {
        console.error('Webhook processing error:', err.message, err.stack);
        return Response.json({ error: `Webhook processing error: ${err.message}` }, { status: 500 });
    }
});