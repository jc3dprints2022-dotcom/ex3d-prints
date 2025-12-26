import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        console.log('=== Verify Payment and Create Order Started ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('User not authenticated');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('User authenticated:', user.email);

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

        // Verify the session belongs to this user
        if (session.metadata.user_id !== user.id) {
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

        // Get cart items from database
        console.log('Fetching cart items for user:', user.id);
        const cartItems = await base44.asServiceRole.entities.Cart.filter({ user_id: user.id });
        console.log('Cart items found:', cartItems.length);

        if (cartItems.length === 0) {
            console.error('Cart is empty');
            return Response.json({ error: 'Cart is empty' }, { status: 400 });
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

        // Create the order
        console.log('Creating order...');
        const isPriority = session.metadata.is_priority === 'true';
        const campusLocation = session.metadata.campus_location || 'erau_prescott';
        
        // Update user's campus location if not set
        if (!user.campus_location && campusLocation) {
            await base44.asServiceRole.entities.User.update(user.id, {
                campus_location: campusLocation
            });
        }
        
        const newOrder = await base44.asServiceRole.entities.Order.create({
            customer_id: user.id,
            items: enrichedItems,
            total_amount: totalAmount,
            delivery_option: 'campus_pickup',
            pickup_location: 'Contact: labaghr@my.erau.edu or 610-858-3200',
            status: 'pending',
            payment_status: 'paid',
            payment_intent_id: session.payment_intent,
            stripe_session_id: sessionId,
            is_priority: isPriority,
            campus_location: campusLocation
        });

        console.log('✅ Order created:', newOrder.id);

        // Award EXP points: 5 EXP per dollar spent
        const expFromPurchase = Math.floor(totalAmount * 5);
        console.log('Awarding EXP for purchase:', expFromPurchase);

        // Check if this is user's first order
        const userOrders = await base44.asServiceRole.entities.Order.filter({ customer_id: user.id });
        const isFirstOrder = userOrders.length === 1; // Just created order is the only one

        let totalExpAwarded = expFromPurchase;
        let expDetails = `Purchase: ${expFromPurchase} EXP`;

        // Award 250 EXP for first order
        if (isFirstOrder) {
            totalExpAwarded += 250;
            expDetails += `, First Order Bonus: 250 EXP`;
            console.log('First order bonus: 250 EXP');
        }

        // Award 250 EXP if referral code was used AND this is the first order
        const hasReferral = session.metadata.has_referral === 'true';
        const referrerId = session.metadata.referrer_id;

        if (hasReferral && referrerId && isFirstOrder) {
            totalExpAwarded += 250;
            expDetails += `, Referral Bonus: 250 EXP`;
            console.log('Referral bonus: 250 EXP (first order only)');

            // Award 250 EXP to the referrer ONLY on the referred user's first order
            try {
                const referrer = await base44.asServiceRole.entities.User.get(referrerId);
                if (referrer) {
                    // Check if this referrer has already received EXP for this user
                    const existingReferralTransactions = await base44.asServiceRole.entities.ExpTransaction.filter({
                        user_id: referrer.id,
                        source: 'referral_given',
                        description: { $regex: user.id } // Check if this specific user was already credited
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

        // Update user's EXP points
        await base44.asServiceRole.entities.User.update(user.id, {
            exp_points: (user.exp_points || 0) + totalExpAwarded,
            total_exp_earned: (user.total_exp_earned || 0) + totalExpAwarded
        });

        // Create EXP transaction record
        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: user.id,
            action: 'earned',
            amount: totalExpAwarded,
            source: 'purchase',
            order_id: newOrder.id,
            description: expDetails
        });

        console.log('✅ Total EXP awarded:', totalExpAwarded);

        // If order contains custom requests, DON'T update their status - keep them available for re-purchase
        // Custom requests now stay as "accepted" for 30 days from acceptance date

        // Assign to maker
        try {
            console.log('Assigning order to maker...');
            await base44.functions.invoke('assignOrderToMaker', { 
                orderId: newOrder.id,
                assignToMultiple: false
            });
            console.log('✅ Order assigned to maker');
        } catch (assignError) {
            console.error('⚠️ Maker assignment failed:', assignError);
        }

        // Send confirmation email to customer
        try {
            console.log('Sending confirmation email to customer...');
            const itemsList = enrichedItems.map((item, idx) => 
                `${idx + 1}. ${item.product_name} (x${item.quantity}) - ${item.selected_material} / ${item.selected_color}${item.custom_request_id ? ' [Custom Quote]' : ''}`
            ).join('\n');

            const discountInfo = session.total_details?.amount_discount 
                ? `\nDiscount Applied: -$${(session.total_details.amount_discount / 100).toFixed(2)}`
                : '';

            const priorityInfo = isPriority ? '\n\n⚡ PRIORITY OVERNIGHT DELIVERY\nYour order will be completed by the next day!' : '';

            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `Order Confirmed${isPriority ? ' - PRIORITY OVERNIGHT' : ''} - EX3D Prints`,
                body: `Hi ${user.full_name},

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ ORDER CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for your order! Your payment has been processed successfully and your order has been sent to a maker on your campus.${priorityInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order #${newOrder.id.slice(-8)}

Items:
${itemsList}
${discountInfo}
Total Paid: $${totalAmount.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⭐ EXP POINTS EARNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isFirstOrder ? '🎉 First Order Bonus: +250 EXP\n' : ''}${hasReferral && isFirstOrder ? '🎉 Referral Bonus: +250 EXP\n' : ''}Purchase Reward: +${expFromPurchase} EXP
────────────────────────
Total EXP Earned: ${totalExpAwarded} EXP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📍 PICKUP INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your order is now being prepared by a maker at your campus. We will notify you with updates as your order progresses.

Contact: labaghr@my.erau.edu or 610-858-3200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for choosing EX3D Prints!

Best regards,
The EX3D Team`
            });
            console.log('✅ Confirmation email sent to customer');
        } catch (emailError) {
            console.error('⚠️ Failed to send confirmation email:', emailError);
        }

        // Clear user's cart
        try {
            console.log('Clearing cart...');
            for (const item of cartItems) {
                await base44.asServiceRole.entities.Cart.delete(item.id);
            }
            console.log('✅ Cart cleared');
        } catch (cartError) {
            console.error('⚠️ Failed to clear cart:', cartError);
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