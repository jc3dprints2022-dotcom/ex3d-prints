import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('Stripe_Secret_Key'), { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cartItems, deliveryMethod, recurringEnabled, frequency, businessInfo, bulkDiscount, total } = await req.json();

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: businessInfo.businessName,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    const origin = new URL(req.url).origin;

    if (recurringEnabled) {
      // Create subscription
      const lineItems = cartItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.product_name || 'Product' },
          unit_amount: Math.round(item.unit_price * 100),
          recurring: {
            interval: frequency === 'weekly' ? 'week' : frequency === 'biweekly' ? 'week' : 'month',
            interval_count: frequency === 'biweekly' ? 2 : 1
          }
        },
        quantity: item.quantity
      }));

      // Apply bulk discount as a coupon
      let coupon = null;
      if (bulkDiscount > 0) {
        const discountPercent = bulkDiscount / (total + bulkDiscount) * 100;
        coupon = await stripe.coupons.create({
          percent_off: Math.round(discountPercent),
          duration: 'repeating',
          duration_in_months: 12,
          name: `Bulk Discount ${Math.round(discountPercent)}%`
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: lineItems,
        discounts: coupon ? [{ coupon: coupon.id }] : [],
        success_url: `${origin}${'/payment-success'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${'/business/cart'}`,
        metadata: {
          user_id: user.id,
          marketplace_type: 'business',
          recurring: 'true',
          frequency,
          delivery_method: deliveryMethod,
          bulk_discount: bulkDiscount.toString()
        }
      });

      return Response.json({ url: session.url });
    } else {
      // One-time checkout
      const lineItems = cartItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.product_name || 'Product' },
          unit_amount: Math.round(item.unit_price * 100)
        },
        quantity: item.quantity
      }));

      // Add discount as a negative line item
      if (bulkDiscount > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Bulk Discount' },
            unit_amount: -Math.round(bulkDiscount * 100)
          },
          quantity: 1
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: lineItems,
        success_url: `${origin}${'/payment-success'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${'/business/cart'}`,
        metadata: {
          user_id: user.id,
          marketplace_type: 'business',
          delivery_method: deliveryMethod,
          bulk_discount: bulkDiscount.toString()
        }
      });

      return Response.json({ url: session.url });
    }
  } catch (error) {
    console.error('Business checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});