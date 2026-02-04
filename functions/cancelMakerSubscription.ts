import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.stripe_subscription_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Cancel the subscription at period end (so they keep access until billing cycle ends)
    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update user record
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_status: 'cancelling'
    });

    return Response.json({ 
      success: true,
      message: 'Subscription will cancel at the end of your billing period',
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});