import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CreditCard, Package, MapPin, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

export default function BusinessCheckout() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("shipping");
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    taxId: "",
    address: { street: "", city: "", state: "", zip: "" }
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.business_buyer_info) {
        setBusinessInfo({
          businessName: currentUser.business_buyer_info.business_name || "",
          taxId: currentUser.business_buyer_info.tax_id || "",
          address: currentUser.business_address || { street: "", city: "", state: "", zip: "" }
        });
      }

      const items = await base44.entities.Cart.filter({
        user_id: currentUser.id,
        marketplace_type: 'business'
      });

      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await base44.entities.Product.get(item.product_id);
          return { ...item, product };
        })
      );

      setCartItems(itemsWithProducts);

      // Check if all items are eligible for local delivery
      const allEligible = itemsWithProducts.every(item => item.product?.local_delivery_eligible);
      if (!allEligible) {
        setDeliveryMethod("shipping");
      }
    } catch (error) {
      console.error("Failed to load checkout data:", error);
      toast({ title: "Error loading checkout", variant: "destructive" });
    }
    setLoading(false);
  };

  const calculateBulkDiscount = () => {
    const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    if (totalUnits >= 100) return { percentage: 15, amount: subtotal * 0.15 };
    if (totalUnits >= 50) return { percentage: 10, amount: subtotal * 0.1 };
    return { percentage: 0, amount: 0 };
  };

  const handleCheckout = async () => {
    if (!businessInfo.businessName || !businessInfo.address.street) {
      toast({ title: "Please complete business information", variant: "destructive" });
      return;
    }

    // Check minimum order quantity of 30 for business accounts
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity < 30) {
      toast({ 
        title: "Minimum order not met", 
        description: `Please order at least 30 total items to proceed. Current: ${totalQuantity} items`,
        variant: "destructive" 
      });
      return;
    }

    setProcessing(true);
    try {
      // Update user business info
      await base44.auth.updateMe({
        business_buyer_info: {
          business_name: businessInfo.businessName,
          tax_id: businessInfo.taxId
        },
        business_address: businessInfo.address
      });

      const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
      const bulkDiscount = calculateBulkDiscount();
      const shippingFee = deliveryMethod === "shipping" ? 25 : 0;
      const total = subtotal - bulkDiscount.amount + shippingFee;

      // Create checkout session
      const { data } = await base44.functions.invoke('createBusinessCheckout', {
        cartItems: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        deliveryMethod,
        recurringEnabled,
        frequency,
        businessInfo,
        bulkDiscount: bulkDiscount.amount,
        total
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Your business cart is empty</p>
          <Button asChild>
            <a href={createPageUrl("BusinessMarketplace")}>Browse Products</a>
          </Button>
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
  const bulkDiscount = calculateBulkDiscount();
  const total = subtotal - bulkDiscount.amount;
  const allLocalEligible = cartItems.every(item => item.product?.local_delivery_eligible);

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 mb-16 sm:mb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Business Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Business Information */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Business Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Business Name *</label>
                    <Input
                      value={businessInfo.businessName}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                      placeholder="Your Business Name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Delivery Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Street Address *</label>
                    <Input
                      value={businessInfo.address.street}
                      onChange={(e) => setBusinessInfo({
                        ...businessInfo,
                        address: { ...businessInfo.address, street: e.target.value }
                      })}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium mb-1">City *</label>
                      <Input
                        value={businessInfo.address.city}
                        onChange={(e) => setBusinessInfo({
                          ...businessInfo,
                          address: { ...businessInfo.address, city: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State *</label>
                      <Input
                        value={businessInfo.address.state}
                        onChange={(e) => setBusinessInfo({
                          ...businessInfo,
                          address: { ...businessInfo.address, state: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ZIP *</label>
                      <Input
                        value={businessInfo.address.zip}
                        onChange={(e) => setBusinessInfo({
                          ...businessInfo,
                          address: { ...businessInfo.address, zip: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Delivery Method</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="local"
                      checked={deliveryMethod === "local"}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                    />
                    <Package className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Local Delivery</div>
                      <div className="text-sm text-gray-500">Standard</div>
                    </div>
                  </label>
                  {allLocalEligible && (
                    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="delivery"
                        value="shipping"
                        checked={deliveryMethod === "local"}
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                      />
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">Ship to Address</div>
                        <div className="text-sm text-gray-500">Shipped delivery</div>
                      </div>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recurring Orders */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={recurringEnabled}
                    onCheckedChange={setRecurringEnabled}
                  />
                  <div>
                    <div className="font-bold">Make this a recurring reorder</div>
                    <div className="text-sm text-gray-500">Automatic delivery on schedule</div>
                  </div>
                </div>

                {recurringEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                <div className="space-y-2 mb-4 sm:mb-6 max-h-48 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="truncate flex-1 min-w-0">{item.product_name} x{item.quantity}</span>
                      <span className="flex-shrink-0 font-medium">${item.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryMethod === "shipping" && (
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-medium">$25.00</span>
                    </div>
                  )}
                  {deliveryMethod === "local" && (
                    <div className="flex justify-between text-green-600">
                      <span>Local Delivery</span>
                      <span className="font-semibold">FREE</span>
                    </div>
                  )}
                  {bulkDiscount.percentage > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({bulkDiscount.percentage}%)</span>
                      <span className="font-semibold">-${bulkDiscount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between text-lg md:text-xl font-bold">
                    <span>Total</span>
                    <span className="text-purple-600">${(total + (deliveryMethod === "shipping" ? 25 : 0)).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={processing}
                  size="lg"
                  className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                >
                  {processing ? "Processing..." : recurringEnabled ? "Subscribe & Pay" : "Pay Now"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}