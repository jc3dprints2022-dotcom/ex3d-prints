import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        console.log('=== Create Checkout Session Started ===');

        const base44 = createClientFromRequest(req);

        // Auth is now optional — guests can checkout without an account.
        // We use .catch(() => null) so a missing/expired token doesn't throw.
        const user = await base44.auth.me().catch(() => null);

        const body = await req.json();
        const {
            cartItems,
            successUrl,
            cancelUrl,
            couponCode,
            referralCode,
            isPriority,
            campusLocation,
            shippingFee,
            shippingAddress,
            isLocalDelivery,
            guestEmail, // passed by Checkout.jsx when user is not signed in
        } = body;

        // Determine the email to use for this order
        const orderEmail = user?.email || guestEmail;

        // Require either a logged-in user or a guest email
        if (!user && !guestEmail) {
            return Response.json(
                { error: 'Please provide an email address to complete your order.' },
                { status: 400 }
            );
        }

        console.log('📦 Order for:', user ? `user ${user.id}` : `guest ${guestEmail}`);
        console.log('📦 isPriority received:', isPriority);

        if (!cartItems || cartItems.length === 0) {
            return Response.json({ error: 'Cart is empty' }, { status: 400 });
        }

        if (!successUrl || !cancelUrl) {
            return Response.json({ error: 'Success and cancel URLs are required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            console.error('Stripe_Secret_Key not found');
            return Response.json({ error: 'Payment system not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        // Referral code validation — only for logged-in users (guests don't have accounts)
        let referralValidation = null;
        if (user && referralCode && referralCode.trim()) {
            try {
                const allUsers = await base44.asServiceRole.entities.User.list();
                const referrer = allUsers.find(u => u.referral_code === referralCode.trim().toUpperCase());

                if (referrer && referrer.id !== user.id) {
                    referralValidation = {
                        valid: true,
                        referrer_id: referrer.id,
                        referrer_name: referrer.full_name,
                    };
                    console.log('Valid referral code:', referralCode, 'Referrer:', referrer.full_name);
                } else if (referrer && referrer.id === user.id) {
                    return Response.json({
                        error: 'Cannot use your own referral code',
                        details: 'You cannot refer yourself',
                    }, { status: 400 });
                } else {
                    return Response.json({
                        error: 'Invalid referral code',
                        details: 'The referral code you entered is not valid',
                    }, { status: 400 });
                }
            } catch (error) {
                console.error('Error validating referral code:', error);
                return Response.json({
                    error: 'Failed to validate referral code',
                    details: error.message,
                }, { status: 500 });
            }
        }

        // Fetch products from database to get Stripe product IDs (service role works for guests too)
        const productIds = [...new Set(cartItems.filter(item => !item.is_priority_fee).map(item => item.product_id))];
        const products = await Promise.all(
            productIds.map(id => base44.asServiceRole.entities.Product.get(id).catch(() => null))
        );
        const productMap = {};
        products.filter(p => p).forEach(p => productMap[p.id] = p);

        // Build Stripe line items
        const lineItems = cartItems.map(item => {
            if (item.is_priority_fee) return null;

            const product = productMap[item.product_id];

            if (product?.stripe_product_id) {
                return {
                    price_data: {
                        currency: 'usd',
                        product: product.stripe_product_id,
                        unit_amount: Math.round(item.unit_price * 100),
                    },
                    quantity: item.quantity,
                };
            } else {
                return {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: item.product_name || 'Product',
                            description: `Material: ${item.selected_material || 'N/A'}, Color: ${item.selected_color || 'N/A'}`,
                        },
                        unit_amount: Math.round(item.unit_price * 100),
                    },
                    quantity: item.quantity,
                };
            }
        }).filter(item => item !== null);

        console.log('📦 Line items before priority:', lineItems.length);

        // Priority fee
        const hasPriorityInCart = cartItems.some(item => item.is_priority_fee);
        if (isPriority === true || isPriority === 'true' || hasPriorityInCart) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: '⚡ Priority Overnight Delivery',
                        description: 'Your order will be completed by the next day',
                    },
                    unit_amount: 400,
                },
                quantity: 1,
            });
        }

        // Shipping fee
        if (shippingFee && shippingFee > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: '📦 Shipping Fee',
                        description: 'Shipping fee for orders under $35',
                    },
                    unit_amount: Math.round(shippingFee * 100),
                },
                quantity: 1,
            });
        }

        // Stripe customer — only create/retrieve for logged-in users.
        // Guests use customer_email on the session instead.
        let stripeCustomerId = null;
        if (user) {
            try {
                if (user.stripe_customer_id) {
                    stripeCustomerId = user.stripe_customer_id;
                    console.log('Using existing Stripe customer:', stripeCustomerId);
                } else {
                    const customer = await stripe.customers.create({
                        email: user.email,
                        name: user.full_name,
                        metadata: { user_id: user.id },
                    });
                    stripeCustomerId = customer.id;
                    await base44.asServiceRole.entities.User.update(user.id, {
                        stripe_customer_id: stripeCustomerId,
                    });
                    console.log('Created new Stripe customer:', stripeCustomerId);
                }
            } catch (customerError) {
                console.error('Failed to create Stripe customer:', customerError);
                // Non-fatal — fall back to customer_email below
            }
        }

        const sessionData = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            // For logged-in users with a Stripe customer, attach the customer.
            // For guests (or users where customer creation failed), pass the email directly.
            ...(stripeCustomerId
                ? { customer: stripeCustomerId }
                : { customer_email: orderEmail }),
            metadata: {
                user_id: user?.id || 'guest',
                guest_email: user ? '' : (guestEmail || ''),
                referrer_id: referralValidation?.referrer_id || '',
                has_referral: referralValidation?.valid ? 'true' : 'false',
                is_priority: isPriority ? 'true' : 'false',
                campus_location: campusLocation || '',
                shipping_address: JSON.stringify(shippingAddress || {}),
                is_local_delivery: isLocalDelivery ? 'true' : 'false',
                shipping_fee: shippingFee ? String(shippingFee) : '0',
                // Serialize cart items so guest orders can be recovered in verifyPaymentAndCreateOrder
                // (guests have no DB cart to read from after payment completes)
                items_json: JSON.stringify(cartItems.map(item => ({
                    product_id: item.product_id,
                    custom_request_id: item.custom_request_id || null,
                    product_name: item.product_name,
                    quantity: item.quantity || 1,
                    selected_material: item.selected_material || 'PLA',
                    selected_color: item.selected_color || 'Black',
                    selected_resolution: item.selected_resolution || 0.2,
                    use_recycled_filament: item.use_recycled_filament || false,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    multi_color_selections: item.multi_color_selections || [],
                    print_file_scale: item.print_file_scale || 100,
                }))).slice(0, 500), // Stripe metadata values capped at 500 chars
            },
        };

        // Coupon / promo codes
        if (couponCode && couponCode.trim().toUpperCase() === 'JC3DTESTFREEDOM') {
            try {
                const testCoupon = await stripe.coupons.create({
                    percent_off: 100,
                    duration: 'once',
                    name: 'Test Freedom Code',
                });
                const testPromoCode = await stripe.promotionCodes.create({
                    coupon: testCoupon.id,
                    code: 'JC3DTESTFREEDOM_' + Date.now(),
                });
                sessionData.discounts = [{ promotion_code: testPromoCode.id }];
                console.log('Applied test code — order is FREE');
            } catch (testError) {
                console.error('Failed to create test code:', testError);
            }
        } else if (couponCode && couponCode.trim()) {
            try {
                const promotionCodes = await stripe.promotionCodes.list({
                    code: couponCode.trim(),
                    active: true,
                    limit: 1,
                });
                if (promotionCodes.data.length > 0) {
                    sessionData.discounts = [{ promotion_code: promotionCodes.data[0].id }];
                    console.log('Applied coupon code:', couponCode);
                } else {
                    return Response.json({
                        error: 'Invalid coupon code',
                        details: 'The coupon code you entered is not valid or has expired',
                    }, { status: 400 });
                }
            } catch (couponError) {
                console.error('Error applying coupon:', couponError);
                return Response.json({
                    error: 'Invalid coupon code',
                    details: 'Unable to apply the coupon code',
                }, { status: 400 });
            }
        } else {
            sessionData.allow_promotion_codes = true;
        }

        console.log('📦 Creating session with', lineItems.length, 'line items');
        const session = await stripe.checkout.sessions.create(sessionData);
        console.log('✅ Checkout session created:', session.id);

        return Response.json({ sessionId: session.id, url: session.url });

    } catch (error) {
        console.error('❌ Checkout session creation error:', error);
        return Response.json({
            error: 'Failed to create checkout session',
            details: error.message,
        }, { status: 500 });
    }
});
