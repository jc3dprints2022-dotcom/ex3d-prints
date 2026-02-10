import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Must be a maker
        if (!user.maker_id || !user.business_roles?.includes('maker')) {
            return Response.json({ error: 'Only makers can connect Stripe accounts' }, { status: 403 });
        }

        const stripeKey = Deno.env.get('Stripe_Secret_Key');
        if (!stripeKey) {
            return Response.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
        });

        let accountId = user.stripe_connect_account_id;

        // Create Stripe Connect account if doesn't exist
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
                    maker_id: user.maker_id
                }
            });

            accountId = account.id;

            // Save account ID to user
            await base44.asServiceRole.entities.User.update(user.id, {
                stripe_connect_account_id: accountId
            });

            console.log('Created Stripe Connect account:', accountId);
        }

        // Create onboarding link
        const { url: onboardingUrl } = await req.json().catch(() => ({ url: null }));
        
        const returnUrl = onboardingUrl || `${new URL(req.url).origin}/dashboard?stripe_onboarding=success`;
        const refreshUrl = onboardingUrl || `${new URL(req.url).origin}/dashboard?stripe_onboarding=refresh`;

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });

        return Response.json({ 
            success: true,
            onboarding_url: accountLink.url,
            account_id: accountId
        });

    } catch (error) {
        console.error('Stripe Connect onboarding error:', error);
        return Response.json({ 
            error: 'Failed to create onboarding link',
            details: error.message 
        }, { status: 500 });
    }
});