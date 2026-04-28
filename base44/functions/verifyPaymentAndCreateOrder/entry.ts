import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        console.log('=== Verify Payment and Create Order Started ===');
        
        const base44 = createClientFromRequest(req);
        // Auth is optional — guests complete checkout without an account.
        const user = await base44.auth.me().catch(() => null);

        console.log(user ? `User authenticated: ${user.email}` : 'Guest checkout (no auth)');

        const { sessionId } = await req.json();

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

        // For logged-in users, verify the session belongs to them.
        // For guests, the session metadata will have user_id = 'guest' — allow it.
        const sessionUserId = session.metadata?.user_id;
        if (user && sessionUserId !== 'guest' && sessionUserId !== user.id) {
            console.error('Session user mismatch');
            return Response.json({ error: 'Session does not belong to this user' }, { status: 403 });
        }

        // Check if payment was successful
        if (session.payment_status !== 'paid') {
            console.error('Payment not completed:', session.payment_status);
            return Response.json({ 
                error: 'Payment not completed',
                payment_status: session.payment_status 
            }, { status: 400 });
        }

        // Check if order already exists for this session (prevent duplicates)
        console.log('Checking for existing orders...');
        const existingOrders = await base44.asServiceRole.entities.Order.filter({ 
            stripe_session_id: sessionId 
        });

        if (existingOrders.length > 0) {
            console.log('Order already exists for this session');
            return Response.json({ 
                success: true,
                message: 'Order already processed',
                order_id: existingOrders[0].id 
            });
        }

        // Get cart items — for logged-in users from DB; for guests, from session metadata
        const isGuest = !user || sessionUserId === 'guest';
        const cartItems = [];

        if (!isGuest) {
            console.log('Fetching cart items for user:', user.id);
            const dbCart = await base44.asServiceRole.entities.Cart.filter({ user_id: user.id });
            console.log('Cart items found:', dbCart.length);
            cartItems.push(...dbCart);
        }

        // If no cart items yet (guest always, or logged-in user with cleared cart), recover from session metadata
        if (cartItems.length === 0) {
            console.warn('Cart is empty — attempting to reconstruct from Stripe session metadata');
            const itemsMeta = session.metadata?.items_json;
            if (!itemsMeta) {
                console.error('Cart is empty and no items_json in session metadata');
                return Response.json({ error: 'Cart is empty and cannot be recovered from session' }, { status: 400 });
            }
            try {
                const parsedItems = JSON.parse(itemsMeta);
                const syntheticUserId = user?.id || session.metadata?.guest_email || 'guest';
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
                console.error('Failed to parse items_json from session metadata:', parseErr);
                return Response.json({ error: 'Cart is empty and items_json could not be parsed' }, { status: 400 });
            }
        }

        // Enrich cart items with full details (products or custom requests)
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
                    // This is a custom request - use service role to get it
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
                } else {
                    // Regular product - use service role to get it
                    console.log('Fetching product:', item.product_id);
                    const product = await base44.asServiceRole.entities.Product.get(item.product_id);
                    console.log('Product found:', product.name);
                    
                    enrichedItems.push({
                        product_id: item.product_id,
                        product_name: product.name,
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
                }
            } catch (error) {
                console.error('Failed to enrich cart item:', item.product_id, error);
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
        const shippingFeeFromMeta = parseFloat(session.metadata?.shipping_fee || 0);
        const amountPaidForItems = totalAmount - shippingFeeFromMeta;
        const makerPayoutAmount = Math.max(0, amountPaidForItems * 0.5);
        console.log('Maker payout amount (50% of paid items):', makerPayoutAmount);

        // Create the order
        console.log('Creating order...');
        const isPriority = session.metadata.is_priority === 'true';
        const campusLocation = session.metadata.campus_location || 'erau_prescott';
        const isLocalDelivery = session.metadata.is_local_delivery === 'true';
        let shippingAddress = null;
        try {
            shippingAddress = session.metadata.shipping_address ? JSON.parse(session.metadata.shipping_address) : null;
        } catch (e) {
            console.error('Failed to parse shipping_address from session metadata:', e);
        }
        
        // Update user's campus location if not set (logged-in only)
        if (user && !user.campus_location && campusLocation) {
            await base44.asServiceRole.entities.User.update(user.id, {
                campus_location: campusLocation
            });
        }

        // Determine the email to use for confirmation
        const orderEmail = user?.email || session.metadata?.guest_email || '';
        const customerName = user?.full_name || shippingAddress?.name || 'Customer';
        
        const newOrder = await base44.asServiceRole.entities.Order.create({
            customer_id: user?.id || null,
            customer_email: orderEmail,
            items: enrichedItems,
            total_amount: totalAmount,
            delivery_option: 'campus_pickup',
            pickup_location: 'Contact: labaghr@my.erau.edu or 610-858-3200',
            status: 'pending',
            payment_status: 'paid',
            payment_intent_id: session.payment_intent,
            stripe_session_id: sessionId,
            is_priority: isPriority,
            campus_location: campusLocation,
            is_local_delivery: isLocalDelivery,
            shipping_address: shippingAddress,
            maker_payout_amount: makerPayoutAmount,
            shipping_cost: shippingFeeFromMeta
        });

        console.log('✅ Order created:', newOrder.id);

        // Award EXP points — only for logged-in users
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

            const hasReferral = session.metadata.has_referral === 'true';
            const referrerId = session.metadata.referrer_id;

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

        // If order contains custom requests, DON'T update their status - keep them available for re-purchase
        // Custom requests now stay as "accepted" for 30 days from acceptance date

        // Assign to maker(s) FIRST — recordOrderEarnings needs maker_id to be set on the order
        try {
            console.log('Assigning order to maker...');
            const totalPrintTime = enrichedItems.reduce((sum, item) => 
                sum + ((item.print_time_hours || 0) * item.quantity), 0
            );
            console.log('Total print time:', totalPrintTime, 'hours');
            
            const assignToMultiple = totalPrintTime > 5;
            
            await base44.functions.invoke('assignOrderToMaker', { 
                orderId: newOrder.id,
                assignToMultiple
            });
            console.log('✅ Order assigned to maker(s)');
        } catch (assignError) {
            console.error('⚠️ Maker assignment failed:', assignError);
        }

        // Record designer royalties + maker earnings AFTER assignment so maker_id is populated
        try {
            await base44.functions.invoke('recordOrderEarnings', { orderId: newOrder.id });
            console.log('✅ Earnings recorded');
        } catch (earningsError) {
            console.error('⚠️ Failed to record earnings:', earningsError);
        }

        // Send confirmation email to customer
        try {
            console.log('Sending confirmation email to customer...');

            const discountAmt = session.total_details?.amount_discount
                ? (session.total_details.amount_discount / 100)
                : 0;
            const shippingFeeDisplay = shippingAddress ? (parseFloat(session.metadata?.shipping_fee || 0)).toFixed(2) : '0.00';

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
                (session.metadata?.has_referral === 'true' && isFirstOrder) ? `<p style="margin:4px 0;color:#276749;font-size:13px;">🎉 <strong>Referral Bonus:</strong> +250 EXP</p>` : ''
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
    <a href="https://jc3dprints.base44.app/ConsumerDashboard" style="background:linear-gradient(135deg,#2b6cb0,#1a365d);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">Track Your Order →</a>
  </div>
  <div style="background:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#718096;font-size:12px;margin:0;">EX3D Prints — Questions? <a href="mailto:labaghr@my.erau.edu" style="color:#2b6cb0;">labaghr@my.erau.edu</a> | 610-858-3200</p>
  </div>
</div>
</body>
</html>`;

            await base44.integrations.Core.SendEmail({
                to: orderEmail,
                subject: `Order Confirmed — EX3D Prints #${newOrder.id.slice(-8)}`,
                body: emailHtml
            });
            console.log('✅ Confirmation email sent to customer');
        } catch (emailError) {
            console.error('⚠️ Failed to send confirmation email:', emailError);
        }

        // Clear user's DB cart (only for logged-in users; guests cart is in localStorage, cleared client-side)
        if (!isGuest) {
            try {
                console.log('Clearing cart...');
                for (const item of cartItems) {
                    // Skip synthetic recovered items — they have no real DB row
                    if (item.id?.startsWith('recovered_')) continue;
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
