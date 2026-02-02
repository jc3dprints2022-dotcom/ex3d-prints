import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RewardsTab({ user }) {
  const [rewards, setRewards] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const expRewards = await base44.entities.ExpReward.filter({
        reward_type: "consumer",
        is_active: true
      });
      setRewards(expRewards);

      // Load associated products
      const productIds = expRewards
        .filter(r => r.existing_product_id)
        .map(r => r.existing_product_id);

      if (productIds.length > 0) {
        const productList = await Promise.all(
          productIds.map(id => base44.entities.Product.get(id).catch(() => null))
        );
        setProducts(productList.filter(p => p !== null));
      }
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast({ title: "Failed to load rewards", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRedeemReward = async (reward) => {
    if (user.exp_balance < reward.exp_cost) {
      toast({ title: "Not enough EXP", variant: "destructive" });
      return;
    }

    setRedeeming(reward.id);
    try {
      if (reward.existing_product_id) {
        // Product reward - add to cart as free item
        const product = products.find(p => p.id === reward.existing_product_id);
        if (!product) throw new Error("Product not found");

        await base44.entities.Cart.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          selected_material: product.materials?.[0] || '',
          selected_color: product.colors?.[0] || ''
        });

        // Deduct EXP
        await base44.auth.updateMe({
          exp_balance: (user.exp_balance || 0) - reward.exp_cost
        });

        toast({ title: `Redeemed ${product.name}! Added to cart.` });
      }

      await loadRewards();
    } catch (error) {
      console.error('Redeem error:', error);
      toast({ title: "Failed to redeem reward", variant: "destructive" });
    }
    setRedeeming(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rewards.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No rewards available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => {
            const product = products.find(p => p.id === reward.existing_product_id);
            const canRedeem = user.exp_balance >= reward.exp_cost;

            return (
              <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {product && (
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{reward.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-100 text-purple-800 text-lg px-3 py-1">
                      {reward.exp_cost} EXP
                    </Badge>
                    {!canRedeem && (
                      <span className="text-sm text-gray-500">
                        Need {reward.exp_cost - user.exp_balance} more
                      </span>
                    )}
                  </div>
                  {product && (
                    <Button
                      onClick={() => window.location.href = `/ProductDetail?id=${product.id}`}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View Listing
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button
                    onClick={() => handleRedeemReward(reward)}
                    disabled={!canRedeem || redeeming === reward.id}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    {redeeming === reward.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redeeming...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-2" />
                        Redeem
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}