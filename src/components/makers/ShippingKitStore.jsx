import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createShippingKitCheckout } from '@/functions/createShippingKitCheckout';
import { Truck, Package, Tag, Box, Check, Loader2 } from 'lucide-react';

export default function ShippingKitStore({ subscription, userId, onKitOrdered }) {
  const [ordering, setOrdering] = useState(false);
  const { toast } = useToast();

  const getKitPrice = () => {
    return 20;
  };

  const orderKit = async () => {
    setOrdering(true);

    try {
      const response = await createShippingKitCheckout({});

      if (response?.data?.checkout_url) {
        if (typeof onKitOrdered === 'function') {
          onKitOrdered(response.data);
        }
        window.location.href = response.data.checkout_url;
        return;
      }

      throw new Error(response?.data?.error || 'Failed to create checkout');
    } catch (error) {
      toast({
        title: 'Order Failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setOrdering(false);
    }
  };

  const kitPrice = getKitPrice();
  const isBasicPlan = subscription?.plan_name?.toLowerCase?.().includes('basic');

  const items = [
    {
      icon: Box,
      label: '5 Large Shipping Boxes',
      desc: 'For bigger prints and multi-item orders',
    },
    {
      icon: Box,
      label: '5 Small Shipping Boxes',
      desc: 'Perfect for single smaller prints',
    },
    {
      icon: Package,
      label: 'Packing Paper',
      desc: 'Protective wrapping for fragile prints',
    },
    {
      icon: Tag,
      label: 'Shipping Labels',
      desc: 'Pre-cut adhesive labels for easy application',
    },
    {
      icon: Package,
      label: 'EX3D Prints Stickers',
      desc: 'Branded stickers to finish your packages',
    },
    {
      icon: Package,
      label: 'Packing Tape',
      desc: 'Heavy-duty tape to seal your shipments',
    },
  ];

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
            <p className="text-gray-700">Good for 10 orders</p>
            {isBasicPlan && (
              <p className="text-sm text-gray-600 mt-2">
                You are currently on the Basic plan.
              </p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-900">Each kit includes:</h4>

            <div className="grid gap-3">
              {items.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 bg-white border rounded-lg"
                >
                  <Icon className="w-5 h-5 text-teal-500 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
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
            Kit will be shipped to your registered business address within 3–5 business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}