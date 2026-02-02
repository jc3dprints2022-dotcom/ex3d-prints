import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Gift, Copy, Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TIERS = [
  { exp: 120, value: 1, label: '$1 Off', color: 'bg-blue-500' },
  { exp: 550, value: 5, label: '$5 Off', color: 'bg-purple-500' },
  { exp: 2000, value: 20, label: '$20 Off', color: 'bg-orange-500' }
];

export default function ExpRedeemTab({ user, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [quantities, setQuantities] = useState({ 1: 1, 5: 1, 20: 1 }); // Track quantities for each tier
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
      loadRewards();
    }
  }, [user]);

  const loadRewards = async () => {
    setLoadingRewards(true);
    try {
      const expRewards = await base44.entities.ExpReward.filter({
        reward_type: "consumer",
        is_active: true
      });
      setRewards(expRewards);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    }
    setLoadingRewards(false);
  };

  const loadTransactions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const allTransactions = await base44.entities.ExpTransaction.filter(
        { user_id: user.id },
        '-created_date',
        50 // Changed limit from 20 to 50
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
    setLoading(false);
  };

  const handleRedeem = async (tier) => {
    if (!user) return;
    
    const quantity = quantities[tier.value];
    const totalExpCost = tier.exp * quantity;
    
    if ((user.exp_points || 0) < totalExpCost) {
      toast({
        title: "Insufficient EXP",
        description: `You need ${totalExpCost} EXP but have ${user.exp_points || 0} EXP.`,
        variant: "destructive"
      });
      return;
    }

    setRedeeming(tier.value);
    try {
      const { data } = await base44.functions.invoke('redeemExpForCoupon', {
        tier: tier.value.toString(),
        quantity: quantity
      });

      if (data?.success) {
        setCouponCode(data.coupon_code);
        setCouponAmount(data.discount_amount);
        setShowCouponDialog(true);
        toast({
          title: "EXP Redeemed!",
          description: `You got a ${data.discount_amount} coupon!`
        });
        
        // Reset quantity to 1
        setQuantities(prev => ({ ...prev, [tier.value]: 1 }));
        
        // Reload transactions to show latest activity
        await loadTransactions();
        
        // Update user data in parent component to refresh EXP balance
        if (onUpdate) {
          await onUpdate();
        }
      } else {
        throw new Error(data?.error || 'Redemption failed');
      }
    } catch (error) {
      toast({
        title: "Redemption failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setRedeeming(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const getNextTier = () => {
    const currentExp = user?.exp_points || 0;
    return TIERS.find(t => t.exp > currentExp) || TIERS[TIERS.length - 1];
  };

  const getProgressPercent = () => {
    const currentExp = user?.exp_points || 0;
    const nextTier = getNextTier();
    const previousTier = TIERS[TIERS.indexOf(nextTier) - 1];
    const baseExp = previousTier ? previousTier.exp : 0;

    // Handle edge case where nextTier.exp - baseExp is 0 or negative
    const range = nextTier.exp - baseExp;
    if (range <= 0) return 100; // If current exp is already past or at the last tier's exp, show 100%

    return ((currentExp - baseExp) / range) * 100;
  };

  return (
    <div className="space-y-6">
      {/* How to Earn EXP */}
      <Alert className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
        <Sparkles className="w-5 h-5 text-teal-600" />
        <AlertDescription className="text-teal-900">
          <strong>Earn EXP:</strong> Every dollar you spend = 5 EXP points! Plus get bonus EXP from referrals.
          Redeem your EXP for instant discounts on your next purchase!
        </AlertDescription>
      </Alert>

      {/* EXP Balance Card */}
      <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-cyan-100 mb-2">Your EXP Balance</p>
              <h2 className="text-5xl font-bold flex items-center gap-3">
                <Trophy className="w-12 h-12" />
                {user?.exp_points || 0} EXP
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {getNextTier().label}</span>
              <span className="font-semibold">
                {user?.exp_points || 0} / {getNextTier().exp} EXP
              </span>
            </div>
            <Progress value={getProgressPercent()} className="h-3 bg-cyan-700" />
            <p className="text-xs text-cyan-100">
              {Math.max(0, getNextTier().exp - (user?.exp_points || 0))} EXP until next reward
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Redemption Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-teal-600" />
            Redeem Your EXP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map(tier => {
              const quantity = quantities[tier.value];
              const totalExpCost = tier.exp * quantity;
              const totalValue = tier.value * quantity;
              const canRedeem = (user?.exp_points || 0) >= totalExpCost;
              const isRedeeming = redeeming === tier.value;

              return (
                <Card key={tier.exp} className={`${canRedeem ? 'border-teal-500 border-2' : 'border-gray-200'}`}>
                  <CardContent className="p-6 text-center">
                    <div className={`${tier.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-2xl font-bold text-white">${totalValue}</span>
                    </div>
                    <p className="text-2xl font-bold mb-1">{totalExpCost} EXP</p>
                    <p className="text-sm text-gray-600 mb-4">
                      {canRedeem ? '✓ You can redeem this!' : `Need ${totalExpCost - (user?.exp_points || 0)} more EXP`}
                    </p>
                    
                    {/* Quantity Selector */}
                    <div className="mb-4">
                      <label className="text-xs text-gray-600 block mb-1">Quantity</label>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantities(prev => ({
                            ...prev,
                            [tier.value]: Math.max(1, prev[tier.value] - 1)
                          }))}
                          disabled={quantity <= 1 || isRedeeming}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-semibold">{quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newQuantity = quantity + 1;
                            const newTotalCost = tier.exp * newQuantity;
                            if ((user?.exp_points || 0) >= newTotalCost) {
                              setQuantities(prev => ({
                                ...prev,
                                [tier.value]: newQuantity
                              }));
                            } else {
                              toast({
                                title: "Insufficient EXP",
                                description: "You don't have enough EXP for this quantity.",
                                variant: "destructive"
                              });
                            }
                          }}
                          disabled={isRedeeming}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleRedeem(tier)}
                      disabled={!canRedeem || isRedeeming}
                      className="w-full"
                    >
                      {isRedeeming ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        `Redeem ${quantity > 1 ? `(${quantity}x)` : ''}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Section */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-teal-600" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRewards ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map(reward => {
                  const canRedeem = (user?.exp_points || 0) >= reward.exp_cost;
                  return (
                    <Card key={reward.id} className="overflow-hidden">
                      {reward.image_url && (
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-sm">{reward.name}</h3>
                          <p className="text-xs text-gray-600">{reward.description}</p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">
                          {reward.exp_cost} EXP
                        </Badge>
                        <Button disabled={!canRedeem} className="w-full bg-teal-600 hover:bg-teal-700 text-xs h-7">
                          {canRedeem ? <>Redeem <ArrowRight className="w-3 h-3 ml-1" /></> : `Need ${reward.exp_cost - (user?.exp_points || 0)} more`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_date).toLocaleDateString()}
                    </p>
                    {tx.stripe_coupon_id && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {tx.stripe_coupon_id}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(tx.stripe_coupon_id);
                            toast({ title: "Coupon code copied!" });
                          }}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Badge className={tx.action === 'earned' ? 'bg-green-500' : 'bg-orange-500'}>
                    {tx.action === 'earned' ? '+' : ''}{tx.amount} EXP
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Discount Coupon</DialogTitle>
            <DialogDescription>
              Use this code at checkout to apply your {couponAmount} discount
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-2">Coupon Code</p>
              <p className="text-3xl font-bold text-teal-600 mb-4 font-mono">{couponCode}</p>
              <Button onClick={handleCopy} variant="outline" className="w-full">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Paste this code in the coupon field during Stripe checkout to apply your discount. 
              A confirmation email with this code has been sent to your email address.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}