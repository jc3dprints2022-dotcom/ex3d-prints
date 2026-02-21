import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gift } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EmailSignupReward() {
  const [show, setShow] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      
      // Hide if already signed in or already claimed
      if (user) {
        setShow(false);
        return;
      }
      
      // Check localStorage to see if dismissed
      const dismissed = localStorage.getItem('email_signup_dismissed');
      if (dismissed) {
        setShow(false);
        return;
      }
      
      setShow(true);
    } catch (error) {
      setShow(false);
    }
  };

  const handleClick = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      
      if (!user) {
        // Not logged in - redirect to sign up
        toast({
          title: "Sign Up to Get $5 Off! 🎁",
          description: "Create an account to claim your welcome reward.",
          duration: 3000
        });
        
        setTimeout(() => {
          base44.auth.redirectToLogin(window.location.href);
        }, 1000);
        return;
      }
      
      // User is logged in - check if already claimed
      if (user.email_signup_coupon_claimed) {
        toast({
          title: "Already Claimed! ✓",
          description: "You've already received your $5 welcome reward.",
          duration: 4000
        });
        setShow(false);
        return;
      }
      
      // Create and send reward
      const couponCode = `WELCOME5-${user.id.substring(0, 8).toUpperCase()}`;
      
      await base44.entities.Coupon.create({
        code: couponCode,
        discount_type: "fixed",
        discount_value: 5,
        marketplace_type: "consumer",
        user_id: user.id,
        coupon_type: "email_signup",
        is_active: true
      });

      await base44.auth.updateMe({
        email_signup_coupon_claimed: true,
        email_signup_coupon_code: couponCode
      });

      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: "Your $5 Welcome Reward is Ready! 🎁",
        body: `Hi ${user.full_name},\n\nThank you for joining EX3D Prints! Here's your $5 off coupon code:\n\n${couponCode}\n\nThis code has been automatically applied to your account and will be available at checkout.\n\nHappy shopping!\n\nThe EX3D Prints Team`
      }).catch(err => console.log('Email send skipped:', err));

      toast({
        title: "🎉 $5 Reward Claimed!",
        description: `Coupon code ${couponCode} sent to your email!`,
        duration: 6000
      });
      
      setShow(false);
    } catch (error) {
      console.error("Failed to claim reward:", error);
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('email_signup_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-40">
      <button
        onClick={handleClick}
        className="relative group bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-full shadow-2xl hover:shadow-xl transition-all transform hover:scale-110 animate-bounce"
        style={{ animationDuration: '2s' }}
      >
        <Gift className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          $5
        </span>
      </button>
      <button
        onClick={handleDismiss}
        className="absolute -top-2 -left-2 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-700"
      >
        ×
      </button>
    </div>
  );
}