import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId, cancellationReason } = await req.json();

        if (!orderId || !cancellationReason) {
            return Response.json({ 
                error: 'Order ID and cancellation reason are required' 
            }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), {
            apiVersion: '2023-10-16',
        });

        // Get the order
        const order = await base44.asServiceRole.entities.Order.get(orderId);

        // Verify the order belongs to the user
        if (order.customer_id !== user.id) {
            return Response.json({ 
                error: 'You can only cancel your own orders' 
            }, { status: 403 });
        }

        // Check if order can be cancelled (only pending/accepted orders)
        if (!['pending', 'accepted'].includes(order.status)) {
            return Response.json({ 
                error: `Cannot cancel order with status: ${order.status}` 
            }, { status: 400 });
        }

        // Refund the payment if it exists
        if (order.payment_intent_id && order.payment_status === 'paid') {
            try {
                console.log('Refunding payment intent:', order.payment_intent_id);
                const refund = await stripe.refunds.create({
                    payment_intent: order.payment_intent_id,
                    reason: 'requested_by_customer',
                    metadata: {
                        order_id: orderId,
                        customer_id: user.id,
                        cancellation_reason: cancellationReason
                    }
                });
                console.log('Refund created:', refund.id);
                
                // Update order with refund info
                await base44.asServiceRole.entities.Order.update(orderId, {
                    status: 'cancelled',
                    payment_status: 'refunded',
                    notes: `Cancelled by customer. Reason: ${cancellationReason}`,
                    cancellation_reason: cancellationReason
                });
            } catch (refundError) {
                console.error('Refund failed:', refundError);
                // Still cancel the order but log the refund failure
                await base44.asServiceRole.entities.Order.update(orderId, {
                    status: 'cancelled',
                    notes: `Cancelled by customer (refund failed: ${refundError.message}). Reason: ${cancellationReason}`,
                    cancellation_reason: cancellationReason
                });
                
                return Response.json({ 
                    success: false,
                    error: 'Order cancelled but refund failed. Please contact support.',
                    refund_error: refundError.message
                }, { status: 500 });
            }
        } else {
            // No payment to refund, just cancel the order
            await base44.asServiceRole.entities.Order.update(orderId, {
                status: 'cancelled',
                notes: `Cancelled by customer. Reason: ${cancellationReason}`,
                cancellation_reason: cancellationReason
            });
        }

        // Notify the maker if assigned
        if (order.maker_id) {
            try {
                const allUsers = await base44.asServiceRole.entities.User.list();
                const maker = allUsers.find(u => u.maker_id === order.maker_id);
                
                if (maker && maker.email) {
                    await base44.integrations.Core.SendEmail({
                        to: maker.email,
                        subject: '🚫 Order Cancelled by Customer - EX3D Prints',
                        body: `Hi ${maker.full_name},

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️ ORDER CANCELLATION NOTICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order #${orderId.slice(-8)} has been cancelled by the customer.

Order Total: $${order.total_amount?.toFixed(2)}
Your Lost Earnings: $${(((order.total_amount * 0.7) - 0.30) + (order.is_priority ? 2.80 : 0)).toFixed(2)}

Cancellation Reason:
${cancellationReason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️ ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you've already started printing this order:
• STOP printing immediately
• Do not continue work on this order
• The customer has been refunded

If you haven't started:
• No action needed
• This order will be removed from your dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
The EX3D Team`
                    });
                }
            } catch (emailError) {
                console.error('Failed to notify maker:', emailError);
            }
        }

        // Send confirmation email to customer
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: '✅ Order Cancellation Confirmed - EX3D Prints',
                body: `Hi ${user.full_name},

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ORDER CANCELLATION CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your order #${orderId.slice(-8)} has been successfully cancelled and refunded.

Order Details:
${order.items?.map(item => `• ${item.product_name} (x${item.quantity})`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💰 REFUND INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Refund Amount:      $${order.total_amount?.toFixed(2)}
Processing Time:    5-10 business days
Refund Method:      Original payment method

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The refund will appear in your account within 5-10 business days.

Need help? Contact us at support@ex3dprints.com

Best regards,
The EX3D Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
        }

        return Response.json({ 
            success: true,
            message: 'Order cancelled and refunded successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        return Response.json({ 
            error: 'Failed to cancel order',
            details: error.message 
        }, { status: 500 });
    }
});