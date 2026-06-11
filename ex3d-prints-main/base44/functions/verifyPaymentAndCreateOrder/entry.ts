import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        console.log('=== Verify Payment and Create Order Started ===');

        const base44 = createClientFromRequest(req);
        // Auth is optional — guests complete checkout without an account.
        let user = await base44.auth.me().catch(() => null);

        console.log(user ? `User authenticated: ${user.email}` : 'No auth context (guest checkout or webhook invocation)');

        // Read the full body — PaymentSuccess.jsx sends guest data alongside sessionId,
        // and the Stripe webhook sends { sessionId, customerId, _fromWebhook }.
        const body = await req.json();
        const {
            sessionId,
            customerId: reqCustomerId,
            _fromWebhook,
            guestEmail: reqGuestEmail,
            guestName:  reqGuestName,
            shippingAddress: reqShippingAddress,
            cartItems:  reqCartItems,
            landingPageSource: reqLandingPageSource,
        } = body;

        if (!sessionId) {
            console.error('No session ID provided');
            return Response.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), {
            apiVersion: '2023-10-16',
        });

        // Retrieve the session from Stripe
        console.log('Retrieving Stripe session:', sessionId);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('Stripe session retrieved:', session.payment_status);
        const meta = session.metadata || {};

        // For logged-in users, verify the session belongs to them.
        // For guests, the session metadata will have user_id = 'guest' — allow it.
        const sessionUserId = session.metadata?.user_id ?? 'guest';
        if (user && sessionUserId !== 'guest' && sessionUserId !== user.id) {
            console.error('Session user mismatch');
            return Response.json({ error: 'Session does not belong to this user' }, { status: 403 });
        }

        // Webhook invocations have no auth context. If the Stripe session belongs to a real
        // (logged-in) user, resolve that user via service role so their DB cart is read,
        // EXP is awarded, and the order is linked to the right customer — instead of being
        // silently treated as a guest order.
        if (!user && sessionUserId !== 'guest') {
            const resolvedId = reqCustomerId && reqCustomerId !== 'guest' ? reqCustomerId : sessionUserId;
            try {
                const userRows = await base44.asServiceRole.entities.User.filter({ id: resolvedId });
                if (userRows.length > 0) {
                    user = userRows[0];
                    console.log('✅ Resolved session user via service role (webhook path):', user.email);
                } else {
                    console.warn('⚠️ Session user_id not found in User table:', resolvedId);
                }
            } catch (resolveErr) {
                console.error('⚠️ Failed to resolve session user via service role:', resolveErr.message);
            }
        }

        // Check if payment was successful
        // 'no_payment_required' happens when a 100%-off coupon is applied
        const isFreeOrder = session.payment_status === 'no_payment_required' && session.amount_total === 0;
        if (session.payment_status !== 'paid' && !isFreeOrder) {
            console.error('Payment not completed:', session.payment_status);
            return Response.json({
                error: 'Payment not completed',
                payment_status: session.payment_status
            }, { status: 400 });
        }
        if (isFreeOrder) console.log('100% off coupon applied — free order, skipping payment check');

        // Check if order already exists for this session (prevent duplicates from
        // simultaneous webhook + client-side calls racing each other)
        console.log('Checking for existing orders...');
        const existingOrders = await base44.asServiceRole.entities.Order.filter({
            stripe_session_id: sessionId
        });

        if (existingOrders.length > 0) {
            console.log('Order already exists for this session — idempotency guard triggered, skipping all processing');
            return Response.json({
                success: true,
                message: 'Order already processed',
                order_id: existingOrders[0].id
            });
        }

        // Double-check by payment_intent as well (extra guard for race conditions)
        const paymentIntentId = session.payment_intent;
        if (paymentIntentId) {
            const existingByIntent = await base44.asServiceRole.entities.Order.filter({
                payment_intent_id: paymentIntentId
            }).catch(() => []);
            if (existingByIntent.length > 0) {
                console.log('Order already exists for this payment_intent — skipping');
                return Response.json({
                    success: true,
                    message: 'Order already processed',
                    order_id: existingByIntent[0].id
                });
            }
        }

        // ── Determine guest vs. logged-in ───────────────────────────────────
        const isGuest = !user || sessionUserId === 'guest';

        // Resolve the email and name to use for this order.
        // Priority: request body (sent by PaymentSuccess from localStorage) > Stripe metadata > fallback
        const effectiveGuestEmail = reqGuestEmail || meta.guest_email || session.customer_details?.email || '';
        const orderEmail          = user?.email || effectiveGuestEmail;
        const customerName        = user?.full_name || reqGuestName || reqShippingAddress?.name || 'Customer';

        // Resolve shipping address.
        // Priority: request body > Stripe session metadata (may be truncated at 500 chars)
        let shippingAddress = reqShippingAddress || null;
        if (!shippingAddress) {
            try {
                shippingAddress = meta.shipping_address
                    ? JSON.parse(meta.shipping_address)
                    : null;
            } catch (e) {
                console.error('Failed to parse shipping_address from session metadata:', e);
            }
        }

        // ── Build cart items ────────────────────────────────────────────────
        const cartItems = [];

        if (!isGuest) {
            // Logged-in: read from DB
            console.log('Fetching cart items for user:', user.id);
            const dbCart = await base44.asServiceRole.entities.Cart.filter({ user_id: user.id });
            console.log('Cart items found:', dbCart.length);
            cartItems.push(...dbCart);
        }

        if (cartItems.length === 0) {
            // Guest (or logged-in user whose cart was already cleared):
            // First try the request body — PaymentSuccess sends the full cart from localStorage.
            // This is the reliable path: Stripe metadata values are capped at 500 chars and
            // will be truncated / invalid JSON for any real order.
            if (reqCartItems && reqCartItems.length > 0) {
                console.log(`Using ${reqCartItems.length} cart item(s) from request body`);
                const syntheticUserId = user?.id || orderEmail || 'guest';
                for (const item of reqCartItems) {
                    cartItems.push({
                        id: `req_${item.product_id || item.custom_request_id}_${Date.now()}`,
                        user_id: syntheticUserId,
                        product_id:         item.product_id        || null,
                        custom_request_id:  item.custom_request_id || null,
                        product_name:       item.product_name,
                        quantity:           item.quantity           || 1,
                        selected_material:  item.selected_material  || 'PLA',
                        selected_color:     item.selected_color     || 'Black',
                        selected_resolution: item.selected_resolution || 0.2,
                        use_recycled_filament: item.use_recycled_filament || false,
                        unit_price:         item.unit_price,
                        total_price:        item.total_price,
                        multi_color_selections: item.multi_color_selections || [],
                        print_file_scale:   item.print_file_scale   || 100,
                        images:             item.images             || [],
                        designer_id:        item.designer_id        || null,
                        is_custom_request:  item.is_custom_request  || false,
                    });
                }
            } else {
                // Fallback: try Stripe session metadata
                console.warn('Request body has no cartItems — attempting to recover from Stripe session metadata');
                const itemsMeta = meta.items_json;
                const syntheticUserId = user?.id || orderEmail || 'guest';
                if (itemsMeta) {
                    try {
                        const parsedItems = JSON.parse(itemsMeta);
                        for (const item of parsedItems) {
                            cartItems.push({
                                id: `recovered_${item.product_id}_${Date.now()}`,
                                user_id: syntheticUserId,
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
                            });
                        }
                        console.log(`Recovered ${cartItems.length} items from session metadata`);
                    } catch (parseErr) {
                        console.error('Failed to parse items_json from session metadata (possibly truncated):', parseErr.message);
                        // Don't fail yet — fall through to Stripe line-item recovery below
                    }
                }

                // Absolute last resort: rebuild from the Stripe session's own line items.
                // The payment already succeeded — we must never end up with no order.
                if (cartItems.length === 0) {
                    try {
                        console.warn('Recovering cart from Stripe line items...');
                        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
                        for (const li of (lineItems.data || [])) {
                            const name = li.description || 'Product';
                            // Skip fee lines — they're reflected in totals, not order items
                            if (name.includes('Shipping Fee') || name.includes('Priority Overnight')) continue;
                            cartItems.push({
                                id: `stripe_li_${li.id}`,
                                user_id: syntheticUserId,
                                product_id: null,
                                custom_request_id: null,
                                product_name: name,
                                quantity: li.quantity || 1,
                                selected_material: 'PLA',
                                selected_color: 'Black',
                                selected_resolution: 0.2,
                                unit_price: (li.price?.unit_amount || 0) / 100,
                                total_price: (li.amount_total || 0) / 100,
                                multi_color_selections: [],
                                print_file_scale: 100,
                            });
                        }
                        console.log(`Recovered ${cartItems.length} items from Stripe line items`);
                    } catch (liErr) {
                        console.error('Failed to recover items from Stripe line items:', liErr.message);
                    }
                }

                if (cartItems.length === 0) {
                    console.error('CRITICAL: Payment succeeded but cart could not be recovered for session', sessionId);
                    return Response.json({ error: 'Cart is empty and cannot be recovered — contact support with your payment receipt' }, { status: 400 });
                }
            }
        }

        // ── Enrich cart items with full product/custom-request details ──────
        console.log('Enriching cart items...');
        const enrichedItems = [];

        for (const item of cartItems) {
            try {
                console.log('Processing item:', {
                    product_id: item.product_id,
                    custom_request_id: item.custom_request_id,
                    product_name: item.product_name
                });

                if (item.custom_request_id) {
                    console.log('Fetching custom request:', item.custom_request_id);
                    const customRequest = await base44.asServiceRole.entities.CustomPrintRequest.get(item.custom_request_id);
                    console.log('Custom request found:', customRequest.title);

                    enrichedItems.push({
                        product_id: item.product_id,
                        product_name: customRequest.title,
                        custom_request_id: item.custom_request_id,
                        description: customRequest.description,
                        quantity: item.quantity || customRequest.quantity || 1,
                        selected_material: item.selected_material || customRequest.material_preference || 'PLA',
                        selected_color: item.selected_color || customRequest.color_preference || 'Black',
                        selected_resolution: item.selected_resolution || 0.2,
                        unit_price: item.unit_price || customRequest.quoted_price || 0,
                        total_price: item.total_price || (customRequest.quoted_price * (customRequest.quantity || 1)),
                        print_files: customRequest.files || [],
                        images: customRequest.images || [],
                        print_time_hours: customRequest.print_time_hours || 0,
                        weight_grams: customRequest.weight_grams || 0,
                        dimensions: customRequest.dimensions || {},
                        special_requirements: customRequest.special_requirements || '',
                        admin_notes: customRequest.admin_notes || '',
                        multi_color: false,
                        print_file_scale: 100
                    });
                } else if (item.product_id) {
                    console.log('Fetching product:', item.product_id);
                    const product = await base44.asServiceRole.entities.Product.get(item.product_id);
                    console.log('Product found:', product.name);

                    enrichedItems.push({
                        product_id: item.product_id,
                        // Preserve cart item name (may include scale/variant info like "Saturn V (1:96 Scale)")
                        product_name: item.product_name || product.name,
                        quantity: item.quantity,
                        selected_material: item.selected_material,
                        selected_color: item.selected_color,
                        selected_resolution: item.selected_resolution || 0.2,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        multi_color_selections: item.multi_color_selections,
                        print_file_scale: product.custom_scale || item.print_file_scale || 100,
                        print_files: product.print_files || [],
                        print_time_hours: product.print_time_hours,
                        weight_grams: product.weight_grams,
                        dimensions: product.dimensions,
                        multi_color: product.multi_color,
                        designer_id: product.designer_id
                    });
                } else {
                    // No product_id and no custom_request_id — use item as-is
                    console.warn('Item has no product_id or custom_request_id, using raw data');
                    enrichedItems.push({
                        product_id: null,
                        product_name: item.product_name || 'Unknown Product',
                        quantity: item.quantity,
                        selected_material: item.selected_material,
                        selected_color: item.selected_color,
                        selected_resolution: item.selected_resolution || 0.2,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        multi_color_selections: item.multi_color_selections || [],
                        print_files: [],
                        multi_color: false,
                        print_file_scale: 100
                    });
                }
            } catch (error) {
                console.error('Failed to enrich cart item:', item.product_id || item.custom_request_id, error);
                // Continue with partial data if enrichment fails
                enrichedItems.push({
                    product_id: item.product_id,
                    product_name: item.product_name || 'Unknown Product',
                    custom_request_id: item.custom_request_id,
                    quantity: item.quantity,
                    selected_material: item.selected_material,
                    selected_color: item.selected_color,
                    selected_resolution: item.selected_resolution || 0.2,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    print_files: [],
                    multi_color: false,
                    print_file_scale: 100
                });
            }
        }

        console.log('Enriched items:', enrichedItems.length);

        // Calculate total from session (includes any discounts)
        const totalAmount = session.amount_total / 100;
        console.log('Total amount:', totalAmount);

        // Calculate actual payout: 50% of what customer paid for items (excluding shipping)
        const shippingFeeFromMeta = parseFloat(meta.shipping_fee || 0);
        const amountPaidForItems = totalAmount - shippingFeeFromMeta;
        const makerPayoutAmount = Math.max(0, amountPaidForItems * 0.5);
        console.log('Maker payout amount (50% of paid items):', makerPayoutAmount);

        // ── Create or find a guest user account ─────────────────────────────
        // This ensures every order has a customer record, guests get an account,
        // and the order appears in their dashboard once they log in.
        let resolvedCustomerId = user?.id || null;

        if (isGuest && orderEmail) {
            try {
                console.log('Looking up / creating guest user account for:', orderEmail);
                const existingUsers = await base44.asServiceRole.entities.User.filter({ email: orderEmail });
                if (existingUsers.length > 0) {
                    resolvedCustomerId = existingUsers[0].id;
                    console.log('✅ Found existing user account:', resolvedCustomerId);
                } else {
                    // Invite the guest user so they get an account they can activate later
                    try {
                        await base44.asServiceRole.auth.inviteUser(orderEmail, 'user');
                        console.log('✅ Invite sent to:', orderEmail);
                        // Look up the newly created user
                        const retryUsers = await base44.asServiceRole.entities.User.filter({ email: orderEmail }).catch(() => []);
                        if (retryUsers.length > 0) {
                            resolvedCustomerId = retryUsers[0].id;
                            await base44.asServiceRole.entities.User.update(resolvedCustomerId, {
                                full_name: customerName,
                            }).catch(() => {});
                            console.log('✅ Created guest user via invite:', resolvedCustomerId);
                        }
                    } catch (inviteErr) {
                        console.warn('⚠️ Could not invite guest user:', inviteErr.message);
                        // Try looking them up again — invite may have created them anyway
                        const retryUsers = await base44.asServiceRole.entities.User.filter({ email: orderEmail }).catch(() => []);
                        if (retryUsers.length > 0) {
                            resolvedCustomerId = retryUsers[0].id;
                            console.log('✅ Found user after invite attempt:', resolvedCustomerId);
                        }
                    }
                }
            } catch (guestUserErr) {
                console.warn('⚠️ Could not create/find guest user account:', guestUserErr.message);
                // Non-critical — the order will still be created without a customer_id
            }
        }

        // Update campus location for logged-in users
        const campusLocation = meta.campus_location || 'erau_prescott';
        const isLocalDelivery = meta.is_local_delivery === 'true';
        const isPriority = meta.is_priority === 'true';

        if (user?.id && !user.campus_location && campusLocation) {
            await base44.asServiceRole.entities.User.update(user.id, {
                campus_location: campusLocation
            }).catch(() => {});
        }

        // ── Affiliate ref ────────────────────────────────────────────────────
        const affiliateRef = meta.affiliate_ref || '';
        const orderNotes = affiliateRef ? `ref:${affiliateRef}` : '';
        if (affiliateRef) {
            console.log('Affiliate ref detected:', affiliateRef);
        }

        // ── Create the order ────────────────────────────────────────────────
        console.log('Creating order...');
        // customer_id is required — use email as fallback if guest user creation failed
        const finalCustomerId = resolvedCustomerId || orderEmail || 'guest_unknown';
        const newOrder = await base44.asServiceRole.entities.Order.create({
            customer_id: finalCustomerId,
            items: enrichedItems,
            total_amount: totalAmount,
            delivery_option: isLocalDelivery ? 'local_delivery' : 'shipping',
            status: 'pending',
            payment_status: 'paid',
            payment_intent_id: session.payment_intent,
            stripe_session_id: sessionId,
            is_priority: isPriority,
            campus_location: campusLocation,
            is_local_delivery: isLocalDelivery,
            shipping_address: shippingAddress,
            maker_payout_amount: makerPayoutAmount,
            shipping_cost: shippingFeeFromMeta,
            landing_page_source: reqLandingPageSource || meta.landing_page_source || undefined,
            notes: orderNotes || undefined,
        });

        console.log('✅ Order created:', newOrder.id);

        // ── Award EXP points — only for logged-in users ─────────────────────
        let totalExpAwarded = 0;
        let expDetails = '';
        let isFirstOrder = false;

        if (user) {
            const expFromPurchase = Math.floor(totalAmount * 5);
            console.log('Awarding EXP for purchase:', expFromPurchase);

            const userOrders = await base44.asServiceRole.entities.Order.filter({ customer_id: user.id });
            isFirstOrder = userOrders.length === 1;

            totalExpAwarded = expFromPurchase;
            expDetails = `Purchase: ${expFromPurchase} EXP`;

            if (isFirstOrder) {
                totalExpAwarded += 250;
                expDetails += `, First Order Bonus: 250 EXP`;
                console.log('First order bonus: 250 EXP');
            }

            const hasReferral = meta.has_referral === 'true';
            const referrerId = meta.referrer_id;

            if (hasReferral && referrerId && isFirstOrder) {
                totalExpAwarded += 250;
                expDetails += `, Referral Bonus: 250 EXP`;
                console.log('Referral bonus: 250 EXP (first order only)');

                try {
                    const referrer = await base44.asServiceRole.entities.User.get(referrerId);
                    if (referrer) {
                        const existingReferralTransactions = await base44.asServiceRole.entities.ExpTransaction.filter({
                            user_id: referrer.id,
                            source: 'referral_given',
                            description: { $regex: user.id }
                        });

                        if (existingReferralTransactions.length === 0) {
                            await base44.asServiceRole.entities.User.update(referrer.id, {
                                exp_points: (referrer.exp_points || 0) + 250,
                                total_exp_earned: (referrer.total_exp_earned || 0) + 250,
                                referral_count: (referrer.referral_count || 0) + 1
                            });
                            await base44.asServiceRole.entities.ExpTransaction.create({
                                user_id: referrer.id,
                                action: 'earned',
                                amount: 250,
                                source: 'referral_given',
                                order_id: newOrder.id,
                                description: `Referral bonus for referring ${user.full_name || user.email} (${user.id})`
                            });
                            console.log('✅ Awarded 250 EXP to referrer:', referrer.email);
                        } else {
                            console.log('⚠️ Referrer already received EXP for this user');
                        }
                    }
                } catch (error) {
                    console.error('Failed to award EXP to referrer:', error);
                }
            } else if (hasReferral && !isFirstOrder) {
                console.log('⚠️ Referral code used but not first order - no referral bonus awarded');
            }

            await base44.asServiceRole.entities.User.update(user.id, {
                exp_points: (user.exp_points || 0) + totalExpAwarded,
                total_exp_earned: (user.total_exp_earned || 0) + totalExpAwarded
            });

            await base44.asServiceRole.entities.ExpTransaction.create({
                user_id: user.id,
                action: 'earned',
                amount: totalExpAwarded,
                source: 'purchase',
                order_id: newOrder.id,
                description: expDetails
            });

            console.log('✅ Total EXP awarded:', totalExpAwarded);
        } else {
            console.log('Guest order — skipping EXP award');
        }

        // ── Assign to maker(s) ───────────────────────────────────────────────
        try {
            console.log('Assigning order to maker...');

            if (isFreeOrder) {
                // 100% off orders go directly to jc3dprints2022@gmail.com
                console.log('Free order — assigning directly to jc3dprints2022@gmail.com');
                const jcUsers = await base44.asServiceRole.entities.User.filter({ email: 'jc3dprints2022@gmail.com' });
                const jcUser = jcUsers[0];
                if (jcUser?.maker_id) {
                    await base44.asServiceRole.entities.Order.update(newOrder.id, {
                        maker_id: jcUser.maker_id,
                        status: 'accepted',
                        offer_status: 'accepted',
                        current_offered_maker_id: jcUser.maker_id,
                    });
                    console.log('✅ Free order assigned to jc3dprints2022 maker_id:', jcUser.maker_id);
                } else {
                    console.warn('⚠️ jc3dprints2022@gmail.com not found or has no maker_id — falling back to normal assignment');
                    await base44.asServiceRole.functions.invoke('assignOrderToMaker', { orderId: newOrder.id, assignToMultiple: false });
                }
            } else {
                const totalPrintTime = enrichedItems.reduce((sum, item) =>
                    sum + ((item.print_time_hours || 0) * item.quantity), 0
                );
                console.log('Total print time:', totalPrintTime, 'hours');
                const assignToMultiple = totalPrintTime > 5;
                // Use service role so this also works from webhook invocations (no user auth)
                await base44.asServiceRole.functions.invoke('assignOrderToMaker', {
                    orderId: newOrder.id,
                    assignToMultiple
                });
            }
            console.log('✅ Order assigned to maker(s)');
        } catch (assignError) {
            console.error('⚠️ Maker assignment failed:', assignError);
        }

        // Record designer royalties + maker earnings AFTER assignment so maker_id is populated
        try {
            await base44.asServiceRole.functions.invoke('recordOrderEarnings', { orderId: newOrder.id });
            console.log('✅ Earnings recorded');
        } catch (earningsError) {
            console.error('⚠️ Failed to record earnings:', earningsError);
        }

        // ── Send confirmation email ──────────────────────────────────────────
        try {
            console.log('Sending confirmation email to:', orderEmail);

            const discountAmt = session.total_details?.amount_discount
                ? (session.total_details.amount_discount / 100)
                : 0;
            const shippingFeeDisplay = shippingAddress
                ? parseFloat(meta.shipping_fee || 0).toFixed(2)
                : '0.00';

            const itemRowsHtml = enrichedItems.map((item, idx) => {
                const colorStr = item.multi_color_selections?.length > 0
                    ? item.multi_color_selections.join(', ')
                    : (item.selected_color || 'Black');
                return `<tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:10px 8px;color:#2d3748;font-size:14px;">${idx + 1}. ${item.product_name}${item.custom_request_id ? ' <span style="background:#ebf8ff;color:#2b6cb0;padding:2px 6px;border-radius:4px;font-size:11px;">Custom</span>' : ''}</td>
                  <td style="padding:10px 8px;color:#4a5568;font-size:13px;">${item.selected_material || 'PLA'} / ${colorStr}</td>
                  <td style="padding:10px 8px;text-align:center;color:#4a5568;font-size:13px;">×${item.quantity}</td>
                  <td style="padding:10px 8px;text-align:right;color:#2d3748;font-weight:600;font-size:13px;">$${(item.total_price || 0).toFixed(2)}</td>
                </tr>`;
            }).join('');

            const bonusLines = user ? [
                isFirstOrder ? `<p style="margin:4px 0;color:#276749;font-size:13px;">🎉 <strong>First Order Bonus:</strong> +250 EXP</p>` : '',
                (meta.has_referral === 'true' && isFirstOrder) ? `<p style="margin:4px 0;color:#276749;font-size:13px;">🎉 <strong>Referral Bonus:</strong> +250 EXP</p>` : ''
            ].filter(Boolean).join('') : '';

            const shippingRow = shippingAddress
                ? `<tr><td style="padding:6px 0;color:#718096;">Shipping</td><td style="padding:6px 0;text-align:right;color:#2d3748;">$${shippingFeeDisplay}</td></tr>`
                : '';
            const discountRow = discountAmt > 0
                ? `<tr><td style="padding:6px 0;color:#276749;">Discount</td><td style="padding:6px 0;text-align:right;color:#276749;">-$${discountAmt.toFixed(2)}</td></tr>`
                : '';

            const shippingAddrBlock = shippingAddress
                ? `<div style="margin-top:20px;padding:14px 16px;background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;">
                    <p style="margin:0 0 6px;font-weight:600;color:#2d3748;font-size:13px;">📦 Shipping To</p>
                    <p style="margin:0;color:#4a5568;font-size:13px;">${shippingAddress.name}<br>${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}</p>
                  </div>`
                : '';

            // For guests: add a note prompting them to set up their account
            const guestAccountBlock = isGuest && resolvedCustomerId
                ? `<div style="margin-top:20px;padding:16px;background:#f0fff4;border:2px solid #68d391;border-radius:10px;">
                    <p style="margin:0 0 8px;font-weight:700;color:#276749;font-size:14px;">🔑 Your Account Is Ready</p>
                    <p style="margin:0 0 10px;color:#276749;font-size:13px;">We created a free account for <strong>${orderEmail}</strong> so you can track this order and future orders.</p>
                    <a href="https://ex3dprints.com/login?forgot=1&email=${encodeURIComponent(orderEmail)}" style="display:inline-block;background:#276749;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Set Your Password →</a>
                    <p style="margin:10px 0 0;color:#4a9e68;font-size:12px;">Or visit ex3dprints.com and click "Forgot Password" to get started.</p>
                  </div>`
                : isGuest
                ? `<div style="margin-top:20px;padding:14px 16px;background:#fff8e1;border:1px solid #f6d860;border-radius:8px;">
                    <p style="margin:0;color:#92400e;font-size:13px;">💡 <strong>Track your order:</strong> Visit <a href="https://ex3dprints.com" style="color:#92400e;">ex3dprints.com</a>, click Sign In → Forgot Password, and enter <strong>${orderEmail}</strong> to create your account.</p>
                  </div>`
                : '';

            const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:36px 32px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">✅</div>
    <h1 style="color:white;margin:0;font-size:26px;">Order Confirmed!</h1>
    <p style="color:#90cdf4;margin:8px 0 0;font-size:15px;">Order #${newOrder.id.slice(-8)}</p>
  </div>
  <div style="padding:28px 32px 0;">
    <p style="color:#2d3748;font-size:16px;margin:0;">Hi <strong>${customerName}</strong>,</p>
    <p style="color:#4a5568;font-size:15px;margin:10px 0 0;line-height:1.6;">
      Thank you for your order! Your payment has been processed and a maker is being assigned to handle your prints.
      You'll receive another email when your order ships.
    </p>
  </div>
  <div style="padding:24px 32px 0;">
    <h2 style="color:#1a202c;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">🛒 Your Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f7fafc;">
          <th style="padding:8px;text-align:left;color:#718096;font-size:12px;text-transform:uppercase;">Item</th>
          <th style="padding:8px;text-align:left;color:#718096;font-size:12px;text-transform:uppercase;">Specs</th>
          <th style="padding:8px;text-align:center;color:#718096;font-size:12px;text-transform:uppercase;">Qty</th>
          <th style="padding:8px;text-align:right;color:#718096;font-size:12px;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:2px solid #e2e8f0;padding-top:8px;">
      ${shippingRow}
      ${discountRow}
      <tr>
        <td style="padding:10px 0;font-weight:bold;font-size:16px;color:#1a202c;border-top:1px solid #e2e8f0;">Total Paid</td>
        <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:18px;color:#2b6cb0;border-top:1px solid #e2e8f0;">$${totalAmount.toFixed(2)}</td>
      </tr>
    </table>
    ${shippingAddrBlock}
    ${guestAccountBlock}
  </div>
  ${user && totalExpAwarded > 0 ? `<div style="margin:20px 32px 0;background:linear-gradient(135deg,#fffaf0,#feebc8);border:2px solid #f6ad55;border-radius:12px;padding:16px;text-align:center;">
    <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">EXP Earned This Order</p>
    <p style="margin:6px 0 0;color:#78350f;font-size:28px;font-weight:bold;">+${totalExpAwarded} EXP</p>
    ${bonusLines}
  </div>` : ''}
  <div style="padding:20px 32px 0;">
    <div style="background:#ebf8ff;border-radius:10px;padding:16px;">
      <p style="margin:0;color:#2b6cb0;font-size:14px;font-weight:600;margin-bottom:8px;">📋 What Happens Next</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">1. A nearby maker will be assigned to your order</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">2. They'll print your items with care</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">3. Once shipped, you'll get a tracking number by email</p>
      <p style="margin:4px 0;color:#2c5282;font-size:13px;">4. Order is marked complete when delivered to you</p>
    </div>
  </div>
  <div style="padding:24px 32px 32px;text-align:center;">
    <a href="https://ex3dprints.com/ConsumerDashboard" style="background:linear-gradient(135deg,#2b6cb0,#1a365d);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">Track Your Order →</a>
  </div>
  <div style="background:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#718096;font-size:12px;margin:0;">EX3D Prints — Questions? <a href="mailto:labaghr@my.erau.edu" style="color:#2b6cb0;">labaghr@my.erau.edu</a> | 610-858-3200</p>
  </div>
</div>
</body>
</html>`;

            // Use Resend directly for guest orders (may not be in app user list yet)
            const resendApiKey = Deno.env.get('Resend_API');
            if (resendApiKey && isGuest) {
                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'EX3D Prints <noreply@ex3dprints.com>',
                        to: [orderEmail],
                        subject: `Order Confirmed — EX3D Prints #${newOrder.id.slice(-8)}`,
                        html: emailHtml,
                    }),
                });
                const emailData = await emailRes.json();
                console.log('✅ Confirmation email sent (Resend):', emailData.id || JSON.stringify(emailData));
            } else {
                // Service role so this also works from webhook invocations (no user auth)
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: orderEmail,
                    subject: `Order Confirmed — EX3D Prints #${newOrder.id.slice(-8)}`,
                    body: emailHtml
                });
                console.log('✅ Confirmation email sent to:', orderEmail);
            }
        } catch (emailError) {
            console.error('⚠️ Failed to send confirmation email:', emailError);
        }

        // ── Clear DB cart for logged-in users ────────────────────────────────
        // (Guest cart in localStorage is cleared client-side by PaymentSuccess.jsx)
        if (!isGuest) {
            try {
                console.log('Clearing cart...');
                for (const item of cartItems) {
                    if (item.id?.startsWith('recovered_') || item.id?.startsWith('req_')) continue;
                    await base44.asServiceRole.entities.Cart.delete(item.id);
                }
                console.log('✅ Cart cleared');
            } catch (cartError) {
                console.error('⚠️ Failed to clear cart:', cartError);
            }
        }

        console.log('=== Order Creation Complete ===');
        return Response.json({
            success: true,
            order_id: newOrder.id,
            message: 'Order created successfully',
            exp_awarded: totalExpAwarded
        });

    } catch (error) {
        console.error('❌ Payment verification error:', error);
        console.error('Error stack:', error.stack);
        return Response.json({
            error: 'Failed to verify payment and create order',
            details: error.message
        }, { status: 500 });
    }
});