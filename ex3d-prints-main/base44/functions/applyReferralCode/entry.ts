import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { referral_code } = await req.json();

        if (!referral_code) {
            return Response.json({ error: 'Referral code is required' }, { status: 400 });
        }

        // Check if user already used a referral code
        if (user.referred_by) {
            return Response.json({ 
                error: 'You have already used a referral code' 
            }, { status: 400 });
        }

        // Find referrer by code
        const allUsers = await base44.asServiceRole.entities.User.list();
        const referrer = allUsers.find(u => u.referral_code === referral_code.toUpperCase());

        if (!referrer) {
            return Response.json({ 
                error: 'Invalid referral code' 
            }, { status: 400 });
        }

        if (referrer.id === user.id) {
            return Response.json({ 
                error: 'You cannot use your own referral code' 
            }, { status: 400 });
        }

        // Fixed bonuses
        const referrerBonus = 250; // Referrer gets 250 EXP
        const newUserBonus = 100; // New user gets 100 EXP

        // Update referrer's EXP and referral count
        await base44.asServiceRole.entities.User.update(referrer.id, {
            exp_points: (referrer.exp_points || 0) + referrerBonus,
            referral_count: (referrer.referral_count || 0) + 1,
            total_exp_earned: (referrer.total_exp_earned || 0) + referrerBonus
        });

        // Update new user's EXP and referred_by
        await base44.auth.updateMe({
            referred_by: referrer.id,
            exp_points: (user.exp_points || 0) + newUserBonus,
            total_exp_earned: (user.total_exp_earned || 0) + newUserBonus
        });

        // Log transactions for both users
        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: referrer.id,
            action: 'earned',
            amount: referrerBonus,
            source: 'referral_given',
            description: `Referral bonus for referring ${user.full_name}`
        });

        await base44.asServiceRole.entities.ExpTransaction.create({
            user_id: user.id,
            action: 'earned',
            amount: newUserBonus,
            source: 'referral_received',
            description: `Welcome bonus from referral code ${referral_code}`
        });

        return Response.json({ 
            success: true,
            exp_earned: newUserBonus,
            message: `You earned ${newUserBonus} EXP from referral!`
        });

    } catch (error) {
        console.error('Apply referral code error:', error);
        return Response.json({ 
            error: error.message || 'Failed to apply referral code' 
        }, { status: 500 });
    }
});