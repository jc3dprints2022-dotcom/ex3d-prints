import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Check, Upload, Building2, Package } from "lucide-react";

export default function BusinessSubscriptions() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [coreProducts, setCoreProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    shipping_address: { street: "", city: "", state: "", zip: "" }
  });
  const [hasLogoPers, setHasLogoPers] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const availableColors = [
    "Red", "Blue", "Green", "Yellow", "Orange", "Purple", 
    "Pink", "Brown", "Misc (Any Available)"
  ];

  const plans = [
    { id: "100_items", items: 100, selections: 2, monthlyPrice: 150, yearlyPrice: 1620, perItemMonthly: 1.50, perItemYearly: 1.35 },
    { id: "200_items", items: 200, selections: 4, monthlyPrice: 250, yearlyPrice: 2700, perItemMonthly: 1.25, perItemYearly: 1.13 },
    { id: "500_items", items: 500, selections: 10, monthlyPrice: 500, yearlyPrice: 5400, perItemMonthly: 1.00, perItemYearly: 0.90 }
  ];

  const oneTimePlan = { id: "one_time", items: 50, selections: 1, price: 75, perItem: 1.50 };

  useEffect(() => {
    loadCoreProducts();
  }, []);

  const loadCoreProducts = async () => {
    try {
      const products = await base44.entities.Product.list();
      const coreNames = [
        "Rotating Rings Toy",
        "Interlocking Stars - Fidget Toy",
        "Cone Fidget Passthrough",
        "Infinity Cube",
        "Toothbrush Travel Case"
      ];
      const core = products.filter(p => coreNames.includes(p.name));
      setCoreProducts(core);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  const getAllowedSelections = () => {
    return 3; // Max 3 items regardless of plan
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
    if (selectedProducts.length === 0) {
      toast({ title: "Please select at least one product", variant: "destructive" });
      return;
    }

    if (!businessInfo.business_name || !businessInfo.email || !businessInfo.contact_name || !businessInfo.phone) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!businessInfo.shipping_address.street || !businessInfo.shipping_address.city || 
        !businessInfo.shipping_address.state || !businessInfo.shipping_address.zip) {
      toast({ title: "Please complete the address", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const totalItems = selectedPlan.id === "one_time" ? selectedPlan.items * bulkQuantity : selectedPlan.items;
      const totalPrice = selectedPlan.id === "one_time" ? selectedPlan.price * bulkQuantity : selectedPlan.price;
      const productionWeeks = Math.ceil(totalItems / 150);
      const nextProdDate = new Date();
      nextProdDate.setDate(nextProdDate.getDate() + (productionWeeks * 7));

      const subscription = await base44.entities.BusinessSubscription.create({
        ...businessInfo,
        plan_type: selectedPlan.id,
        items_per_month: totalItems,
        monthly_price: totalPrice,
        selected_products: selectedProducts,
        selected_colors: selectedColors.length > 0 ? selectedColors : ["Misc (Any Available)"],
        has_logo_personalization: hasLogoPers,
        production_weeks: productionWeeks,
        next_production_date: nextProdDate.toISOString().split('T')[0],
        status: "pending"
      });

      const isSubscription = selectedPlan.id !== "one_time";
      const response = await base44.functions.invoke('createBusinessCheckout', {
        subscriptionId: subscription.id,
        planType: selectedPlan.id,
        amount: totalPrice,
        isSubscription,
        billingCycle
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast({ title: "Checkout failed: " + error.message, variant: "destructive" });
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Building2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Subscription Plans
          </h1>
          <p className="text-xl text-gray-600">
            Locally produced. Customizable. Delivered monthly.
          </p>
        </div>

        {/* Step 1: Product Selection & Business Info */}
        {step === 1 && (
          <div className="space-y-8">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Product Selection
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Select up to {getAllowedSelections()} products ({selectedProducts.length} selected)
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
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
                          <img src={product.images[0]} alt={product.name} className="w-full aspect-[4/3] object-cover rounded-lg mb-3" />
                        )}
                        <h3 className="font-semibold text-sm">{product.name}</h3>
                        {isSelected && <Check className="w-6 h-6 text-purple-600 mt-2" />}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-6">
                  <Label>Color Selection</Label>
                  <p className="text-xs text-gray-500 mb-2">Select colors that will be evenly applied across your products</p>
                  <Select
                    value={selectedColors.join(',')}
                    onValueChange={(value) => {
                      const colors = value ? value.split(',') : [];
                      setSelectedColors(colors);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select colors">
                        {selectedColors.length > 0 ? `${selectedColors.length} colors selected` : "Select colors"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableColors.map(color => (
                        <div key={color} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-100">
                          <Checkbox
                            checked={selectedColors.includes(color)}
                            onCheckedChange={(checked) => {
                              if (checked && selectedColors.length < 4) {
                                setSelectedColors([...selectedColors, color]);
                              } else if (!checked) {
                                setSelectedColors(selectedColors.filter(c => c !== color));
                              }
                            }}
                            disabled={!selectedColors.includes(color) && selectedColors.length >= 4}
                          />
                          <span className="text-sm">{color}</span>
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedColors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedColors.map(color => (
                        <Badge key={color} variant="outline" className="cursor-pointer" onClick={() => {
                          setSelectedColors(selectedColors.filter(c => c !== color));
                        }}>
                          {color} ×
                        </Badge>
                      ))}
                    </div>
                  )}
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
                      required
                    />
                  </div>
                  <div>
                    <Label>Contact Name *</Label>
                    <Input
                      value={businessInfo.contact_name}
                      onChange={(e) => setBusinessInfo({...businessInfo, contact_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo({...businessInfo, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={businessInfo.phone}
                      onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Address *</Label>
                  <Input
                    placeholder="Street"
                    value={businessInfo.shipping_address.street}
                    onChange={(e) => setBusinessInfo({
                      ...businessInfo,
                      shipping_address: {...businessInfo.shipping_address, street: e.target.value}
                    })}
                    className="mb-2"
                    required
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="City"
                      value={businessInfo.shipping_address.city}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, city: e.target.value}
                      })}
                      required
                    />
                    <Input
                      placeholder="State"
                      value={businessInfo.shipping_address.state}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, state: e.target.value}
                      })}
                      required
                    />
                    <Input
                      placeholder="ZIP"
                      value={businessInfo.shipping_address.zip}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        shipping_address: {...businessInfo.shipping_address, zip: e.target.value}
                      })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={hasLogoPers} onCheckedChange={setHasLogoPers} />
                  <Label>Add Logo Personalization (when applicable)</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={selectedProducts.length === 0} className="bg-purple-600 hover:bg-purple-700 h-14 px-12 text-lg">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {step === 2 && (
          <>
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={billingCycle === "monthly" ? "default" : "outline"}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "yearly" ? "default" : "outline"}
                onClick={() => setBillingCycle("yearly")}
                className="relative"
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save 10%
                </span>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {plans.map(plan => {
                const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                const perItem = billingCycle === "monthly" ? plan.perItemMonthly : plan.perItemYearly;
                return (
                  <Card key={plan.id} className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-purple-500">
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl">{plan.items} Items / Month</CardTitle>
                      <div className="text-4xl font-bold text-purple-600 my-4">
                        ${price}
                        <span className="text-lg text-gray-600">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                      </div>
                      <p className="text-sm text-gray-600">${perItem.toFixed(2)} per item</p>
                    </CardHeader>
                    <CardContent className="text-center">
                      <Button onClick={() => handlePlanSelect({...plan, price, perItem})} className="w-full bg-purple-600 hover:bg-purple-700">
                        Select Plan
                      </Button>
                      <p className="text-xs text-gray-500 mt-3">
                        {billingCycle === "monthly" ? "Subscription renews monthly" : "Billed annually"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">One-Time Bulk Purchase</h3>
              <Card className="max-w-md mx-auto border-2 hover:border-purple-500 hover:shadow-xl transition-shadow">
                <CardHeader className="text-center">
                  <CardTitle>50 Items per Unit</CardTitle>
                  <div className="text-4xl font-bold text-purple-600 my-4">
                    ${oneTimePlan.price * bulkQuantity}
                  </div>
                  <p className="text-sm text-gray-600">${oneTimePlan.perItem.toFixed(2)} per item</p>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <Label>Quantity (50 items per unit)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-center text-lg font-semibold mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Total: {oneTimePlan.items * bulkQuantity} items</p>
                  </div>
                  <Button onClick={() => handlePlanSelect({...oneTimePlan, price: oneTimePlan.price * bulkQuantity})} className="w-full bg-gray-800 hover:bg-gray-900">
                    Select Plan
                  </Button>
                  <p className="text-xs text-gray-500">No recurring billing</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            </div>
          </>
        )}

        {/* Step 3: Checkout */}
        {step === 3 && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Plan</Label>
                  <p className="font-semibold">{selectedPlan.items} Items / Month - ${selectedPlan.price}</p>
                </div>
                <div>
                  <Label>Selected Products</Label>
                  <p className="text-sm">{selectedProducts.length} products selected</p>
                </div>
                <div>
                  <Label>Colors</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedColors.map(c => <Badge key={c}>{c}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
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