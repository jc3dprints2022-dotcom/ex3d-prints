import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.stripe_account_id) {
            return Response.json({ error: 'No connected account found' }, { status: 400 });
        }

        const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
        if (!STRIPE_SECRET_KEY) {
            return Response.json({ 
                error: 'Stripe not configured on server' 
            }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2024-11-20.acacia',
        });

        const accountSession = await stripe.accountSessions.create({
            account: user.stripe_account_id,
            components: {
                account_onboarding: { enabled: true },
            },
        });

        return Response.json({ 
            client_secret: accountSession.client_secret 
        });

    } catch (error) {
        console.error('Error creating account session:', error);
        return Response.json({ 
            error: error.message || 'Failed to create account session' 
        }, { status: 500 });
    }
});