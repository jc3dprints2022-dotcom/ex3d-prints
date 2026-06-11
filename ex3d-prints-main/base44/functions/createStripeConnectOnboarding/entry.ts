import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.11.0';

// Creates or resumes a Stripe Connect Express onboarding session.
// Works for both makers AND designers — uses stripe_connect_account_id as the single source of truth.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        // Use stripe_connect_account_id as the single canonical field.
        // Also check legacy stripe_account_id and migrate if needed.
        let accountId = user.stripe_connect_account_id || user.stripe_account_id || null;

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                metadata: {
                    user_id: user.id,
                    maker_id: user.maker_id || '',
                    designer_id: user.designer_id || '',
                    app: 'ex3dprints',
                },
            });
            accountId = account.id;
            console.log('Created Stripe Connect account:', accountId);
        }

        // Always persist under stripe_connect_account_id
        await base44.asServiceRole.entities.User.update(user.id, {
            stripe_connect_account_id: accountId,
            stripe_account_id: accountId, // keep legacy field in sync
        });

        const appOrigin = Deno.env.get('APP_ORIGIN') || 'https://ex3dprints.com';
        const returnUrl = `${appOrigin}/StripeSetupComplete`;
        const refreshUrl = `${appOrigin}/StripeSetupComplete?refresh=true`;

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });

        return Response.json({
            success: true,
            onboarding_url: accountLink.url,
            account_id: accountId,
        });

    } catch (error) {
        console.error('Stripe Connect onboarding error:', error);
        return Response.json({
            error: 'Failed to create onboarding link',
            details: error.message,
        }, { status: 500 });
    }
});