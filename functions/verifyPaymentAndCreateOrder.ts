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
                        description: customRequest.description, // Add description
                        quantity: item.quantity,
                        selected_material: item.selected_material,
                        selected_color: item.selected_color,
                        selected_resolution: item.selected_resolution || 0.2,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        print_files: customRequest.files || [],
                        print_time_hours: customRequest.print_time_hours,
                        weight_grams: customRequest.weight_grams,
                        dimensions: customRequest.dimensions,
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
            is_priority: isPriority
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
            console.log('Sending confirmation email...');
            const itemsList = enrichedItems.map((item, idx) => 
                `<tr style="page-break-inside: avoid;">
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                        <strong style="display: block; margin-bottom: 4px;">${item.product_name}</strong>
                        <span style="color: #6b7280; font-size: 14px; display: block;">Qty: ${item.quantity} | ${item.selected_material} / ${item.selected_color}</span>
                        ${item.custom_request_id ? '<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;">Custom Quote</span>' : ''}
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top; white-space: nowrap;">
                        $${item.total_price.toFixed(2)}
                    </td>
                </tr>`
            ).join('');

            const discountRow = session.total_details?.amount_discount 
                ? `<tr>
                    <td style="padding: 12px; color: #059669;"><strong>Discount Applied</strong></td>
                    <td style="padding: 12px; text-align: right; color: #059669;"><strong>-$${(session.total_details.amount_discount / 100).toFixed(2)}</strong></td>
                </tr>`
                : '';

            const priorityBanner = isPriority ? `
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <h2 style="margin: 0; font-size: 24px;">⚡ PRIORITY OVERNIGHT DELIVERY</h2>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Your order will be completed by the next day!</p>
                </div>` : '';

            const expBonuses = [];
            if (isFirstOrder) expBonuses.push('🎉 First Order Bonus: +250 EXP');
            if (hasReferral && isFirstOrder) expBonuses.push('🎉 Referral Bonus: +250 EXP');
            const expBonusSection = expBonuses.length > 0 ? `
                <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    ${expBonuses.map(b => `<p style="margin: 5px 0; color: #065f46; font-weight: 600;">${b}</p>`).join('')}
                </div>` : '';

            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `Order Confirmation${isPriority ? ' - PRIORITY OVERNIGHT' : ''} - EX3D Prints`,
                body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
                    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 32px;">Thank You for Your Order!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Order #${newOrder.id.slice(-8)}</p>
                        </div>
                        
                        ${priorityBanner}
                        
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
                                Hi ${user.full_name},
                            </p>
                            <p style="font-size: 14px; color: #6b7280; margin: 0 0 30px 0;">
                                Your payment has been processed successfully. We're excited to bring your prints to life!
                            </p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                ${itemsList}
                                ${discountRow}
                                <tr style="border-top: 2px solid #14b8a6;">
                                    <td style="padding: 16px; font-size: 18px; font-weight: bold;">Total Paid</td>
                                    <td style="padding: 16px; text-align: right; font-size: 18px; font-weight: bold; color: #14b8a6;">$${totalAmount.toFixed(2)}</td>
                                </tr>
                            </table>
                            
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #92400e; font-weight: 600;">🌟 EXP Earned: ${totalExpAwarded} EXP</p>
                                <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">You earn 5 EXP for every dollar spent!</p>
                            </div>
                            
                            ${expBonusSection}
                            
                            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📍 Pickup Information</h3>
                                <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
                                    Contact: <strong>labaghr@my.erau.edu</strong> or <strong>610-858-3200</strong>
                                </p>
                            </div>
                            
                            <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0;">
                                We'll notify you when your order is ready for pickup!
                            </p>
                            
                            <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                    Best regards,<br/>
                                    <strong style="color: #14b8a6;">The EX3D Team</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>`
            });
            console.log('✅ Confirmation email sent to customer');
        } catch (emailError) {
            console.error('⚠️ Failed to send confirmation email:', emailError);
        }

        // Send notification email to maker
        try {
            console.log('Sending new order notification to maker...');
            if (newOrder.maker_id) {
                const maker = await base44.asServiceRole.entities.User.get(newOrder.maker_id);
                if (maker?.email) {
                    const itemsList = enrichedItems.map((item, idx) => 
                        `<tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                <strong>${item.product_name}</strong><br/>
                                <span style="color: #6b7280; font-size: 14px;">Qty: ${item.quantity} | ${item.selected_material} / ${item.selected_color}</span>
                            </td>
                            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                ${item.print_time_hours ? `${item.print_time_hours}h` : 'N/A'}
                            </td>
                        </tr>`
                    ).join('');

                    const priorityBanner = isPriority ? `
                        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <h2 style="margin: 0; font-size: 24px;">⚡ PRIORITY OVERNIGHT ORDER</h2>
                            <p style="margin: 10px 0 0 0; font-size: 16px;">This order must be completed by the next day!</p>
                        </div>` : '';

                    await base44.integrations.Core.SendEmail({
                        to: maker.email,
                        subject: `${isPriority ? '⚡ PRIORITY ' : ''}New Order Assigned - EX3D Prints`,
                        body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
                            <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 32px;">New Order Assigned!</h1>
                                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Order #${newOrder.id.slice(-8)}</p>
                                </div>
                                
                                ${priorityBanner}
                                
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
                                        Hi ${maker.full_name},
                                    </p>
                                    <p style="font-size: 14px; color: #6b7280; margin: 0 0 30px 0;">
                                        A new order has been assigned to you. Please review the details below and start printing!
                                    </p>
                                    
                                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">👤 Customer</h3>
                                        <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
                                            ${user.full_name}<br/>
                                            ${user.email}
                                        </p>
                                    </div>
                                    
                                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                        <tr style="background: #f9fafb;">
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Print Time</th>
                                        </tr>
                                        ${itemsList}
                                    </table>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${window.location.origin}/MakerDashboard" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                            View in Dashboard
                                        </a>
                                    </div>
                                    
                                    <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                            Best regards,<br/>
                                            <strong style="color: #f97316;">The EX3D Team</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>`
                    });
                    console.log('✅ New order notification sent to maker');
                }
            }
        } catch (makerEmailError) {
            console.error('⚠️ Failed to send maker notification:', makerEmailError);
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