import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { orderId, cancellationReason } = await req.json();

        if (!orderId) {
            return Response.json({ error: 'orderId is required' }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), {
            apiVersion: '2023-10-16',
        });

        const orderRows = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        const order = orderRows?.[0];
        if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'cancelled') {
            return Response.json({ error: 'Order is already cancelled' }, { status: 400 });
        }

        let refundId = null;
        let refundError = null;

        // Attempt Stripe refund if order was paid
        if (order.payment_intent_id && order.payment_status === 'paid') {
            try {
                console.log('Issuing refund for payment_intent:', order.payment_intent_id);
                const refund = await stripe.refunds.create({
                    payment_intent: order.payment_intent_id,
                    reason: 'requested_by_customer',
                    metadata: {
                        order_id: orderId,
                        cancelled_by: user.id,
                        cancellation_reason: cancellationReason || 'Admin cancelled',
                    },
                });
                refundId = refund.id;
                console.log('✅ Refund issued:', refundId);
            } catch (err) {
                refundError = err.message;
                console.error('❌ Refund failed:', err.message);
            }
        }

        // Update the order regardless of refund outcome
        await base44.asServiceRole.entities.Order.update(orderId, {
            status: 'cancelled',
            payment_status: refundId ? 'refunded' : order.payment_status,
            cancellation_reason: cancellationReason || 'Cancelled by admin',
            refund_id: refundId || undefined,
            notes: [
                order.notes,
                `Cancelled by admin ${user.email}.`,
                cancellationReason ? `Reason: ${cancellationReason}` : '',
                refundId ? `Refund issued: ${refundId}` : '',
                refundError ? `Refund failed: ${refundError}` : '',
            ].filter(Boolean).join(' | '),
        });

        // Notify maker if assigned
        if (order.maker_id) {
            try {
                const makerUsers = await base44.asServiceRole.entities.User.filter({ maker_id: order.maker_id });
                const maker = makerUsers[0];
                if (maker?.email) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: maker.email,
                        subject: '🚫 Order Cancelled — EX3D Prints',
                        body: `Hi ${maker.full_name || 'Maker'},\n\nOrder #${orderId.slice(-8)} has been cancelled by an admin. Please stop any work on this order immediately.\n\nReason: ${cancellationReason || 'Admin cancelled'}\n\nEX3D Prints Team`,
                    });
                }
            } catch (e) {
                console.warn('Could not notify maker:', e.message);
            }
        }

        // Notify customer if we have their email
        try {
            const customerEmail = order.shipping_address?.email || order.customer_email;
            if (!customerEmail && order.customer_id) {
                const customerUsers = await base44.asServiceRole.entities.User.filter({ id: order.customer_id }).catch(() => []);
                const customer = customerUsers[0];
                if (customer?.email) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: customer.email,
                        subject: '✅ Your Order Has Been Cancelled — EX3D Prints',
                        body: `Hi ${customer.full_name || 'Customer'},\n\nYour order #${orderId.slice(-8)} has been cancelled${refundId ? ' and a full refund has been issued to your original payment method. Please allow 5-10 business days.' : '.'}\n\n${refundError ? 'We were unable to process your refund automatically. Please contact us at labaghr@my.erau.edu.' : ''}\n\nEX3D Prints Team`,
                    });
                }
            }
        } catch (e) {
            console.warn('Could not notify customer:', e.message);
        }

        return Response.json({
            success: true,
            refund_id: refundId,
            refund_error: refundError,
            message: refundId
                ? 'Order cancelled and refund issued successfully'
                : refundError
                    ? `Order cancelled but refund failed: ${refundError}`
                    : 'Order cancelled (no payment to refund)',
        });

    } catch (error) {
        console.error('adminCancelAndRefundOrder error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});