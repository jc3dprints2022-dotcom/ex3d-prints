import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShoppingBag, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRODUCT_IMAGE_MAP = {
  "693b06e655e441e07049d328": "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png",
  "69dbf08433850e148542d876": "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png",
};

// Read anonymous cart from localStorage (written by the landing page for guest users)
function anonymousCartGet() {
  try { return JSON.parse(localStorage.getItem("anonymousCart") || "[]"); }
  catch { return []; }
}

export default function Checkout() {
  const [user, setUser]               = useState(null);
  const [cartItems, setCartItems]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);
  const [couponCode, setCouponCode]   = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: "", phone: "", street: "", city: "", state: "", zip: "",
  });
  const [savedAddresses, setSavedAddresses]   = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => { await initializeCheckout(); })();
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) return;
    if (typeof window.axon !== "function") return;
    const subtotal = cartItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
    window.axon("track", "begin_checkout", {
      currency: "USD",
      value: subtotal,
      items: cartItems.map(i => ({
        item_id: i.product_id,
        item_name: i.product_name,
        price: i.unit_price,
        quantity: i.quantity,
      })),
    });
  }, [cartItems]);

  const initializeCheckout = async () => {
    try {
      // Try to get logged-in user — but don't redirect if they're a guest
      const currentUser = await base44.auth.me().catch(() => null);
      setUser(currentUser);

      if (currentUser) {
        // Logged-in flow: load from DB, pre-fill address from profile
        const addresses = currentUser.saved_addresses || [];
        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          setShippingAddress(defaultAddr);
          setSelectedAddressId(defaultAddr.id || "");
          await loadCartFromDB(currentUser.id, defaultAddr);
        } else {
          setShippingAddress({
            name: currentUser.full_name || "",
            phone: currentUser.phone || "",
            street: currentUser.address?.street || "",
            city: currentUser.address?.city || "",
            state: currentUser.address?.state || "",
            zip: currentUser.address?.zip || "",
          });
          await loadCartFromDB(currentUser.id, null);
        }
      } else {
        // Guest flow: load from localStorage, no address pre-fill
        loadCartFromLocalStorage();
      }
    } catch (error) {
      console.error("Checkout init error:", error);
      // If something unexpected fails, still try localStorage
      loadCartFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Logged-in user: load cart items from DB and enrich with product data
  const loadCartFromDB = async (userId, prefilledAddr = null) => {
    try {
      const cart = await base44.entities.Cart.filter({ user_id: userId });
      const enrichedItems = [];

      for (const item of cart) {
        try {
          if (item.custom_request_id) {
            const customRequest = await base44.entities.CustomPrintRequest.get(item.custom_request_id);
            enrichedItems.push({
              ...item,
              product_name: customRequest.title,
              print_files: customRequest.files || [],
              print_time_hours: customRequest.print_time_hours,
              weight_grams: customRequest.weight_grams,
              dimensions: customRequest.dimensions,
              images: customRequest.images || [],
              multi_color: false,
              is_custom_request: true,
            });
          } else {
            const product = await base44.entities.Product.get(item.product_id);
            enrichedItems.push({
              ...item,
              product_name: product.name,
              print_files: product.print_files || [],
              print_time_hours: product.print_time_hours,
              weight_grams: product.weight_grams,
              dimensions: product.dimensions,
              images: product.images || item.images || [],
              multi_color: product.multi_color,
              designer_id: product.designer_id,
              is_custom_request: false,
            });
          }
        } catch (err) {
          console.error("Failed to load product for cart item:", err);
          enrichedItems.push({
            ...item,
            product_name: item.product_name || "Unknown Product",
            print_files: [],
            images: item.images || [],
            multi_color: false,
            is_custom_request: !!item.custom_request_id,
          });
        }
      }

      setCartItems(enrichedItems);

      // Auto-calculate shipping if we already have an address
      if (prefilledAddr?.street && prefilledAddr?.city && prefilledAddr?.state && prefilledAddr?.zip) {
        await calculateShippingCost(prefilledAddr, enrichedItems);
      }
    } catch (error) {
      console.error("Failed to load cart from DB:", error);
      toast({ title: "Cart load failed", description: error.message, variant: "destructive" });
    }
  };

  // Guest: load cart from localStorage — images are stored directly on the item
  const loadCartFromLocalStorage = () => {
    const items = anonymousCartGet();
    setCartItems(items);
  };

  const calculateShippingCost = async (addr, items = cartItems) => {
    if (!addr?.street || !addr?.city || !addr?.state || !addr?.zip) return;
    setCalculatingShipping(true);
    try {
      const res = await base44.functions.invoke("getEstimatedShipping", {
        shippingAddress: addr,
        items: items.map(i => ({
          weight_grams: i.weight_grams,
          dimensions: i.dimensions,
          quantity: i.quantity,
        })),
      });
      if (res.data?.shipping_cost !== undefined) setShippingCost(res.data.shipping_cost);
    } catch {
      setShippingCost(5.99); // safe fallback
    }
    setCalculatingShipping(false);
  };

  const calculateSubtotal = () => cartItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
  const getShippingFee = () => shippingCost !== null ? shippingCost : (calculateSubtotal() < 35 ? 5.99 : 0);
  const calculateTotal = () => calculateSubtotal() + getShippingFee();
  const formatPrice = (price) => `$${Number(price).toFixed(2)}`;

  const handleAddressChange = (field, value) => {
    const updated = { ...shippingAddress, [field]: value };
    setShippingAddress(updated);
    // Recalculate shipping when zip/state/city complete
    if (updated.street && updated.city && updated.state && updated.zip) {
      calculateShippingCost(updated);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }
    if (!shippingAddress.name || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      toast({ title: "Delivery address required", description: "Please fill in all address fields.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const shippingFee = getShippingFee();

      const invalidItems = cartItems.filter(item =>
        !item.product_id || !item.product_name ||
        item.unit_price === undefined || item.unit_price === null ||
        item.quantity === undefined || item.quantity === null
      );
      if (invalidItems.length > 0) {
        throw new Error("Some cart items are missing required data. Please refresh your cart.");
      }

      const checkoutData = {
        cartItems: cartItems.map(item => ({
          ...item,
          custom_request_id: item.custom_request_id || (item.is_custom_request ? item.product_id : undefined),
        })),
        successUrl: `${window.location.origin}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/Checkout?payment=cancelled`,
        couponCode: couponCode.trim().toUpperCase() === "JC3DTESTFREEDOM"
          ? "JC3DTESTFREEDOM"
          : (couponCode.trim() || undefined),
        referralCode: referralCode.trim().toUpperCase() || undefined,
        isPriority: false,
        shippingAddress,
        shippingFee,
        isLocalDelivery: false,
        // For guests, pass their email if they entered it in the address field
        guestEmail: user ? undefined : (shippingAddress.email || undefined),
      };

      const response = await base44.functions.invoke("createCheckoutSession", checkoutData);

      if (response.data?.url) {
        localStorage.setItem("axon_pending_purchase", JSON.stringify({
          items: cartItems.map(i => ({
            item_id: i.product_id,
            item_name: i.product_name,
            price: i.unit_price,
            quantity: i.quantity,
          })),
          value: calculateSubtotal(),
          shipping: shippingFee,
          tax: 0,
        }));
        // Clear anonymous cart once checkout begins
        if (!user) localStorage.removeItem("anonymousCart");
        window.location.href = response.data.url;
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      } else {
        throw new Error("No checkout URL received from payment service.");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred.";
      toast({ title: "Checkout failed", description: errorMessage, variant: "destructive" });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <Button onClick={() => (window.location.href = "/Marketplace")}>Return to Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12 mb-16 sm:mb-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Checkout</h1>

      <form onSubmit={handleCheckout}>
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Order summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const imageUrl = PRODUCT_IMAGE_MAP[item.product_id] || item.images?.[0] || null;
                    return (
                      <div key={item.id} className="flex gap-3 pb-4 border-b last:border-b-0 items-start">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.product_name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded flex-shrink-0 bg-gray-100"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">
                            {item.product_name}
                          </h3>
                          {item.is_custom_request && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                              Custom Quote
                            </span>
                          )}
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <p>{item.selected_material} · {item.selected_color}</p>
                            <p>Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm sm:text-base text-gray-900 flex-shrink-0 whitespace-nowrap">
                          {formatPrice(item.total_price)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Delivery address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Saved addresses (logged-in users only) */}
                {savedAddresses.length > 0 && (
                  <div>
                    <Label className="mb-2">Saved Addresses</Label>
                    <Select
                      value={selectedAddressId}
                      onValueChange={(value) => {
                        if (value === "new") {
                          setSelectedAddressId("");
                          setShippingAddress({ name: user?.full_name || "", phone: user?.phone || "", street: "", city: "", state: "", zip: "" });
                        } else {
                          const addr = savedAddresses.find(a => a.id === value);
                          if (addr) {
                            setShippingAddress(addr);
                            setSelectedAddressId(value);
                            calculateShippingCost(addr);
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an address or enter new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Enter New Address</SelectItem>
                        {savedAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.name} — {addr.street}, {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Full Name *</Label>
                    <Input id="name" value={shippingAddress.name}
                      onChange={(e) => handleAddressChange("name", e.target.value)} required className="text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Phone *</Label>
                    <Input id="phone" value={shippingAddress.phone}
                      onChange={(e) => handleAddressChange("phone", e.target.value)} required className="text-sm" />
                  </div>
                </div>

                {/* Email field shown for guests only (Stripe needs it) */}
                {!user && (
                  <div>
                    <Label htmlFor="email" className="text-sm">Email * (for order confirmation)</Label>
                    <Input id="email" type="email" value={shippingAddress.email || ""}
                      onChange={(e) => handleAddressChange("email", e.target.value)} required className="text-sm" />
                  </div>
                )}

                <div>
                  <Label htmlFor="street" className="text-sm">Street Address *</Label>
                  <Input id="street" value={shippingAddress.street}
                    onChange={(e) => handleAddressChange("street", e.target.value)} required className="text-sm" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="city" className="text-sm">City *</Label>
                    <Input id="city" value={shippingAddress.city}
                      onChange={(e) => handleAddressChange("city", e.target.value)} required className="text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm">State *</Label>
                    <Input id="state" value={shippingAddress.state} maxLength={2} placeholder="AZ"
                      onChange={(e) => handleAddressChange("state", e.target.value)} required className="text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-sm">ZIP *</Label>
                    <Input id="zip" value={shippingAddress.zip}
                      onChange={(e) => handleAddressChange("zip", e.target.value)} required className="text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Promo / referral */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Promo Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="coupon" className="text-sm">Coupon Code</Label>
                  <Input id="coupon" value={couponCode} placeholder="Enter code"
                    onChange={(e) => setCouponCode(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label htmlFor="referral" className="text-sm">Referral Code (optional)</Label>
                  <Input id="referral" value={referralCode} placeholder="Enter code"
                    onChange={(e) => setReferralCode(e.target.value)} className="text-sm" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price summary + place order */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>
                      {calculatingShipping
                        ? <Loader2 className="w-4 h-4 animate-spin inline" />
                        : formatPrice(getShippingFee())}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-teal-600">{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  size="lg"
                  disabled={processing || calculatingShipping}
                >
                  {processing
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                    : "Place Order"}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  You'll enter your payment info on the next screen.
                </p>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    🌱 We encourage makers to use recycled filament — committed to 100% recycled materials by 2030.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}