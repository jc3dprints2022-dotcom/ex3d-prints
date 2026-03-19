import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Package, Loader2, CheckCircle, ShoppingCart, Coins } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState(null); // 'exp' or 'money'
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
    loadMyRedemptions();
    loadUserAddress();
  }, [user]);

  const loadUserAddress = () => {
    if (user?.address) {
      setShippingAddress({
        name: user.address.name || user.full_name || '',
        street: user.address.street || '',
        city: user.address.city || '',
        state: user.address.state || '',
        zip: user.address.zip || ''
      });
    } else {
      setShippingAddress({
        name: user?.full_name || '',
        street: '',
        city: '',
        state: '',
        zip: ''
      });
    }
  };

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

  const handleRedeemWithExp = async () => {
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
        setPaymentMethod(null);
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

  const handleCheckout = async () => {
    if (!selectedReward) return;

    // Validate shipping address
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      toast({
        title: "Missing shipping address",
        description: "Please fill in all address fields",
        variant: "destructive"
      });
      return;
    }

    setRedeeming(selectedReward.id);
    try {
      const { data } = await base44.functions.invoke('createFilamentCheckout', {
        rewardId: selectedReward.id,
        shippingAddress
      });

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      toast({ 
        title: "Checkout failed", 
        description: error.message,
        variant: "destructive" 
      });
      setRedeeming(null);
    }
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
                  <Badge className="bg-teal-600">2,000 EXP</Badge>
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
                  <Badge className="bg-blue-600">1,800 EXP</Badge>
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
                        <div className="w-full aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={reward.image_url} 
                            alt={reward.name} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <h3 className="font-bold text-lg mb-1">{reward.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-orange-500">{reward.exp_cost} EXP</Badge>
                        <span className="text-sm text-gray-500">or $15.00</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => {
                            setSelectedReward(reward);
                            setPaymentMethod('exp');
                          }}
                          disabled={!canRedeem || outOfStock}
                          variant="outline"
                          className="w-full"
                        >
                          <Coins className="w-4 h-4 mr-1" />
                          {canRedeem ? 'Use EXP' : 'Not Enough'}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedReward(reward);
                            setPaymentMethod('money');
                          }}
                          disabled={outOfStock}
                          className="w-full bg-teal-600 hover:bg-teal-700"
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          $15
                        </Button>
                      </div>
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
      <Dialog open={!!selectedReward} onOpenChange={() => {
        setSelectedReward(null);
        setPaymentMethod(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentMethod === 'exp' ? 'Confirm EXP Redemption' : 'Checkout'}
            </DialogTitle>
            <DialogDescription>
              {paymentMethod === 'exp' 
                ? 'Redeem this reward using your EXP points'
                : 'Purchase this filament with card payment'}
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">{selectedReward.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{selectedReward.description}</p>
                
                {paymentMethod === 'exp' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Cost:</span>
                      <Badge className="bg-orange-500">{selectedReward.exp_cost} EXP</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold">Your balance after:</span>
                      <span className="text-lg">{(user.exp_points || 0) - selectedReward.exp_cost} EXP</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Item Price:</span>
                      <span>$15.00</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold">Shipping:</span>
                      <span className="text-sm text-gray-600">$5.00 (free over $35)</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold">$20.00</span>
                    </div>
                  </>
                )}
              </div>

              {paymentMethod === 'money' && (
                <div className="space-y-3">
                  <Label>Shipping Address</Label>
                  <Input
                    placeholder="Full Name"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                  />
                  <Input
                    placeholder="Street Address"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    />
                    <Input
                      placeholder="State"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                    />
                  </div>
                  <Input
                    placeholder="ZIP Code"
                    value={shippingAddress.zip}
                    onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                  />
                </div>
              )}
              
              {paymentMethod === 'exp' && (
                <p className="text-sm text-gray-600">
                  An admin will ship your filament within 2-3 business days.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedReward(null);
              setPaymentMethod(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={paymentMethod === 'exp' ? handleRedeemWithExp : handleCheckout}
              disabled={redeeming}
              className={paymentMethod === 'exp' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'}
            >
              {redeeming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentMethod === 'exp' ? (
                'Confirm Redemption'
              ) : (
                'Proceed to Checkout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}