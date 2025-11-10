
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Gift, Copy, Check, Loader2, Sparkles } from "lucide-react";
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
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const allTransactions = await base44.entities.ExpTransaction.filter(
        { user_id: user.id },
        '-created_date',
        20
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
    setLoading(false);
  };

  const handleRedeem = async (tier) => {
    setRedeeming(tier.value);
    try {
      const { data } = await base44.functions.invoke('redeemExpForCoupon', {
        tier: tier.value.toString()
      });

      if (data?.success) {
        setCouponCode(data.coupon_code);
        setShowCouponDialog(true);
        toast({
          title: "EXP Redeemed!",
          description: `You got a ${tier.label} coupon!`
        });
        await onUpdate();
        await loadTransactions();
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
    const currentExp = user.exp_points || 0;
    return TIERS.find(t => t.exp > currentExp) || TIERS[TIERS.length - 1];
  };

  const getProgressPercent = () => {
    const currentExp = user.exp_points || 0;
    const nextTier = getNextTier();
    const previousTier = TIERS[TIERS.indexOf(nextTier) - 1];
    const baseExp = previousTier ? previousTier.exp : 0;

    return ((currentExp - baseExp) / (nextTier.exp - baseExp)) * 100;
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
                {user.exp_points || 0} EXP
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {getNextTier().label}</span>
              <span className="font-semibold">
                {user.exp_points || 0} / {getNextTier().exp} EXP
              </span>
            </div>
            <Progress value={getProgressPercent()} className="h-3 bg-cyan-700" />
            <p className="text-xs text-cyan-100">
              {getNextTier().exp - (user.exp_points || 0)} EXP until next reward
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
              const canRedeem = (user.exp_points || 0) >= tier.exp;
              const isRedeeming = redeeming === tier.value;

              return (
                <Card key={tier.exp} className={`${canRedeem ? 'border-teal-500 border-2' : 'border-gray-200'}`}>
                  <CardContent className="p-6 text-center">
                    <div className={`${tier.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-2xl font-bold text-white">{tier.label}</span>
                    </div>
                    <p className="text-2xl font-bold mb-1">{tier.exp} EXP</p>
                    <p className="text-sm text-gray-600 mb-4">
                      {canRedeem ? '✓ You can redeem this!' : `Need ${tier.exp - (user.exp_points || 0)} more EXP`}
                    </p>
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
                        'Redeem'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
              Use this code at checkout to apply your discount
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
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
