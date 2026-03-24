import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user already has a referral code
        if (user.referral_code) {
            return Response.json({ 
                success: true,
                referral_code: user.referral_code 
            });
        }

        // Generate unique referral code
        const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = 'EX3D-';
            for (let i = 0; i < 7; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        let referralCode = generateCode();
        let isUnique = false;
        let attempts = 0;

        // Ensure uniqueness
        while (!isUnique && attempts < 10) {
            const allUsers = await base44.asServiceRole.entities.User.list();
            const existingCode = allUsers.find(u => u.referral_code === referralCode);
            
            if (!existingCode) {
                isUnique = true;
            } else {
                referralCode = generateCode();
                attempts++;
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate unique referral code');
        }

        // Update user with referral code
        await base44.auth.updateMe({ referral_code: referralCode });

        return Response.json({ 
            success: true,
            referral_code: referralCode 
        });

    } catch (error) {
        console.error('Generate referral code error:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate referral code' 
        }, { status: 500 });
    }
});