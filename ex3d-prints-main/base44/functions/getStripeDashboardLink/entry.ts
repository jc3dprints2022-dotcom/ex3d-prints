import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.11.0';

// Returns a Stripe Express dashboard login link.
// Works for both makers and designers — checks both account ID fields.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Support both field names for backwards compatibility
        const accountId = user.stripe_connect_account_id || user.stripe_account_id;

        if (!accountId) {
            return Response.json({ error: 'No Stripe account connected' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        const loginLink = await stripe.accounts.createLoginLink(accountId);

        return Response.json({ url: loginLink.url });

    } catch (error) {
        console.error('getStripeDashboardLink error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});