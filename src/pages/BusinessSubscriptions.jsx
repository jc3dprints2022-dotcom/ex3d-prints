import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Check, Upload, Building2, Package } from "lucide-react";

export default function BusinessSubscriptions() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [coreProducts, setCoreProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    shipping_address: { street: "", city: "", state: "", zip: "" }
  });
  const [hasLogoPers, setHasLogoPers] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const plans = [
    { id: "100_items", items: 100, price: 300, perItem: 3.00 },
    { id: "200_items", items: 200, price: 500, perItem: 2.50 },
    { id: "550_items", items: 550, price: 1200, perItem: 2.18 }
  ];

  const oneTimePlan = { id: "one_time", items: 50, price: 175, perItem: 3.50 };

  useEffect(() => {
    loadCoreProducts();
  }, []);

  const loadCoreProducts = async () => {
    try {
      const products = await base44.entities.Product.list();
      const core = products.filter(p => p.is_core_business_product === true).slice(0, 5);
      setCoreProducts(core);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const getAllowedSelections = () => {
    if (!selectedPlan) return 0;
    return Math.floor(selectedPlan.items / 50);
  };

  const handleProductSelect = (productId) => {
    const maxSelections = getAllowedSelections();
    const currentIndex = selectedProducts.findIndex(p => p.product_id === productId);
    
    if (currentIndex >= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    } else {
      if (selectedProducts.length < maxSelections) {
        setSelectedProducts([...selectedProducts, { product_id: productId, quantity: 50 }]);
      }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      setLogoFile(data.file_url);
      toast({ title: "Logo uploaded successfully" });
    } catch (error) {
      toast({ title: "Logo upload failed", variant: "destructive" });
    }
  };

  const handleCheckout = async () => {
    if (selectedProducts.length !== getAllowedSelections()) {
      toast({ title: `Please select exactly ${getAllowedSelections()} products`, variant: "destructive" });
      return;
    }

    if (!businessInfo.business_name || !businessInfo.email) {
      toast({ title: "Please fill in required business information", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      // Create subscription in database
      const productionWeeks = Math.ceil(selectedPlan.items / 150);
      const nextProdDate = new Date();
      nextProdDate.setDate(nextProdDate.getDate() + (productionWeeks * 7));

      const subscription = await base44.entities.BusinessSubscription.create({
        ...businessInfo,
        plan_type: selectedPlan.id,
        items_per_month: selectedPlan.items,
        monthly_price: selectedPlan.price,
        selected_products: selectedProducts,
        has_logo_personalization: hasLogoPers,
        logo_url: logoFile,
        production_weeks: productionWeeks,
        next_production_date: nextProdDate.toISOString().split('T')[0],
        status: "pending"
      });

      // Create Stripe checkout session
      const isSubscription = selectedPlan.id !== "one_time";
      const { data } = await base44.functions.invoke('createBusinessCheckout', {
        subscriptionId: subscription.id,
        planType: selectedPlan.id,
        amount: selectedPlan.price,
        isSubscription
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast({ title: "Checkout failed", variant: "destructive" });
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Building2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Custom Pediatric Engagement Rewards — Subscription Plans
          </h1>
          <p className="text-xl text-gray-600">
            Locally produced. Customizable. Delivered monthly.
          </p>
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {plans.map(plan => (
                <Card key={plan.id} className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-purple-500">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.items} Items / Month</CardTitle>
                    <div className="text-4xl font-bold text-purple-600 my-4">
                      ${plan.price}
                      <span className="text-lg text-gray-600">/mo</span>
                    </div>
                    <p className="text-sm text-gray-600">${plan.perItem.toFixed(2)} per item</p>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button onClick={() => handlePlanSelect(plan)} className="w-full bg-purple-600 hover:bg-purple-700">
                      Select Plan
                    </Button>
                    <p className="text-xs text-gray-500 mt-3">Subscription renews monthly</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">One-Time Bulk Purchase</h3>
              <Card className="max-w-md mx-auto border-2 hover:border-purple-500 hover:shadow-xl transition-shadow">
                <CardHeader className="text-center">
                  <CardTitle>{oneTimePlan.items} Items</CardTitle>
                  <div className="text-4xl font-bold text-purple-600 my-4">
                    ${oneTimePlan.price}
                  </div>
                  <p className="text-sm text-gray-600">${oneTimePlan.perItem.toFixed(2)} per item</p>
                </CardHeader>
                <CardContent className="text-center">
                  <Button onClick={() => handlePlanSelect(oneTimePlan)} className="w-full bg-gray-800 hover:bg-gray-900">
                    One-Time Purchase
                  </Button>
                  <p className="text-xs text-gray-500 mt-3">No recurring billing</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Step 2: Product Selection & Business Info */}
        {step === 2 && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Product Selection
                </CardTitle>
                <p className="text-sm text-gray-600">
                  You may select {getAllowedSelections()} different items ({selectedProducts.length} selected)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coreProducts.map(product => {
                    const isSelected = selectedProducts.some(p => p.product_id === product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                        )}
                        <h3 className="font-semibold">{product.name}</h3>
                        {isSelected && <Check className="w-6 h-6 text-purple-600 mt-2" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      value={businessInfo.business_name}
                      onChange={(e) => setBusinessInfo({...businessInfo, business_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={businessInfo.contact_name}
                      onChange={(e) => setBusinessInfo({...businessInfo, contact_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo({...businessInfo, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={businessInfo.phone}
                      onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Shipping Address</Label>
                  <Input
                    placeholder="Street"
                    value={businessInfo.shipping_address.street}
                    onChange={(e) => setBusinessInfo({
                      ...businessInfo,
                      shipping_address: {...businessInfo.shipping_address, street: e.target.value}
                    })}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="City"
                      value={businessInfo.shipping_address.city}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, city: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="State"
                      value={businessInfo.shipping_address.state}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, state: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="ZIP"
                      value={businessInfo.shipping_address.zip}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, zip: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={hasLogoPers} onCheckedChange={setHasLogoPers} />
                  <Label>Add Logo Personalization (when applicable)</Label>
                </div>

                {hasLogoPers && (
                  <div>
                    <Label>Upload Logo</Label>
                    <Input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} />
                    <p className="text-xs text-gray-500 mt-1">Logo will be applied to compatible products only.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCheckout} disabled={processing} className="bg-purple-600 hover:bg-purple-700">
                {processing ? "Processing..." : "Proceed to Checkout"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}