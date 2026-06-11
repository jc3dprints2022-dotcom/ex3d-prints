import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Gift, Loader2, Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TIERS = [
  { exp: 500, value: 5, label: '$5 Off', color: 'bg-blue-500' },
  { exp: 2000, value: 20, label: '$20 Off', color: 'bg-purple-500' },
  { exp: 5000, value: 50, label: '$50 Off', color: 'bg-orange-500' }
];

export default function DesignerExpRedeemTab({ user, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
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
        reward_type: "designer",
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
        50
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
    setLoading(false);
  };

  const handleRedeemReward = async (reward) => {
    if (!user || (user.exp_points || 0) < reward.exp_cost) {
      toast({
        title: "Insufficient EXP",
        description: `You need ${reward.exp_cost} EXP but have ${user.exp_points || 0} EXP.`,
        variant: "destructive"
      });
      return;
    }

    setRedeeming(reward.id);
    try {
      const { data } = await base44.functions.invoke('redeemExpForReward', {
        rewardId: reward.id
      });

      if (data?.success) {
        toast({
          title: "Reward Redeemed!",
          description: `You've redeemed ${reward.name}!`
        });
        
        await loadTransactions();
        
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

  const getNextTier = () => {
    const currentExp = user?.exp_points || 0;
    return TIERS.find(t => t.exp > currentExp) || TIERS[TIERS.length - 1];
  };

  const getProgressPercent = () => {
    const currentExp = user?.exp_points || 0;
    const nextTier = getNextTier();
    const previousTier = TIERS[TIERS.indexOf(nextTier) - 1];
    const baseExp = previousTier ? previousTier.exp : 0;

    const range = nextTier.exp - baseExp;
    if (range <= 0) return 100;

    return ((currentExp - baseExp) / range) * 100;
  };

  return (
    <div className="space-y-6">
      {/* How to Earn EXP */}
      <Alert className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <Sparkles className="w-5 h-5 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Earn EXP:</strong> Every sale = 10 EXP per dollar earned! Plus bonus EXP from featured products and milestones.
          Redeem your EXP for boosts, perks, and exclusive designer benefits!
        </AlertDescription>
      </Alert>

      {/* EXP Balance Card */}
      <Card className="bg-gradient-to-br from-red-500 to-pink-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-pink-100 mb-2">Your EXP Balance</p>
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
            <Progress value={getProgressPercent()} className="h-3 bg-pink-700" />
            <p className="text-xs text-pink-100">
              {Math.max(0, getNextTier().exp - (user?.exp_points || 0))} EXP until next reward
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Section */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-red-600" />
              Available Designer Rewards
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
                  const isRedeeming = redeeming === reward.id;
                  return (
                    <Card key={reward.id} className={`overflow-hidden ${canRedeem ? 'border-red-500 border-2' : ''}`}>
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
                        {reward.category === 'boost' && reward.boost_duration_weeks && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {reward.boost_duration_weeks} week{reward.boost_duration_weeks > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Button 
                          disabled={!canRedeem || isRedeeming} 
                          onClick={() => handleRedeemReward(reward)}
                          className="w-full bg-red-600 hover:bg-red-700 text-xs h-7"
                        >
                          {isRedeeming ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Redeeming...</>
                          ) : canRedeem ? (
                            <>Redeem <ArrowRight className="w-3 h-3 ml-1" /></>
                          ) : (
                            `Need ${reward.exp_cost - (user?.exp_points || 0)} more`
                          )}
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
            <>
              <div className="space-y-3">
                {transactions.slice(0, showAllTransactions ? transactions.length : 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={tx.action === 'earned' ? 'bg-green-500' : 'bg-orange-500'}>
                      {tx.action === 'earned' ? '+' : '-'}{tx.amount} EXP
                    </Badge>
                  </div>
                ))}
              </div>
              {transactions.length > 5 && (
                <Button
                  variant="outline"
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="w-full mt-4"
                >
                  {showAllTransactions ? 'Show Less' : `Show ${transactions.length - 5} More Transactions`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}