
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        console.log('=== Create Checkout Session Started ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('User not authenticated');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('User authenticated:', user.email);

        const body = await req.json();
        const { cartItems, successUrl, cancelUrl, couponCode, referralCode } = body;

        if (!cartItems || cartItems.length === 0) {
            console.error('Cart is empty');
            return Response.json({ error: 'Cart is empty' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            console.error('Stripe_Secret_Key not found');
            return Response.json({ error: 'Payment system not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Validate referral code if provided
        let referralValidation = null;
        if (referralCode && referralCode.trim()) {
            try {
                const allUsers = await base44.asServiceRole.entities.User.list();
                const referrer = allUsers.find(u => u.referral_code === referralCode.trim().toUpperCase());
                
                if (referrer && referrer.id !== user.id) {
                    referralValidation = {
                        valid: true,
                        referrer_id: referrer.id,
                        referrer_name: referrer.full_name
                    };
                    console.log('Valid referral code:', referralCode, 'Referrer:', referrer.full_name);
                } else if (referrer && referrer.id === user.id) {
                    console.log('User tried to use their own referral code');
                    return Response.json({ 
                        error: 'Cannot use your own referral code',
                        details: 'You cannot refer yourself'
                    }, { status: 400 });
                } else {
                    console.log('Invalid referral code:', referralCode);
                    return Response.json({ 
                        error: 'Invalid referral code',
                        details: 'The referral code you entered is not valid'
                    }, { status: 400 });
                }
            } catch (error) {
                console.error('Error validating referral code:', error);
                return Response.json({ 
                    error: 'Failed to validate referral code',
                    details: error.message
                }, { status: 500 });
            }
        }

        // Create line items for Stripe
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.product_name || 'Product',
                    description: `${item.selected_material} - ${item.selected_color}`,
                },
                unit_amount: Math.round(item.unit_price * 100),
            },
            quantity: item.quantity,
        }));

        console.log('Line items created:', lineItems.length);

        // Prepare session data with referral metadata
        const sessionData = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: user.email,
            metadata: {
                user_id: user.id,
                user_email: user.email, // Added user_email to metadata
                referral_code: referralCode || '',
                referrer_id: referralValidation?.referrer_id || '',
                has_referral: referralValidation?.valid ? 'true' : 'false'
            }
        };

        // If a specific coupon code is provided, validate and apply it
        if (couponCode && couponCode.trim()) {
            try {
                const promotionCodes = await stripe.promotionCodes.list({
                    code: couponCode.trim(),
                    active: true,
                    limit: 1
                });

                if (promotionCodes.data.length > 0) {
                    sessionData.discounts = [{
                        promotion_code: promotionCodes.data[0].id
                    }];
                    console.log('Applied coupon code:', couponCode);
                } else {
                    console.log('Coupon code not found or inactive:', couponCode);
                    return Response.json({ 
                        error: 'Invalid coupon code',
                        details: 'The coupon code you entered is not valid or has expired'
                    }, { status: 400 });
                }
            } catch (couponError) {
                console.error('Error applying coupon:', couponError);
                return Response.json({ 
                    error: 'Invalid coupon code',
                    details: 'Unable to apply the coupon code'
                }, { status: 400 });
            }
        } else {
            sessionData.allow_promotion_codes = true;
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create(sessionData);

        console.log('✅ Checkout session created:', session.id);
        if (referralValidation?.valid) {
            console.log('✅ Referral code attached to session');
        }

        return Response.json({ 
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('❌ Checkout session creation error:', error);
        console.error('Error stack:', error.stack);
        return Response.json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        }, { status: 500 });
    }
});
