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

    const { planId, billingCycle } = await req.json();

    // Define plan pricing (first-time discounted prices)
    const plans = {
      lite: { monthly: 1000, yearly: 7500 }, // $10, $75 first year (25% off $100)
      pro: { monthly: 10000, yearly: 75000 }, // $100, $750 first year (25% off $1000)
      express: { monthly: 25000, yearly: 210000 }, // $250, $2100 first year (25% off $2800)
      unlimited: { monthly: 25000, yearly: 210000 } // $250+, $2100+ first year (25% off $2800)
    };

    const planPricing = plans[planId];
    if (!planPricing) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const amount = billingCycle === 'yearly' ? planPricing.yearly : planPricing.monthly;
    const isFreeFirstMonth = planId === 'lite' && billingCycle === 'monthly';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              description: `${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} Maker Subscription`
            },
            unit_amount: amount,
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year',
              interval_count: 1
            }
          },
          quantity: 1
        }
      ],
      subscription_data: isFreeFirstMonth ? {
        trial_period_days: 30,
        metadata: {
          plan_id: planId,
          billing_cycle: billingCycle
        }
      } : billingCycle === 'yearly' ? {
        billing_cycle_anchor: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        metadata: {
          plan_id: planId,
          billing_cycle: billingCycle
        }
      } : {
        metadata: {
          plan_id: planId,
          billing_cycle: billingCycle
        }
      },
      success_url: `${req.headers.get('origin')}/api/pages/ConsumerDashboard?tab=maker&subscription=success`,
      cancel_url: `${req.headers.get('origin')}/api/pages/MakerSubscriptionSelect?canceled=true`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});