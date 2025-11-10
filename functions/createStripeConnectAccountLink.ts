import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
    console.log('=== Starting createStripeConnectAccountLink ===');
    
    try {
        // First verify authentication
        const base44 = createClientFromRequest(req);
        let user;
        
        try {
            user = await base44.auth.me();
            console.log('User authenticated:', user?.id, user?.email);
        } catch (authError) {
            console.error('Authentication failed:', authError);
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user) {
            console.error('No user found after authentication');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        let requestBody;
        try {
            requestBody = await req.json();
            console.log('Request body parsed:', { userId: requestBody.userId, hasReturnUrl: !!requestBody.returnUrl });
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { userId, returnUrl, refreshUrl } = requestBody;

        // Verify the user is requesting for themselves
        if (userId !== user.id) {
            console.error('User ID mismatch:', userId, 'vs', user.id);
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check Stripe key
        const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
        if (!STRIPE_SECRET_KEY) {
            console.error('Stripe secret key not configured');
            return Response.json({ 
                error: 'Stripe not configured on server' 
            }, { status: 500 });
        }
        console.log('Stripe key found');

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });

        let accountId = user.stripe_account_id;
        console.log('Existing Stripe account ID:', accountId);

        // If user doesn't have a Stripe account yet, create one
        if (!accountId) {
            console.log('Creating new Stripe Connect account...');
            
            try {
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
                        app: 'ex3dprints'
                    }
                });

                accountId = account.id;
                console.log('Stripe account created:', accountId);

                // Save the Stripe account ID to the user
                try {
                    await base44.auth.updateMe({
                        stripe_account_id: accountId
                    });
                    console.log('Stripe account ID saved to user');
                } catch (updateError) {
                    console.error('Failed to save Stripe account ID to user:', updateError);
                    // Continue anyway since we have the account ID
                }
            } catch (accountError) {
                console.error('Stripe account creation failed:', accountError);
                console.error('Error details:', JSON.stringify(accountError, null, 2));
                return Response.json({ 
                    error: 'Failed to create Stripe account: ' + (accountError.message || 'Unknown error'),
                    details: accountError.type || 'unknown'
                }, { status: 500 });
            }
        } else {
            console.log('Using existing Stripe account:', accountId);
        }

        // Create an account link for onboarding
        console.log('Creating account link...');
        try {
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl || returnUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            console.log('Account link created successfully');

            return Response.json({ 
                success: true,
                url: accountLink.url 
            });
        } catch (linkError) {
            console.error('Failed to create account link:', linkError);
            console.error('Link error details:', JSON.stringify(linkError, null, 2));
            return Response.json({ 
                error: 'Failed to create account link: ' + (linkError.message || 'Unknown error'),
                details: linkError.type || 'unknown'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Unexpected error in createStripeConnectAccountLink:', error);
        console.error('Error stack:', error.stack);
        return Response.json({ 
            error: error.message || 'An unexpected error occurred',
            type: error.type || 'unknown'
        }, { status: 500 });
    }
});