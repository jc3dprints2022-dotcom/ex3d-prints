import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, planType, amount, isSubscription, billingCycle } = await req.json();

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    const successUrl = `${req.headers.get('origin')}/pages/PaymentSuccess?subscription_id=${subscriptionId}`;
    const cancelUrl = `${req.headers.get('origin')}/pages/BusinessSubscriptions`;

    if (isSubscription) {
      // Create subscription checkout
      const interval = billingCycle === 'yearly' ? 'year' : 'month';
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Business Subscription - ${planType}`,
              description: 'Custom pediatric engagement rewards'
            },
            unit_amount: Math.round(amount * 100),
            recurring: { interval }
          },
          quantity: 1
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          subscription_id: subscriptionId,
          user_id: user.id,
          plan_type: planType
        }
      });

      return Response.json({ url: session.url, sessionId: session.id });
    } else {
      // One-time payment
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Bulk Purchase - ${planType}`,
              description: 'Custom pediatric engagement rewards'
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          subscription_id: subscriptionId,
          user_id: user.id,
          plan_type: planType
        }
      });

      return Response.json({ url: session.url, sessionId: session.id });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});