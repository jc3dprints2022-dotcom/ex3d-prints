import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Check if user already has a Stripe account
        if (user.stripe_account_id) {
            return Response.json({ 
                success: true,
                accountId: user.stripe_account_id 
            });
        }

        // Create a new connected account
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: user.email,
            capabilities: {
                transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: {
                user_id: user.id,
                maker_id: user.maker_id || '',
                app: 'ex3dprints'
            }
        });

        // Save the Stripe account ID to the user
        await base44.auth.updateMe({
            stripe_account_id: account.id
        });

        return Response.json({ 
            success: true,
            accountId: account.id 
        });

    } catch (error) {
        console.error('Error creating connected account:', error);
        return Response.json({ 
            error: error.message || 'Failed to create connected account' 
        }, { status: 500 });
    }
});