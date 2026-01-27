import React, { useState, useEffect } from "react";
import { Gift, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";

export default function NewUserGiftPopup() {
  const [showIcon, setShowIcon] = useState(true); // Always show to entice signups
  const [showDialog, setShowDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [couponCode, setCouponCode] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsLoggedIn(true);

        // Hide icon if user already claimed or is not new
        const userCreatedAt = new Date(currentUser.created_date);
        const now = new Date();
        const daysSinceCreation = (now - userCreatedAt) / (1000 * 60 * 60 * 24);

        if (currentUser.welcome_coupon_claimed || daysSinceCreation > 7) {
          setShowIcon(false);
        }
      }
    } catch (error) {
      // User not logged in - keep showing icon to entice signup
      setIsLoggedIn(false);
    }
  };

  const handleIconClick = () => {
    if (!isLoggedIn) {
      // Show signup prompt for non-logged-in users
      setShowDialog(true);
    } else {
      // Show claim dialog for logged-in new users
      setShowDialog(true);
    }
  };

  const handleClaimCoupon = async () => {
    try {
      // Generate a unique coupon code for this user
      const code = `WELCOME3-${user.id.slice(0, 8).toUpperCase()}`;
      
      // Update user to mark coupon as claimed and store the code
      await base44.auth.updateMe({
        welcome_coupon_claimed: true,
        welcome_coupon_code: code
      });

      setCouponCode(code);
      setShowIcon(false);

      // Celebrate with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Welcome Gift Claimed!",
        description: `Your $3 coupon code: ${code}`,
        duration: 10000
      });
    } catch (error) {
      console.error("Failed to claim coupon:", error);
      toast({
        title: "Failed to claim gift",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const handleCopyCode = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode);
      toast({ title: "Coupon code copied!" });
    }
  };

  const handleLogin = async () => {
    try {
      await base44.auth.redirectToLogin(window.location.href);
    } catch (error) {
      console.error('Login redirect error:', error);
      window.location.href = '/api/auth/login';
    }
  };

  if (!showIcon && !couponCode) return null;

  return (
    <>
      {/* Floating Gift Icon */}
      {showIcon && (
        <button
          onClick={handleIconClick}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-red-500 to-pink-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-bounce"
          aria-label="Claim your welcome gift"
        >
          <Gift className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
            $3
          </span>
        </button>
      )}

      {/* Gift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Gift className="w-7 h-7 text-red-500" />
              Welcome Gift! 🎉
            </DialogTitle>
            <DialogDescription>
              {!isLoggedIn ? (
                "Sign in or create an account to claim your $3 welcome coupon!"
              ) : !couponCode ? (
                "As a new member, you get a $3 coupon for your first purchase!"
              ) : (
                "Your coupon is ready to use!"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!isLoggedIn ? (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-lg">
                  <div className="text-4xl font-bold text-red-600 mb-2">$3 OFF</div>
                  <p className="text-sm text-gray-600">Your first order</p>
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-lg py-6"
                >
                  Sign In to Claim
                </Button>
              </div>
            ) : !couponCode ? (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-lg">
                  <div className="text-4xl font-bold text-red-600 mb-2">$3 OFF</div>
                  <p className="text-sm text-gray-600">Your first order</p>
                </div>
                <Button
                  onClick={handleClaimCoupon}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-lg py-6"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Claim My Gift
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border-2 border-dashed border-green-400">
                  <p className="text-sm text-gray-600 mb-2">Your Coupon Code:</p>
                  <div className="text-2xl font-bold text-green-600 mb-3 font-mono">
                    {couponCode}
                  </div>
                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    size="sm"
                    className="border-green-400 text-green-600 hover:bg-green-50"
                  >
                    Copy Code
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Use this code at checkout to get $3 off your first order!
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}