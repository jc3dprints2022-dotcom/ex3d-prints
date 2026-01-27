import { createClient } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    console.log('=== Stripe Webhook Received ===');
    
    const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const BASE44_SUPABASE_URL = Deno.env.get('BASE44_SUPABASE_URL');
    const BASE44_SUPABASE_SERVICE_KEY = Deno.env.get('BASE44_SUPABASE_SERVICE_KEY');

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        console.error('Missing Stripe configuration');
        return new Response('Server configuration error', { status: 500 });
    }

    if (!BASE44_SUPABASE_URL || !BASE44_SUPABASE_SERVICE_KEY) {
        console.error('Missing Base44 configuration');
        return new Response('Server configuration error', { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    
    if (!signature || !STRIPE_WEBHOOK_SECRET) {
        console.error('Missing stripe-signature header or STRIPE_WEBHOOK_SECRET');
        return new Response(JSON.stringify({ error: 'Missing signature or webhook secret' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.text();
        
        const base44 = createClient({
            supabaseUrl: BASE44_SUPABASE_URL,
            supabaseKey: BASE44_SUPABASE_SERVICE_KEY
        });

        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );

        console.log('Webhook event received:', event.type);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log('Processing completed checkout session:', session.id);

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
                    // Activate the boost
                    const now = new Date();
                    const endDate = new Date();
                    endDate.setDate(now.getDate() + (boostWeeks * 7));
                    
                    await base44.asServiceRole.entities.Product.update(productId, {
                        is_boosted: true,
                        boost_start_date: now.toISOString(),
                        boost_end_date: endDate.toISOString(),
                        boost_duration_weeks: boostWeeks
                    });

                    console.log(`✅ Boost activated for product ${productId} for ${boostWeeks} weeks`);

                    // Get designer info for email
                    const designer = await base44.asServiceRole.entities.User.get(designerUserId);
                    const product = await base44.asServiceRole.entities.Product.get(productId);
                    
                    if (designer && product) {
                        // Send confirmation email to designer
                        await base44.asServiceRole.integrations.Core.SendEmail({
                            to: designer.email,
                            subject: '🚀 Your Listing Boost is Active!',
                            body: `Hi ${designer.full_name},

Great news! Your boost payment has been processed and your listing is now featured.

Product: ${product.name}
Boost Duration: ${boostWeeks} week${boostWeeks > 1 ? 's' : ''}
Boost Active Until: ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Your listing will now appear at the top of search results and category pages, giving you maximum visibility and increased sales potential.

Track your boosted listing performance in your Designer Dashboard.

Best regards,
The EX3D Team`
                        });
                        
                        console.log('✅ Boost confirmation email sent to designer');
                    }

                    return Response.json({ 
                        success: true,
                        message: 'Boost activated successfully'
                    });
                } catch (boostError) {
                    console.error('❌ Failed to activate boost:', boostError);
                    return Response.json({ error: 'Failed to activate boost' }, { status: 500 });
                }
            }

            const customerId = session.metadata?.customer_id;
            
            if (!customerId) {
                console.error('No customer_id found in session metadata');
                return new Response(JSON.stringify({ error: 'Missing customer_id in session metadata' }), { status: 400 });
            }

            const customer = await base44.asServiceRole.entities.User.get(customerId);
            
            if (!customer) {
                console.error('Customer not found for customerId:', customerId);
                return new Response(JSON.stringify({ error: 'Customer not found' }), { status: 404 });
            }

            // Invoke the function to verify payment, create order, etc.
            const { data: verifyResult, error: invokeError } = await base44.asServiceRole.functions.invoke('verifyPaymentAndCreateOrder', {
                sessionId: session.id,
                customerId: customerId
            });

            if (invokeError) {
                console.error('Error invoking verifyPaymentAndCreateOrder:', invokeError);
                return new Response(JSON.stringify({ error: `Failed to invoke order creation: ${invokeError.message}` }), { status: 500 });
            }

            if (verifyResult?.success && verifyResult.order_id) {
                console.log('Order created successfully:', verifyResult.order_id);
                
                // Calculate and award EXP points (5 EXP per dollar spent on subtotal)
                const orderSubtotal = session.amount_subtotal ? session.amount_subtotal / 100 : 0; 
                let expEarned = Math.floor(orderSubtotal * 5);
                
                // Check if this is the user's first purchase
                const allUserOrders = await base44.asServiceRole.entities.Order.filter({ 
                    customer_id: customerId,
                    payment_status: 'paid'
                });
                
                // The 'verifyPaymentAndCreateOrder' function has just created this order.
                // So if the length is 1, it implies this is the very first order for this customer.
                const isFirstPurchase = allUserOrders.length === 1; 
                let firstPurchaseBonus = 0;
                
                if (isFirstPurchase) {
                    firstPurchaseBonus = 250;
                    expEarned += firstPurchaseBonus;
                    console.log('🎉 First purchase detected! Adding 250 EXP bonus');
                }
                
                if (expEarned > 0) {
                    const currentExp = customer.exp_points || 0;
                    const totalExpEarned = (customer.total_exp_earned || 0) + expEarned;
                    
                    await base44.asServiceRole.entities.User.update(customerId, {
                        exp_points: currentExp + expEarned,
                        total_exp_earned: totalExpEarned
                    });
                    console.log(`Updated user ${customerId} EXP: +${expEarned}, new total: ${currentExp + expEarned}`);

                    // Log EXP transaction for purchase
                    const purchaseExpAmount = Math.floor(orderSubtotal * 5);
                    await base44.asServiceRole.entities.ExpTransaction.create({
                        user_id: customerId,
                        action: 'earned',
                        amount: purchaseExpAmount,
                        order_id: verifyResult.order_id,
                        source: 'purchase',
                        description: `Earned ${purchaseExpAmount} EXP from order #${verifyResult.order_id.slice(-8)} ($${orderSubtotal.toFixed(2)})`
                    });
                    console.log(`Created EXP transaction for user ${customerId}: ${purchaseExpAmount} EXP`);
                    
                    // Log first purchase bonus if applicable
                    if (isFirstPurchase && firstPurchaseBonus > 0) {
                        await base44.asServiceRole.entities.ExpTransaction.create({
                            user_id: customerId,
                            action: 'earned',
                            amount: firstPurchaseBonus,
                            order_id: verifyResult.order_id,
                            source: 'purchase', // Still linked to purchase, but specifically the bonus
                            description: `First Purchase Bonus: ${firstPurchaseBonus} EXP! 🎉`
                        });
                        console.log(`✅ First purchase bonus logged: ${firstPurchaseBonus} EXP`);
                    }
                }

                // Process referral code if present
                const hasReferral = session.metadata?.has_referral === 'true';
                const referrerId = session.metadata?.referrer_id;
                const referralCode = session.metadata?.referral_code;

                if (hasReferral && referrerId && referralCode) {
                    console.log('Processing referral bonus for code:', referralCode);
                    
                    try {
                        const referrer = await base44.asServiceRole.entities.User.get(referrerId);
                        
                        if (referrer) {
                            const referralBonus = 250;
                            
                            // Award 250 EXP to referrer
                            await base44.asServiceRole.entities.User.update(referrerId, {
                                exp_points: (referrer.exp_points || 0) + referralBonus,
                                referral_count: (referrer.referral_count || 0) + 1,
                                total_exp_earned: (referrer.total_exp_earned || 0) + referralBonus
                            });
                            
                            await base44.asServiceRole.entities.ExpTransaction.create({
                                user_id: referrerId,
                                action: 'earned',
                                amount: referralBonus,
                                source: 'referral_given',
                                description: `Referral bonus for referring ${customer.full_name}`
                            });
                            
                            console.log(`✅ Awarded ${referralBonus} EXP to referrer ${referrer.full_name}`);
                            
                            // Award 250 EXP to new customer (in addition to purchase + first purchase bonus)
                            // customer.exp_points here still refers to the initial customer object fetched at the start of the webhook,
                            // before any updates from the current session's purchase EXP.
                            const currentCustomerExp = (customer.exp_points || 0) + expEarned;
                            await base44.asServiceRole.entities.User.update(customerId, {
                                exp_points: currentCustomerExp + referralBonus,
                                referred_by: referrerId,
                                total_exp_earned: (customer.total_exp_earned || 0) + expEarned + referralBonus
                            });
                            
                            await base44.asServiceRole.entities.ExpTransaction.create({
                                user_id: customerId,
                                action: 'earned',
                                amount: referralBonus,
                                source: 'referral_received',
                                description: `Welcome bonus from referral code ${referralCode}`
                            });
                            
                            console.log(`✅ Awarded ${referralBonus} EXP to new customer ${customer.full_name}`);
                            
                            // Send notification emails
                            try {
                                await base44.asServiceRole.integrations.Core.SendEmail({
                                    to: referrer.email,
                                    subject: '🎉 Your Referral Earned You 250 EXP!',
                                    body: `Hi ${referrer.full_name},

Great news! ${customer.full_name} just completed their first purchase using your referral code!

You've earned 250 EXP as a thank you for spreading the word.

Keep sharing your referral code to earn more rewards!

Your code: ${referralCode}

Best regards,
The EX3D Team`
                                });
                                
                                const bonusText = isFirstPurchase ? `\nPlus, you earned a ${firstPurchaseBonus} EXP first purchase bonus!\n` : '';
                                
                                await base44.asServiceRole.integrations.Core.SendEmail({
                                    to: customer.email,
                                    subject: '🎁 Welcome Bonus: 250 EXP Added!',
                                    body: `Hi ${customer.full_name},

Welcome to EX3D Prints! 

Thanks for using referral code ${referralCode} - we've added 250 EXP to your account as a welcome bonus!

Plus, you earned ${Math.floor(orderSubtotal * 5)} EXP from your purchase.${bonusText}
Total EXP earned: ${expEarned + referralBonus} EXP

Start redeeming your points for discounts on your next order!

Best regards,
The EX3D Team`
                                });
                                
                                console.log('✅ Referral notification emails sent');
                            } catch (emailError) {
                                console.error('⚠️ Failed to send referral emails:', emailError);
                            }
                        }
                    } catch (referralError) {
                        console.error('❌ Failed to process referral bonus:', referralError);
                    }
                } else {
                    console.log('No referral code in this order');
                }
                
                return new Response(JSON.stringify({ 
                    success: true, 
                    order_id: verifyResult.order_id,
                    exp_earned: expEarned,
                    first_purchase_bonus: firstPurchaseBonus,
                    referral_processed: hasReferral
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                console.error('Order creation failed or returned no order_id');
                return new Response(JSON.stringify({ error: 'Order creation failed' }), { status: 500 });
            }
        }

        return new Response(JSON.stringify({ received: true, message: `Event type ${event.type} received and acknowledged.` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('❌ Webhook processing error:', err.message);
        return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});