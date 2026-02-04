import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.business_roles?.includes('designer')) {
      return Response.json({ error: 'Only designers can redeem boost rewards' }, { status: 403 });
    }

    const { productId, boostWeeks } = await req.json();

    if (!productId || !boostWeeks) {
      return Response.json({ error: 'Product ID and boost weeks required' }, { status: 400 });
    }

    const expCost = Math.ceil(boostWeeks * 350);

    if ((user.exp_points || 0) < expCost) {
      return Response.json({ 
        error: `Insufficient EXP. Need ${expCost} EXP, but you have ${user.exp_points || 0} EXP.` 
      }, { status: 400 });
    }

    // Deduct EXP
    await base44.asServiceRole.entities.User.update(user.id, {
      exp_points: (user.exp_points || 0) - expCost
    });

    // Log transaction
    await base44.asServiceRole.entities.ExpTransaction.create({
      user_id: user.id,
      action: 'spent',
      amount: expCost,
      source: 'boost_purchase',
      description: `Boost listing for ${boostWeeks} week${boostWeeks > 1 ? 's' : ''}`
    });

    // Activate boost
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + (boostWeeks * 7));

    await base44.asServiceRole.entities.Product.update(productId, {
      is_boosted: true,
      boost_start_date: now.toISOString(),
      boost_end_date: endDate.toISOString(),
      boost_duration_weeks: boostWeeks,
      boost_pending_payment: false
    });

    return Response.json({
      success: true,
      message: `Boost activated for ${boostWeeks} weeks using ${expCost} EXP`,
      exp_cost: expCost
    });
  } catch (error) {
    console.error('Boost redemption error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});