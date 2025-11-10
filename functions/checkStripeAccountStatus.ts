import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
    console.log('=== Checking Stripe Account Status ===');
    
    try {
        const base44 = createClientFromRequest(req);
        let user;
        
        try {
            user = await base44.auth.me();
            console.log('User authenticated:', user?.id);
        } catch (authError) {
            console.log('User not authenticated');
            return Response.json({ 
                connected: false,
                charges_enabled: false,
                payouts_enabled: false
            });
        }

        if (!user || !user.stripe_account_id) {
            console.log('No Stripe account ID found for user');
            return Response.json({ 
                connected: false,
                charges_enabled: false,
                payouts_enabled: false
            });
        }

        console.log('Checking Stripe account:', user.stripe_account_id);

        const STRIPE_SECRET_KEY = Deno.env.get('Stripe_Secret_Key');
        if (!STRIPE_SECRET_KEY) {
            console.error('Stripe secret key not configured');
            return Response.json({ 
                error: 'Stripe not configured' 
            }, { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });

        try {
            const account = await stripe.accounts.retrieve(user.stripe_account_id);
            console.log('Account status:', {
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted
            });

            return Response.json({
                connected: true,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted,
                requirements: account.requirements
            });
        } catch (retrieveError) {
            console.error('Failed to retrieve Stripe account:', retrieveError);
            return Response.json({ 
                connected: false,
                error: retrieveError.message 
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Error checking Stripe account status:', error);
        return Response.json({ 
            connected: false,
            error: error.message 
        }, { status: 500 });
    }
});