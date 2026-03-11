import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Package, Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MakerExpRedeemTab({ user, onUpdate }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
    loadMyRedemptions();
  }, [user]);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const allRewards = await base44.entities.ExpReward.filter({
        reward_type: 'maker',
        is_active: true
      });
      setRewards(allRewards.sort((a, b) => a.exp_cost - b.exp_cost));
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast({ title: "Failed to load rewards", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadMyRedemptions = async () => {
    try {
      const redemptions = await base44.entities.ExpRedemption.filter(
        { user_id: user.id },
        '-created_date'
      );
      setMyRedemptions(redemptions);
    } catch (error) {
      console.error('Failed to load redemptions:', error);
    }
  };

  const handleRedeem = async () => {
    if (!selectedReward) return;

    setRedeeming(selectedReward.id);
    try {
      const { data } = await base44.functions.invoke('redeemExpForReward', {
        reward_id: selectedReward.id
      });

      if (data?.success) {
        toast({ 
          title: "Reward redeemed!", 
          description: data.message 
        });
        setSelectedReward(null);
        await onUpdate();
        await loadRewards();
        await loadMyRedemptions();
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

  return (
    <div className="space-y-6">
      {/* Shipping Kits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            Shipping Kits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-teal-300 border-2">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-1">Starter Shipping Kit</h3>
                <p className="text-sm text-gray-600 mb-3">Your first kit — includes boxes, packing tape, and packing paper to get you started shipping orders.</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-teal-600">20,000 EXP</Badge>
                  <span className="text-sm text-gray-500">or $20.00</span>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => toast({ title: "Coming soon!", description: "Contact support to order your starter kit." })}>
                  Order Starter Kit
                </Button>
              </CardContent>
            </Card>
            <Card className="border-blue-300 border-2">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-1">Continual Shipping Kit</h3>
                <p className="text-sm text-gray-600 mb-3">Restock kit for active makers — same supplies as the starter at a discounted rate.</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-600">18,000 EXP</Badge>
                  <span className="text-sm text-gray-500">or $18.00</span>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => toast({ title: "Coming soon!", description: "Contact support to order your continual kit." })}>
                  Order Continual Kit
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Filament Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              No rewards available yet. Check back soon!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map(reward => {
                const canRedeem = (user.exp_points || 0) >= reward.exp_cost;
                const outOfStock = reward.stock_quantity !== undefined && reward.stock_quantity <= 0;

                return (
                  <Card 
                    key={reward.id} 
                    className={`${canRedeem && !outOfStock ? 'border-orange-500 border-2' : 'border-gray-200'} ${outOfStock ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-4">
                      {reward.image_url && (
                        <img 
                          src={reward.image_url} 
                          alt={reward.name} 
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-bold text-lg mb-1">{reward.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-orange-500">{reward.exp_cost} EXP</Badge>
                        <span className="text-sm text-gray-500">or ${(reward.exp_cost / 100).toFixed(2)}</span>
                      </div>
                      <Button
                        onClick={() => setSelectedReward(reward)}
                        disabled={!canRedeem || outOfStock}
                        className="w-full"
                      >
                        {outOfStock ? 'Out of Stock' : canRedeem ? 'Redeem' : `Need ${reward.exp_cost - (user.exp_points || 0)} more EXP`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Redemptions */}
      {myRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRedemptions.map(redemption => (
                <div key={redemption.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{redemption.reward_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(redemption.created_date).toLocaleDateString()}
                    </p>
                    {redemption.fulfillment_notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        Note: {redemption.fulfillment_notes}
                      </p>
                    )}
                  </div>
                  <Badge className={
                    redemption.status === 'fulfilled' ? 'bg-green-500' :
                    redemption.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }>
                    {redemption.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem this reward?
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="py-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">{selectedReward.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{selectedReward.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cost:</span>
                  <Badge className="bg-orange-500">{selectedReward.exp_cost} EXP</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold">Your balance after:</span>
                  <span className="text-lg">{(user.exp_points || 0) - selectedReward.exp_cost} EXP</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                An admin will fulfill your reward within 2-3 business days.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReward(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRedeem}
              disabled={redeeming}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {redeeming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                'Confirm Redemption'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}