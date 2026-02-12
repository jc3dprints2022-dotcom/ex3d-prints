import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { 
  Calendar, Package, CreditCard, Pause, XCircle, Upload, 
  CheckCircle, AlertCircle, Settings 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SubscriptionManagement({ user }) {
  const [subscription, setSubscription] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const { toast } = useToast();

  const availableColors = [
    "Black", "White", "Red", "Blue", "Green", "Yellow", "Orange", "Purple",
    "Pink", "Gray", "Brown", "Teal", "Misc (Any Available)"
  ];

  const plans = [
    { id: "100_items", items: 100, selections: 2, monthlyPrice: 300, yearlyPrice: 3200 },
    { id: "200_items", items: 200, selections: 4, monthlyPrice: 500, yearlyPrice: 5400 },
    { id: "550_items", items: 550, selections: 11, monthlyPrice: 1200, yearlyPrice: 12900 }
  ];

  useEffect(() => {
    loadSubscription();
    loadProducts();
  }, []);

  const loadSubscription = async () => {
    try {
      const subs = await base44.entities.BusinessSubscription.filter({ user_id: user.id });
      if (subs.length > 0) {
        setSubscription(subs[0]);
        setSelectedProducts(subs[0].selected_products || []);
        setSelectedColors(subs[0].selected_colors || []);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.list();
      const coreNames = [
        "Rotating Rings Toy", "Interlocking Stars - Fidget Toy",
        "Cone Fidget Passthrough", "Infinity Cube", "Toothbrush Travel Case"
      ];
      setProducts(allProducts.filter(p => coreNames.includes(p.name)));
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handlePauseSubscription = async () => {
    try {
      await base44.entities.BusinessSubscription.update(subscription.id, {
        status: "paused"
      });
      toast({ title: "Subscription paused successfully" });
      loadSubscription();
    } catch (error) {
      toast({ title: "Failed to pause subscription", variant: "destructive" });
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await base44.entities.BusinessSubscription.update(subscription.id, {
        status: "active"
      });
      toast({ title: "Subscription resumed successfully" });
      loadSubscription();
    } catch (error) {
      toast({ title: "Failed to resume subscription", variant: "destructive" });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await base44.entities.BusinessSubscription.update(subscription.id, {
        status: "cancelled"
      });
      toast({ title: "Subscription cancelled" });
      setShowCancelDialog(false);
      loadSubscription();
    } catch (error) {
      toast({ title: "Failed to cancel subscription", variant: "destructive" });
    }
  };

  const handleUpdateProducts = async () => {
    try {
      await base44.entities.BusinessSubscription.update(subscription.id, {
        selected_products: selectedProducts,
        selected_colors: selectedColors
      });
      toast({ title: "Products updated successfully" });
      setShowProductsDialog(false);
      loadSubscription();
    } catch (error) {
      toast({ title: "Failed to update products", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      await base44.entities.BusinessSubscription.update(subscription.id, {
        logo_url: data.file_url
      });
      toast({ title: "Logo uploaded successfully" });
      loadSubscription();
    } catch (error) {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    }
  };

  if (loading) {
    return <div>Loading subscription...</div>;
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">You don't have an active subscription yet.</p>
          <Button onClick={() => window.location.href = '/pages/BusinessSubscriptions'}>
            Start Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getMaxColors = () => Math.floor(subscription.items_per_month / 100) * 4;
  const currentPlan = plans.find(p => p.id === subscription.plan_type);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Subscription Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-500">Plan</Label>
              <p className="text-lg font-semibold">{subscription.items_per_month} Items / Month</p>
            </div>
            <div>
              <Label className="text-gray-500">Status</Label>
              <Badge className={
                subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {subscription.status}
              </Badge>
            </div>
            <div>
              <Label className="text-gray-500">Next Production Date</Label>
              <p className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(subscription.next_production_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-gray-500">Monthly Cost</Label>
              <p className="text-lg font-semibold">${subscription.monthly_price}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Selected Products ({selectedProducts.length})</CardTitle>
          <Button onClick={() => setShowProductsDialog(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Change Products
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {selectedProducts.map((sp, i) => {
              const product = products.find(p => p.id === sp.product_id);
              return product ? (
                <div key={i} className="border rounded-lg p-2">
                  <img src={product.images?.[0]} className="w-full aspect-[4/3] object-cover rounded mb-2" />
                  <p className="text-sm font-semibold">{product.name}</p>
                </div>
              ) : null;
            })}
          </div>
          <div className="mt-4">
            <Label>Selected Colors</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedColors.map(color => (
                <Badge key={color} variant="outline">{color}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo / Branding</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription.logo_url ? (
            <div>
              <img src={subscription.logo_url} className="w-32 h-32 object-contain border rounded mb-4" />
              <Label htmlFor="logo-update">Update Logo</Label>
              <Input id="logo-update" type="file" accept="image/*" onChange={handleLogoUpload} />
            </div>
          ) : (
            <div>
              <Label htmlFor="logo-upload">Upload Logo</Label>
              <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {subscription.status === 'active' ? (
            <Button onClick={handlePauseSubscription} variant="outline">
              <Pause className="w-4 h-4 mr-2" />
              Pause Subscription
            </Button>
          ) : subscription.status === 'paused' ? (
            <Button onClick={handleResumeSubscription}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Resume Subscription
            </Button>
          ) : null}
          <Button onClick={() => setShowCancelDialog(true)} variant="destructive">
            <XCircle className="w-4 h-4 mr-2" />
            Cancel Subscription
          </Button>
        </CardContent>
      </Card>

      {/* Change Products Dialog */}
      <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Products & Colors</DialogTitle>
            <DialogDescription>
              Select {currentPlan?.selections} products and up to {getMaxColors()} colors
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(product => {
                const isSelected = selectedProducts.some(p => p.product_id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedProducts(selectedProducts.filter(p => p.product_id !== product.id));
                      } else if (selectedProducts.length < (currentPlan?.selections || 0)) {
                        setSelectedProducts([...selectedProducts, { product_id: product.id, quantity: 50 }]);
                      }
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer ${
                      isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <img src={product.images?.[0]} className="w-full aspect-[4/3] object-cover rounded mb-2" />
                    <p className="text-sm font-semibold">{product.name}</p>
                  </div>
                );
              })}
            </div>

            <div>
              <Label>Color Selection</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {availableColors.map(color => (
                  <div key={color} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedColors.includes(color)}
                      onCheckedChange={(checked) => {
                        if (checked && selectedColors.length < getMaxColors()) {
                          setSelectedColors([...selectedColors, color]);
                        } else if (!checked) {
                          setSelectedColors(selectedColors.filter(c => c !== color));
                        }
                      }}
                      disabled={!selectedColors.includes(color) && selectedColors.length >= getMaxColors()}
                    />
                    <Label className="text-sm">{color}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleUpdateProducts} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription}>
              Confirm Cancellation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}