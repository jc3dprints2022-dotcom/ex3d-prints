import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.stripe_connect_account_id) {
            return Response.json({ error: 'No Stripe account found' }, { status: 400 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        const loginLink = await stripe.accounts.createLoginLink(user.stripe_connect_account_id);

        return Response.json({ url: loginLink.url });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});