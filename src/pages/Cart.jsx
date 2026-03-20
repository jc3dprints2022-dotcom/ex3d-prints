import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DROP_PRICE = 5;
const DEFAULT_COLORS = ["White", "Black", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink"];

export default function Cart() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadCart();
  }, []);

  const checkAuthAndLoadCart = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      await loadCart(currentUser.id);
    } catch (error) {
      setUser(null);
      loadAnonymousCart();
    }
    setLoading(false);
  };

  const loadCart = async (userId) => {
    try {
      const items = await base44.entities.Cart.filter({ user_id: userId });
      console.log('Cart items loaded:', items);
      setCartItems(items);

      const productsData = {};
      
      for (const item of items) {
        try {
          // Check if this is a custom request
          if (item.custom_request_id) {
            console.log('Loading custom request:', item.custom_request_id);
            const customRequest = await base44.entities.CustomPrintRequest.get(item.custom_request_id);
            console.log('Custom request loaded:', customRequest);
            // Store custom request as if it were a product for display purposes
            productsData[item.product_id] = {
              id: customRequest.id,
              name: customRequest.title,
              description: customRequest.description,
              images: customRequest.images || [],
              is_custom_request: true,
              custom_request_data: customRequest
            };
          } else {
            // Regular product
            console.log('Loading regular product:', item.product_id);
            const product = await base44.entities.Product.get(item.product_id);
            productsData[item.product_id] = product;
          }
        } catch (error) {
          console.error(`Failed to load item ${item.product_id}:`, error);
          // Use item data as fallback
          productsData[item.product_id] = {
            id: item.product_id,
            name: item.product_name || 'Unknown Product',
            description: item.custom_request_id ? 'Custom Print Request' : 'Product',
            images: [],
            is_custom_request: !!item.custom_request_id
          };
        }
      }
      
      console.log('Products data:', productsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Failed to load cart:", error);
      toast({ title: "Failed to load cart", variant: "destructive" });
    }
  };

  const loadAnonymousCart = () => {
    const localCart = localStorage.getItem('anonymousCart');
    if (localCart) {
      try {
        const items = JSON.parse(localCart);
        setCartItems(items);
        
        const productsData = {};
        items.forEach(item => {
          if (item.product) {
            productsData[item.product_id] = item.product;
          } else {
             // Fallback for anonymous cart items if product data is missing
            productsData[item.product_id] = {
              id: item.product_id,
              name: item.product_name || 'Unknown Product',
              description: item.custom_request_id ? 'Custom Print Request' : 'Product',
              images: [],
              is_custom_request: !!item.custom_request_id
            };
          }
        });
        setProducts(productsData);
      } catch (error) {
        console.error("Failed to parse anonymous cart:", error);
      }
    }
  };

  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      if (user) {
        await base44.entities.Cart.update(item.id, {
          quantity: newQuantity,
          total_price: item.unit_price * newQuantity
        });
        await loadCart(user.id);
      } else {
        const updatedCart = cartItems.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: newQuantity, total_price: cartItem.unit_price * newQuantity }
            : cartItem
        );
        setCartItems(updatedCart);
        localStorage.setItem('anonymousCart', JSON.stringify(updatedCart));
        // Also update the products state for anonymous cart if product details are stored within cart item
        const updatedProducts = { ...products };
        const productInCart = updatedProducts[item.product_id];
        if (productInCart) {
          // If the product has dynamic properties that change with quantity, update them here
          // For now, we only care about quantity in the cart item itself, not product details
        }
        setProducts(updatedProducts); // Trigger re-render with potentially updated product info
      }
      window.dispatchEvent(new Event('cartUpdated'));
      toast({ title: "Quantity updated" });
    } catch (error) {
      console.error("Failed to update quantity:", error);
      toast({ title: "Failed to update quantity", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      if (user) {
        await base44.entities.Cart.delete(item.id);
        await loadCart(user.id);
      } else {
        const updatedCart = cartItems.filter(cartItem => cartItem.id !== item.id);
        setCartItems(updatedCart);
        localStorage.setItem('anonymousCart', JSON.stringify(updatedCart));
        // Remove product from products state if no other cart item references it
        const updatedProducts = { ...products };
        if (!updatedCart.some(cartItem => cartItem.product_id === item.product_id)) {
            delete updatedProducts[item.product_id];
        }
        setProducts(updatedProducts);
      }
      window.dispatchEvent(new Event('cartUpdated'));
      toast({ title: "Item removed from cart" });
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast({ title: "Failed to remove item", variant: "destructive" });
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleUpdateColor = async (item, newColor) => {
    try {
      if (user) {
        await base44.entities.Cart.update(item.id, { selected_color: newColor });
        await loadCart(user.id);
      }
      toast({ title: "Color updated" });
    } catch (error) {
      toast({ title: "Failed to update color", variant: "destructive" });
    }
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      toast({ 
        title: "Please sign in", 
        description: "You need to be logged in to checkout",
        variant: "destructive" 
      });
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    window.location.href = createPageUrl("Checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-20 h-20 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some amazing 3D printed items to get started!</p>
              <Button asChild>
                <Link to={createPageUrl("Marketplace")}>
                  Browse Marketplace
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const product = products[item.product_id];
              const isCustomRequest = product?.is_custom_request;
              
              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product?.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={item.product_name || product.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.product_name || product?.name || (isCustomRequest ? 'Custom Print Request' : 'Unknown Product')}
                            </h3>
                            {isCustomRequest && (
                              <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                Custom Quote
                              </span>
                            )}
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <p><span className="font-medium">Material:</span> {item.selected_material}</p>
                              {item.unit_price === DROP_PRICE ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Color:</span>
                                  <Select
                                    value={item.selected_color || "White"}
                                    onValueChange={(val) => handleUpdateColor(item, val)}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(product?.colors?.length > 0 ? product.colors : DEFAULT_COLORS).map(color => (
                                        <SelectItem key={color} value={color} className="text-xs">{color}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <p><span className="font-medium">Color:</span> {item.selected_color}</p>
                              )}
                              {!isCustomRequest && item.unit_price !== DROP_PRICE && (
                                <p><span className="font-medium">Resolution:</span> {item.selected_resolution}mm</p>
                              )}
                              {item.multi_color_selections && (
                                <p className="text-purple-600">
                                  <span className="font-medium">Multi-color:</span> {item.multi_color_selections.join(', ')}
                                </p>
                              )}
                              {item.unit_price === DROP_PRICE && (
                                <span className="inline-block px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded">
                                  $5 Design Drop
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>

                        {/* Quantity and Price */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3">
                            {item.unit_price === DROP_PRICE ? (
                              <span className="text-sm text-gray-500 italic">Qty: 1 (limit 1 per design)</span>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="text-lg font-semibold w-12 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              ${item.unit_price.toFixed(2)} each
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                              ${item.total_price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-medium">FREE</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-teal-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleProceedToCheckout}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  size="lg"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button 
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link to={createPageUrl("Marketplace")}>
                    Continue Shopping
                  </Link>
                </Button>

                {/* Sustainability Message */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 text-center">
                    🌱 We encourage the use of recycled filament by our makers, and we are committed to making all our products printed with recycled materials by 2030.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}