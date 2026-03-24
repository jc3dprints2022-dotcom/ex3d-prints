import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a welcome coupon
    if (user.welcome_coupon_code) {
      return Response.json({ 
        couponCode: user.welcome_coupon_code 
      });
    }

    // Generate unique coupon code
    const couponCode = `WELCOME5-${user.id.slice(0, 8).toUpperCase()}`;

    // Create Stripe coupon
    const coupon = await stripe.coupons.create({
      id: couponCode,
      amount_off: 500, // $5 in cents
      currency: 'usd',
      duration: 'once',
      max_redemptions: 1,
      name: 'Welcome Gift - $5 Off',
      metadata: {
        user_id: user.id,
        minimum_amount: '1000' // $10 minimum in cents
      }
    });

    // Update user with coupon code
    await base44.auth.updateMe({
      welcome_coupon_claimed: true,
      welcome_coupon_code: couponCode
    });

    return Response.json({ 
      couponCode: couponCode,
      minimumAmount: 10
    });

  } catch (error) {
    console.error('Error creating welcome coupon:', error);
    return Response.json({ 
      error: 'Failed to create coupon',
      details: error.message 
    }, { status: 500 });
  }
});