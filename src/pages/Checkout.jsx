import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShoppingBag, MapPin, CreditCard, Tag, Users, Building } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
];

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isPriority, setIsPriority] = useState(() => {
    // Load priority state from localStorage
    const saved = localStorage.getItem('checkout_priority');
    return saved === 'true';
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: ""
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isLocalDelivery, setIsLocalDelivery] = useState(false);
  const { toast } = useToast();

  // Persist priority state to localStorage
  useEffect(() => {
    localStorage.setItem('checkout_priority', isPriority.toString());
  }, [isPriority]);

  useEffect(() => {
    (async () => {
      await initializeCheckout();
    })();
  }, []);

  const initializeCheckout = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        toast({ title: "Please sign in to checkout", variant: "destructive" });
        await base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(currentUser);
      
      // Load saved addresses
      const addresses = currentUser.saved_addresses || [];
      setSavedAddresses(addresses);
      
      // Pre-fill with default address or user info
      if (addresses.length > 0) {
        const defaultAddr = addresses.find(addr => addr.is_default) || addresses[0];
        setShippingAddress(defaultAddr);
        setSelectedAddressId(defaultAddr.id || "");
      } else {
        setShippingAddress({
          name: currentUser.full_name || "",
          phone: currentUser.phone || "",
          street: currentUser.address?.street || "",
          city: currentUser.address?.city || "",
          state: currentUser.address?.state || "",
          zip: currentUser.address?.zip || ""
        });
      }
      
      await loadCart(currentUser.id);
    } catch (error) {
      console.error("Auth error:", error);
      toast({ title: "Sign-in required", description: "Please log in again." });
      await base44.auth.redirectToLogin(window.location.href);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async (userId) => {
    try {
      const cart = await base44.entities.Cart.filter({ user_id: userId });
      console.log('=== Checkout: Cart Items Loaded ===', cart);

      const enrichedItems = [];
      for (const item of cart) {
        try {
          console.log('Processing cart item:', item);
          
          // Check if this is a custom request
          if (item.custom_request_id) {
            console.log('Loading custom request:', item.custom_request_id);
            const customRequest = await base44.entities.CustomPrintRequest.get(item.custom_request_id);
            console.log('Custom request loaded:', customRequest);
            
            enrichedItems.push({
              ...item,
              product_name: customRequest.title,
              print_files: customRequest.files || [],
              print_time_hours: customRequest.print_time_hours,
              weight_grams: customRequest.weight_grams,
              dimensions: customRequest.dimensions,
              images: customRequest.images || [],
              multi_color: false,
              is_custom_request: true
            });
          } else {
            // Regular product
            console.log('Loading regular product:', item.product_id);
            const product = await base44.entities.Product.get(item.product_id);
            console.log('Product loaded:', product);
            
            enrichedItems.push({
              ...item,
              product_name: product.name,
              print_files: product.print_files || [],
              print_time_hours: product.print_time_hours,
              weight_grams: product.weight_grams,
              dimensions: product.dimensions,
              images: product.images,
              multi_color: product.multi_color,
              designer_id: product.designer_id,
              is_custom_request: false
            });
          }
        } catch (err) {
          console.error("Failed to load item:", item.product_id, err);
          // Use fallback data from cart item
          enrichedItems.push({
            ...item,
            product_name: item.product_name || 'Unknown Product',
            print_files: [],
            images: [],
            multi_color: false,
            is_custom_request: !!item.custom_request_id // Determine if it was intended to be a custom request
          });
        }
      }
      
      console.log('=== Enriched Items ===', enrichedItems);
      setCartItems(enrichedItems);
    } catch (error) {
      console.error("Failed to load cart:", error);
      toast({ title: "Cart load failed", description: error.message, variant: "destructive" });
    }
  };

  const calculateSubtotal = () =>
    cartItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const priorityFee = isPriority ? 4 : 0;
    const shippingFee = subtotal < 35 ? 5.99 : 0;
    return subtotal + priorityFee + shippingFee;
  };

  const formatPrice = (price) => `$${price.toFixed(2)}`;

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }

    if (!isLocalDelivery && (!shippingAddress.name || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip)) {
      toast({ title: "Delivery address required", description: "Please fill in all address fields or select local delivery.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    
    try {
      console.log('=== Starting Checkout ===');
      console.log('Cart items:', cartItems);
      console.log('Coupon code:', couponCode);
      console.log('Referral code:', referralCode);
      console.log('Is priority:', isPriority);
      
      // Calculate shipping fee
      const subtotal = calculateSubtotal();
      const shippingFee = subtotal < 35 ? 5.99 : 0;

      // Add priority delivery as a cart item if selected
      let finalCartItems = [...cartItems];
      if (isPriority) {
        finalCartItems.push({
          product_id: 'PRIORITY_DELIVERY',
          product_name: '⚡ Priority Overnight Delivery',
          quantity: 1,
          unit_price: 4,
          total_price: 4,
          selected_material: 'N/A',
          selected_color: 'N/A',
          is_priority_fee: true
        });
        console.log('✅ Added priority delivery item to cart');
      }
      
      // Validate cart items have required fields
      const invalidItems = finalCartItems.filter(item => 
        !item.product_id || 
        !item.product_name || 
        item.unit_price === undefined || 
        item.quantity === undefined ||
        item.unit_price === null ||
        item.quantity === null
      );
      
      if (invalidItems.length > 0) {
        console.error('Invalid cart items detected:', invalidItems);
        throw new Error('Some cart items are missing required data. Please refresh your cart.');
      }
      
      const checkoutData = {
        cartItems: finalCartItems.map(item => ({
          ...item,
          // Ensure custom request items have proper identification
          custom_request_id: item.custom_request_id || (item.is_custom_request ? item.product_id : undefined)
        })),
        successUrl: `${window.location.origin}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/Checkout?payment=cancelled`,
        couponCode: couponCode.trim().toUpperCase() === 'JC3DTESTFREEDOM' ? 'JC3DTESTFREEDOM' : (couponCode.trim() || undefined),
        referralCode: referralCode.trim().toUpperCase() || undefined,
        isPriority: isPriority,
        campusLocation: "erau_prescott",
        shippingAddress: isLocalDelivery ? { name: user?.full_name || '', phone: user?.phone || '' } : shippingAddress,
        shippingFee: shippingFee,
        isLocalDelivery: isLocalDelivery
      };
      
      console.log('Calling createCheckoutSession with:', checkoutData);
      
      const response = await base44.functions.invoke('createCheckoutSession', checkoutData);

      console.log('Response from createCheckoutSession:', response);

      if (response.data && response.data.url) {
        console.log('Redirecting to Stripe:', response.data.url);
        window.location.href = response.data.url;
      } else if (response.data && response.data.error) {
        console.error('Error from serverless function:', response.data.error);
        throw new Error(response.data.error);
      } else {
        console.error('No URL received:', response.data);
        throw new Error('No checkout URL received from payment service.');
      }
      
    } catch (error) {
      console.error("=== Checkout Error ===");
      console.error("Error:", error);

      const errorMessage = error.response?.data?.details || 
                           error.response?.data?.error || 
                           error.message || 
                           "An unexpected error occurred. Please try again.";

      toast({
        title: "Checkout failed",
        description: errorMessage,
        variant: "destructive",
      });
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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleCheckout}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      {item.images?.[0] && (
                        <img
                          src={item.images[0]}
                          alt={item.product_name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                        {item.is_custom_request && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            Custom Quote
                          </span>
                        )}
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{item.selected_material} • {item.selected_color}</p>
                          <p>Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right font-semibold text-gray-900">
                        {formatPrice(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Local Delivery Option */}
                <div className="border rounded-lg p-4 bg-teal-50 border-teal-200">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="localDelivery"
                      checked={isLocalDelivery}
                      onChange={(e) => setIsLocalDelivery(e.target.checked)}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <Label htmlFor="localDelivery" className="cursor-pointer flex-1">
                      <p className="font-medium text-teal-900">🚚 Local Drop-Off Delivery</p>
                      <p className="text-sm text-teal-700">
                        We'll drop it off directly to you (no shipping address needed)
                      </p>
                    </Label>
                  </div>
                </div>

                {!isLocalDelivery && savedAddresses.length > 0 && (
                  <div>
                    <Label className="mb-2">Saved Addresses</Label>
                    <Select 
                      value={selectedAddressId} 
                      onValueChange={(value) => {
                        if (value === "new") {
                          setSelectedAddressId("");
                          setShippingAddress({
                            name: user?.full_name || "",
                            phone: user?.phone || "",
                            street: "",
                            city: "",
                            state: "",
                            zip: ""
                            });
                        } else {
                          const addr = savedAddresses.find(a => a.id === value);
                          if (addr) {
                            setShippingAddress(addr);
                            setSelectedAddressId(value);
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
                            {addr.name} - {addr.street}, {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

{!isLocalDelivery && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP *</Label>
                      <Input
                        id="zip"
                        value={shippingAddress.zip}
                        onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Priority Option */}
                  <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="priority"
                        checked={isPriority}
                        onChange={(e) => setIsPriority(e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <Label htmlFor="priority" className="cursor-pointer flex-1">
                        <p className="font-medium text-orange-900">⚡ Priority Overnight Delivery (+$4)</p>
                        <p className="text-sm text-orange-700">
                          Est. delivery: Next day
                        </p>
                      </Label>
                    </div>
                  </div>

                  {!isPriority && (
                    <div className="p-3 bg-gray-50 border rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Standard Delivery:</span> Est. 2-3 business days
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      onChange={async (e) => {
                        if (e.target.checked && user) {
                          try {
                            const newAddress = {
                              ...shippingAddress,
                              id: `addr_${Date.now()}`,
                              is_default: savedAddresses.length === 0
                            };
                            const updatedAddresses = [...savedAddresses, newAddress];
                            await base44.auth.updateMe({ saved_addresses: updatedAddresses });
                            setSavedAddresses(updatedAddresses);
                            toast({ title: "Address saved!" });
                          } catch (error) {
                            toast({ title: "Failed to save address", variant: "destructive" });
                          }
                        }
                      }}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <Label htmlFor="saveAddress" className="text-sm cursor-pointer">
                      Save this address for future orders
                    </Label>
                  </div>
                </>
              )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coupon Code Input */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Label htmlFor="coupon" className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4" />
                    Coupon Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {couponCode 
                      ? "Discount will be validated and applied at checkout" 
                      : "Or enter any valid code on the Stripe checkout page"
                    }
                  </p>
                </div>

                {/* Referral Code Input */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <Label htmlFor="referral" className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-900">Referral Code (Optional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="flex-1 border-purple-300"
                    />
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Both you and your friend will earn <strong>250 EXP</strong> when you complete this purchase!
                  </p>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(calculateSubtotal())}</span>
                </div>
                {isPriority && (
                  <div className="flex justify-between text-orange-600">
                    <span>⚡ Priority Overnight</span>
                    <span>+$4.00</span>
                  </div>
                )}
                {calculateSubtotal() < 35 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Fee (Orders under $35)</span>
                    <span>+$5.99</span>
                  </div>
                )}
                {calculateSubtotal() >= 35 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600 font-semibold">FREE</span>
                  </div>
                )}
                {couponCode && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Coupon: {couponCode}</span>
                    <span>Will be applied</span>
                  </div>
                )}
                {referralCode && (
                  <div className="flex justify-between text-purple-600 text-sm">
                    <span>Referral: {referralCode}</span>
                    <span>+250 EXP on completion</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-teal-600">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
                
                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-teal-600 hover:bg-teal-700 mt-4"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Secure payment powered by Stripe
                </p>
                <p className="text-xs text-teal-600 text-center font-semibold">
                  🌟 Earn 5 EXP for every dollar you spend!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Sustainability Commitment Footer */}
      <div className="mt-12 border-t pt-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">♻️</span>
              </div>
              <h3 className="text-xl font-bold text-green-900">Our Sustainability Promise</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              We encourage all our makers to use recycled filament whenever possible. We're committed to making <strong>100% of our products</strong> printed with recycled materials by <strong>2030</strong>. Together, we're reducing plastic waste and building a greener future.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}