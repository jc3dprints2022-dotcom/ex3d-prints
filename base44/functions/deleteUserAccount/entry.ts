import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user's data
    try {
      // Delete cart items
      const cartItems = await base44.asServiceRole.entities.Cart.filter({ user_id: user.id });
      for (const item of cartItems) {
        await base44.asServiceRole.entities.Cart.delete(item.id);
      }

      // Delete orders (mark as cancelled instead of deleting)
      const orders = await base44.asServiceRole.entities.Order.filter({ customer_id: user.id });
      for (const order of orders) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'cancelled',
          cancellation_reason: 'Account deleted by user'
        });
      }

      // Delete EXP transactions
      const transactions = await base44.asServiceRole.entities.ExpTransaction.filter({ user_id: user.id });
      for (const tx of transactions) {
        await base44.asServiceRole.entities.ExpTransaction.delete(tx.id);
      }

      // Delete user account
      await base44.asServiceRole.entities.User.delete(user.id);

      return Response.json({ 
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Account deletion error:', error);
      return Response.json({ 
        error: 'Failed to delete account data',
        details: error.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});