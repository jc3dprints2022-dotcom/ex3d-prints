
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShoppingBag, MapPin, CreditCard, Tag, Users } from "lucide-react";

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState("campus_pickup");
  const [pickupLocation, setPickupLocation] = useState("Student Union");
  const [couponCode, setCouponCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isPriority, setIsPriority] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { toast } = useToast();

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
    let total = calculateSubtotal();
    if (isPriority) {
      total += 4; // Add $4 for priority
    }
    return total;
  };

  const formatPrice = (price) => `$${price.toFixed(2)}`;

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }

    setProcessing(true);
    
    try {
      console.log('=== Starting Checkout ===');
      console.log('Cart items:', cartItems);
      console.log('Coupon code:', couponCode);
      console.log('Referral code:', referralCode);
      console.log('Is priority:', isPriority);
      
      // Validate cart items have required fields
      const invalidItems = cartItems.filter(item => 
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
        cartItems: cartItems.map(item => ({
          ...item,
          // Ensure custom request items have proper identification
          custom_request_id: item.custom_request_id || (item.is_custom_request ? item.product_id : undefined)
        })),
        successUrl: `${window.location.origin}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/Checkout?payment=cancelled`,
        couponCode: couponCode.trim() || undefined,
        referralCode: referralCode.trim().toUpperCase() || undefined,
        isPriority: isPriority
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
                  Delivery Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="campus_pickup" id="campus_pickup" />
                    <Label htmlFor="campus_pickup" className="cursor-pointer flex-1">
                      <p className="font-medium">Campus Pickup</p>
                      <p className="text-sm text-gray-600">
                        Collect your items from a designated pickup point.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="mt-4">
                  <Label htmlFor="pickup_location">Pickup Location</Label>
                  <Input
                    id="pickup_location"
                    value={pickupLocation}
                    readOnly
                    disabled
                    className="mt-2 bg-gray-50 cursor-not-allowed"
                  />
                </div>

                {/* Priority Option */}
                <div className="mt-4 border rounded-lg p-4 bg-orange-50 border-orange-200">
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
                        Your order will be completed by the next day
                      </p>
                    </Label>
                  </div>
                </div>
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
                <div className="flex justify-between text-gray-600">
                  <span>Pickup</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                {isPriority && (
                  <div className="flex justify-between text-orange-600">
                    <span>⚡ Priority Overnight</span>
                    <span>+$4.00</span>
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
    </div>
  );
}
