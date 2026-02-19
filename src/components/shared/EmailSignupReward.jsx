import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Gift, Mail, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EmailSignupReward() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const { toast } = useToast();

  const handleClaim = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Check if user is logged in
      const user = await base44.auth.me().catch(() => null);
      
      if (!user) {
        // Not logged in - prompt to sign up
        toast({
          title: "Sign Up Required",
          description: "Please create an account to claim your $5 reward!",
          duration: 5000
        });
        
        // Redirect to login/signup
        setTimeout(() => {
          base44.auth.redirectToLogin(window.location.href);
        }, 1500);
        return;
      }

      // Check if already claimed
      if (user.email_signup_coupon_claimed) {
        toast({
          title: "Already Claimed",
          description: "You've already claimed your email signup reward!",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create $5 coupon
      const couponCode = `EMAIL5-${user.id.substring(0, 8).toUpperCase()}`;
      
      await base44.entities.Coupon.create({
        code: couponCode,
        discount_type: "fixed",
        discount_value: 5,
        marketplace_type: "consumer",
        user_id: user.id,
        coupon_type: "email_signup",
        is_active: true
      });

      // Update user to mark as claimed
      await base44.auth.updateMe({
        email_signup_coupon_claimed: true,
        email_signup_coupon_code: couponCode
      });

      setClaimed(true);
      toast({
        title: "🎉 $5 Reward Unlocked!",
        description: `Your coupon code: ${couponCode}`,
        duration: 8000
      });

      // Auto-dismiss after showing success
      setTimeout(() => {
        setDismissed(true);
      }, 5000);
    } catch (error) {
      console.error("Failed to claim reward:", error);
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-2xl p-6 animate-in slide-in-from-bottom">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="bg-white/20 rounded-full p-3">
          <Gift className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Get $5 Off!</h3>
          <p className="text-sm text-white/90 mb-3">
            Sign up and get $5 off your first order
          </p>

          {!claimed ? (
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/90 border-none text-gray-900 placeholder:text-gray-500"
                disabled={loading}
              />
              <Button
                onClick={handleClaim}
                disabled={loading}
                className="bg-white text-teal-600 hover:bg-white/90 font-semibold"
              >
                {loading ? "..." : "Claim"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Claimed! Check your account</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}