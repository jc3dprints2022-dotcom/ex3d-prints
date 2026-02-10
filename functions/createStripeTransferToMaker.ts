import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin-only function
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { orderId } = await req.json();
        
        if (!orderId) {
            return Response.json({ error: 'Order ID required' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        // Get order details
        const order = await base44.asServiceRole.entities.Order.get(orderId);
        if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only transfer for completed/delivered orders
        if (!['completed', 'dropped_off', 'delivered'].includes(order.status)) {
            return Response.json({ 
                error: 'Order must be completed/delivered before transfer',
                status: order.status 
            }, { status: 400 });
        }

        // Get maker details
        if (!order.maker_id) {
            return Response.json({ error: 'No maker assigned to order' }, { status: 400 });
        }

        const allUsers = await base44.asServiceRole.entities.User.list();
        const maker = allUsers.find(u => u.maker_id === order.maker_id);
        
        if (!maker) {
            return Response.json({ error: 'Maker not found' }, { status: 404 });
        }

        if (!maker.stripe_connect_account_id) {
            return Response.json({ 
                error: 'Maker has not connected their Stripe account',
                maker_email: maker.email 
            }, { status: 400 });
        }

        // Calculate transfer amount: 70% - $0.30 Stripe fee + priority bonus
        const platformFee = order.total_amount * 0.30;
        const stripeFee = 0.30;
        const priorityBonus = order.is_priority ? 2.80 : 0;
        const transferAmount = (order.total_amount * 0.70) - stripeFee + priorityBonus;

        // Stripe requires amounts in cents
        const transferAmountCents = Math.round(transferAmount * 100);

        // Create transfer to maker's connected account
        const transfer = await stripe.transfers.create({
            amount: transferAmountCents,
            currency: 'usd',
            destination: maker.stripe_connect_account_id,
            description: `Order #${order.id.slice(-8)} - ${order.items.length} item(s)`,
            metadata: {
                order_id: order.id,
                maker_id: maker.maker_id,
                platform_fee: platformFee.toFixed(2),
                priority_bonus: priorityBonus.toFixed(2)
            }
        });

        console.log('✅ Transfer created:', transfer.id, 'Amount:', transferAmount);

        // Update order with transfer info
        await base44.asServiceRole.entities.Order.update(orderId, {
            stripe_transfer_id: transfer.id,
            maker_payout_amount: transferAmount,
            maker_payout_date: new Date().toISOString()
        });

        // Notify maker
        try {
            await base44.integrations.Core.SendEmail({
                to: maker.email,
                subject: '💰 Payment Received - EX3D Prints',
                body: `Hi ${maker.full_name},

Great news! Payment for order #${order.id.slice(-8)} has been transferred to your account.

💰 PAYMENT DETAILS:
Order Total: $${order.total_amount.toFixed(2)}
Platform Fee (30%): -$${platformFee.toFixed(2)}
Stripe Fee: -$${stripeFee.toFixed(2)}${order.is_priority ? `\nPriority Bonus: +$${priorityBonus.toFixed(2)}` : ''}
────────────────────────
TRANSFERRED: $${transferAmount.toFixed(2)}

The funds should appear in your connected bank account within 2-3 business days.

Transfer ID: ${transfer.id}

Thank you for being an awesome maker!

Best regards,
The EX3D Team`
            });
        } catch (emailError) {
            console.error('Failed to send payout email:', emailError);
        }

        return Response.json({ 
            success: true,
            transfer_id: transfer.id,
            amount: transferAmount,
            maker_email: maker.email
        });

    } catch (error) {
        console.error('Transfer error:', error);
        return Response.json({ 
            error: 'Failed to create transfer',
            details: error.message 
        }, { status: 500 });
    }
});