import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.11.0';

// Checks Stripe Connect account status. Works for both makers and designers.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ connected: false, charges_enabled: false, payouts_enabled: false });
        }

        // Support both field names
        const accountId = user.stripe_connect_account_id || user.stripe_account_id;

        if (!accountId) {
            return Response.json({ connected: false, charges_enabled: false, payouts_enabled: false });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        const account = await stripe.accounts.retrieve(accountId);

        // If retrieved successfully, ensure both fields are in sync
        if (account.id && !user.stripe_connect_account_id) {
            await base44.asServiceRole.entities.User.update(user.id, {
                stripe_connect_account_id: account.id,
            });
        }

        return Response.json({
            connected: true,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements,
        });

    } catch (error) {
        console.error('checkStripeAccountStatus error:', error);
        return Response.json({ connected: false, error: error.message }, { status: 500 });
    }
});