import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = await req.json();
        if (!orderId) {
            return Response.json({ error: 'Order ID required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        const orderRows = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        const order = orderRows?.[0];
        if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!['shipped', 'completed', 'dropped_off', 'delivered'].includes(order.status)) {
            return Response.json({
                error: 'Order must be shipped/completed/delivered before transfer',
                status: order.status,
            }, { status: 400 });
        }

        if (!order.maker_id) {
            return Response.json({ error: 'No maker assigned to order' }, { status: 400 });
        }

        // Find the maker user
        const allUsers = await base44.asServiceRole.entities.User.list();
        const maker = allUsers.find(u => u.maker_id === order.maker_id);

        if (!maker) {
            return Response.json({ error: 'Maker not found' }, { status: 404 });
        }

        // Support both field names
        const makerAccountId = maker.stripe_connect_account_id || maker.stripe_account_id;
        if (!makerAccountId) {
            return Response.json({
                error: 'Maker has not connected their Stripe account',
                maker_email: maker.email,
            }, { status: 400 });
        }

        // Calculate transfer amount: 50% of items total (shipping excluded)
        const itemsTotal = (order.items || []).reduce((s, item) => s + (item.total_price || 0), 0);
        const transferAmount = itemsTotal * 0.5;
        const transferAmountCents = Math.round(transferAmount * 100);

        if (transferAmountCents <= 0) {
            return Response.json({ error: 'Transfer amount must be greater than 0' }, { status: 400 });
        }

        const transfer = await stripe.transfers.create({
            amount: transferAmountCents,
            currency: 'usd',
            destination: makerAccountId,
            description: `Order #${order.id.slice(-8)} — ${order.items.length} item(s)`,
            metadata: {
                order_id: order.id,
                maker_id: maker.maker_id,
            },
        });

        console.log('✅ Transfer created:', transfer.id, 'Amount:', transferAmount);

        await base44.asServiceRole.entities.Order.update(orderId, {
            stripe_transfer_id: transfer.id,
            maker_payout_amount: transferAmount,
            maker_payout_date: new Date().toISOString(),
        });

        // Notify maker
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: maker.email,
            subject: '💰 Payment Transferred — EX3D Prints',
            body: `Hi ${maker.full_name},\n\nPayment for order #${order.id.slice(-8)} has been transferred to your account.\n\nItems Total: $${itemsTotal.toFixed(2)}\nYour Share (50%): $${transferAmount.toFixed(2)}\n\nFunds appear within 2-3 business days.\nTransfer ID: ${transfer.id}\n\nThank you!\nThe EX3D Team`,
        }).catch(e => console.error('Failed to send payout email:', e));

        return Response.json({
            success: true,
            transfer_id: transfer.id,
            amount: transferAmount,
            maker_email: maker.email,
        });

    } catch (error) {
        console.error('Transfer error:', error);
        return Response.json({
            error: 'Failed to create transfer',
            details: error.message,
        }, { status: 500 });
    }
});