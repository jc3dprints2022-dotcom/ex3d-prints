import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Gift, Star, Loader2, TrendingUp, Award, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DesignerExpRedeemTab({ user, onExpUpdate }) {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rewardsData, redemptionsData] = await Promise.all([
        base44.entities.ExpReward.filter({ reward_type: 'designer', is_active: true }),
        base44.entities.ExpRedemption.filter({ user_id: user.id })
      ]);
      setRewards(rewardsData.sort((a, b) => a.exp_cost - b.exp_cost));
      setRedemptions(redemptionsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast({ title: "Failed to load rewards", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRedeem = async (reward) => {
    if (user.exp_balance < reward.exp_cost) {
      toast({
        title: "Insufficient EXP",
        description: `You need ${reward.exp_cost - user.exp_balance} more EXP`,
        variant: "destructive"
      });
      return;
    }

    setRedeeming(reward.id);
    try {
      // Special handling for boost rewards
      if (reward.category === 'boost') {
        await base44.functions.invoke('redeemExpForReward', {
          userId: user.id,
          rewardId: reward.id,
          rewardType: 'boost',
          boostDurationWeeks: reward.boost_duration_weeks || 1
        });
        toast({
          title: "Boost Redeemed! 🚀",
          description: "Select a listing to apply your boost credit"
        });
      } else {
        await base44.functions.invoke('redeemExpForReward', {
          userId: user.id,
          rewardId: reward.id
        });
        toast({
          title: "Reward Redeemed!",
          description: `You've redeemed ${reward.name}`
        });
      }
      
      await loadData();
      if (onExpUpdate) await onExpUpdate();
    } catch (error) {
      console.error('Redemption failed:', error);
      toast({
        title: "Redemption Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
    setRedeeming(null);
  };

  const expProgress = Math.min((user.exp_balance / 2000) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* EXP Balance Card */}
      <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-6 h-6 text-red-600" />
            Your EXP Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-red-600 mb-2">
            {user.exp_balance?.toLocaleString() || 0} EXP
          </div>
          <Progress value={expProgress} className="h-2 mb-2" />
          <p className="text-sm text-gray-600">
            {user.exp_balance >= 2000 ? "You're earning great EXP!" : `${2000 - user.exp_balance} EXP until next milestone`}
          </p>
        </CardContent>
      </Card>

      {/* Designer Rewards */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-red-600" />
          Designer Rewards
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {rewards.map(reward => {
            const canAfford = user.exp_balance >= reward.exp_cost;
            const isBoost = reward.category === 'boost';
            
            return (
              <Card key={reward.id} className={`${canAfford ? 'border-red-300 bg-red-50' : 'bg-gray-50'}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {reward.image_url && (
                      <img src={reward.image_url} alt={reward.name} className="w-20 h-20 rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        {reward.name}
                        {isBoost && <TrendingUp className="w-4 h-4 text-orange-500" />}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                      {isBoost && reward.boost_duration_weeks && (
                        <Badge className="bg-orange-500 mb-2">
                          {reward.boost_duration_weeks} week{reward.boost_duration_weeks > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge className="bg-red-500">{reward.exp_cost} EXP</Badge>
                        <Button
                          size="sm"
                          onClick={() => handleRedeem(reward)}
                          disabled={!canAfford || redeeming === reward.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {redeeming === reward.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Redeem'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {rewards.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No designer rewards available at the moment
            </CardContent>
          </Card>
        )}
      </div>

      {/* Redemption History */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-red-600" />
          Your Redemptions
        </h3>
        <Card>
          <CardContent className="p-4">
            {redemptions.length > 0 ? (
              <div className="space-y-3">
                {redemptions.map(redemption => (
                  <div key={redemption.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{redemption.reward_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(redemption.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        redemption.status === 'fulfilled' ? 'bg-green-500' :
                        redemption.status === 'pending' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }>
                        {redemption.status === 'fulfilled' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {redemption.status}
                      </Badge>
                      <span className="text-red-600 font-semibold">-{redemption.exp_cost} EXP</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No redemptions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}