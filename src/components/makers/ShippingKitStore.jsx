import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Truck, Package, Check, Loader2 } from 'lucide-react';

export default function ShippingKitStore({ subscription, userId, onKitOrdered }) {
  const [ordering, setOrdering] = useState(false);
  const { toast } = useToast();

  const getKitPrice = () => {
    if (!subscription) return 15;
    return subscription.plan_name.toLowerCase().includes('basic') ? 15 : 5;
  };

  const orderKit = async () => {
    setOrdering(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.ShippingKitOrder.create({
        user_id: userId,
        subscription_plan: subscription?.plan_name || 'Basic',
        cost: getKitPrice(),
        status: 'pending',
        shipping_address: user.address || {},
        kit_contents: ['packing_tape', 'boxes', 'packing_paper']
      });

      // Increment shipping kits counter
      await base44.auth.updateMe({
        shipping_kits_received: (user.shipping_kits_received || 0) + 1
      });

      await base44.entities.AuditLog.create({
        event_type: 'shipping_kit_order',
        user_id: userId,
        details: {
          plan: subscription?.plan_name,
          cost: getKitPrice()
        },
        severity: 'info'
      });

      toast({ 
        title: "Shipping Kit Ordered!", 
        description: "Your kit will be shipped to your registered address within 3-5 business days." 
      });

      if (onKitOrdered) {
        onKitOrdered();
      }
    } catch (error) {
      toast({ 
        title: "Order Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
    setOrdering(false);
  };

  const kitPrice = getKitPrice();
  const isBasicPlan = subscription?.plan_name.toLowerCase().includes('basic');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Truck className="w-6 h-6 text-teal-500" />
            Order Shipping Kits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ${kitPrice} per kit
            </h3>
            {isBasicPlan ? (
              <p className="text-gray-700">Basic Plan Pricing</p>
            ) : (
              <div>
                <p className="text-green-700 font-semibold">Premium Plan Discount!</p>
                <p className="text-sm text-gray-700">Plus 1 FREE kit per month</p>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-900">Each kit includes:</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Package className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="font-medium text-gray-900">Packing Tape</p>
                  <p className="text-sm text-gray-700">Heavy-duty shipping tape</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Package className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="font-medium text-gray-900">Shipping Boxes</p>
                  <p className="text-sm text-gray-700">Various sizes for different prints</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Package className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="font-medium text-gray-900">Packing Paper</p>
                  <p className="text-sm text-gray-700">Protective padding material</p>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={orderKit} 
            disabled={ordering}
            className="w-full bg-teal-600 hover:bg-teal-700"
            size="lg"
          >
            {ordering ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Order...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Order Shipping Kit - ${kitPrice}
              </>
            )}
          </Button>

          <p className="text-xs text-gray-600 text-center mt-4">
            Kit will be shipped to your registered business address within 3-5 business days.
            {!isBasicPlan && <span className="block mt-1">Charges for extra kits will be deducted from your next payout.</span>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}