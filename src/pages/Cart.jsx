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

// ─── Anonymous cart helpers ────────────────────────────────────────────────────
// The landing page calls addToCart without a logged-in user. These helpers
// persist the cart in localStorage so the Cart page can display those items.

export function anonymousCartGet() {
  try { return JSON.parse(localStorage.getItem("anonymousCart") || "[]"); }
  catch { return []; }
}

export function anonymousCartSave(items) {
  localStorage.setItem("anonymousCart", JSON.stringify(items));
}

export function anonymousCartAdd(item) {
  const cart = anonymousCartGet();
  const existing = cart.findIndex(i => i.product_id === item.product_id);
  if (existing >= 0) {
    cart[existing].quantity  = (cart[existing].quantity || 1) + 1;
    cart[existing].total_price = cart[existing].unit_price * cart[existing].quantity;
  } else {
    cart.push({ ...item, id: `anon_${item.product_id}_${Date.now()}` });
  }
  anonymousCartSave(cart);
  return cart;
}

export function anonymousCartRemove(itemId) {
  const cart = anonymousCartGet().filter(i => i.id !== itemId);
  anonymousCartSave(cart);
  return cart;
}

export function anonymousCartUpdate(itemId, quantity) {
  const cart = anonymousCartGet().map(i =>
    i.id === itemId
      ? { ...i, quantity, total_price: i.unit_price * quantity }
      : i
  );
  anonymousCartSave(cart);
  return cart;
}
// ──────────────────────────────────────────────────────────────────────────────

export default function Cart() {
  const [user, setUser]           = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts]   = useState({});
  const [loading, setLoading]     = useState(true);
  const { toast }                 = useToast();

  useEffect(() => { checkAuthAndLoadCart(); }, []);

  const checkAuthAndLoadCart = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // If a guest was shopping before logging in, merge their anonymous cart
      await mergeAnonymousCartIfNeeded(currentUser.id);
      await loadCart(currentUser.id);
    } catch {
      setUser(null);
      loadAnonymousCart();
    }
    setLoading(false);
  };

  // Merge any items stored in localStorage into the logged-in user's DB cart
  const mergeAnonymousCartIfNeeded = async (userId) => {
    const anonItems = anonymousCartGet();
    if (anonItems.length === 0) return;
    for (const item of anonItems) {
      try {
        const existing = await base44.entities.Cart.filter({ user_id: userId, product_id: item.product_id });
        if (existing.length === 0) {
          await base44.entities.Cart.create({
            user_id: userId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            selected_material: item.selected_material || "PLA",
            selected_color: item.selected_color || "Shown Colors",
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
        }
      } catch (e) {
        console.error("Failed to merge anon cart item:", e);
      }
    }
    localStorage.removeItem("anonymousCart");
  };

  const loadCart = async (userId) => {
    try {
      const items = await base44.entities.Cart.filter({ user_id: userId });
      setCartItems(items);

      const productsData = {};
      for (const item of items) {
        try {
          if (item.custom_request_id) {
            const cr = await base44.entities.CustomPrintRequest.get(item.custom_request_id);
            productsData[item.product_id] = {
              id: cr.id, name: cr.title, description: cr.description,
              images: cr.images || [], is_custom_request: true, custom_request_data: cr,
            };
          } else {
            const product = await base44.entities.Product.get(item.product_id);
            productsData[item.product_id] = product;
          }
        } catch {
          productsData[item.product_id] = {
            id: item.product_id,
            name: item.product_name || "Unknown Product",
            images: [],
            is_custom_request: !!item.custom_request_id,
          };
        }
      }
      setProducts(productsData);
    } catch (error) {
      toast({ title: "Failed to load cart", variant: "destructive" });
    }
  };

  const loadAnonymousCart = () => {
    const items = anonymousCartGet();
    setCartItems(items);
    const productsData = {};
    items.forEach(item => {
      productsData[item.product_id] = item.product || {
        id: item.product_id,
        name: item.product_name || "Unknown Product",
        images: [],
        is_custom_request: false,
      };
    });
    setProducts(productsData);
  };

  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      if (user) {
        await base44.entities.Cart.update(item.id, {
          quantity: newQuantity,
          total_price: item.unit_price * newQuantity,
        });
        await loadCart(user.id);
      } else {
        setCartItems(anonymousCartUpdate(item.id, newQuantity));
      }
      window.dispatchEvent(new Event("cartUpdated"));
      toast({ title: "Quantity updated" });
    } catch {
      toast({ title: "Failed to update quantity", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      if (user) {
        await base44.entities.Cart.delete(item.id);
        await loadCart(user.id);
      } else {
        setCartItems(anonymousCartRemove(item.id));
      }
      window.dispatchEvent(new Event("cartUpdated"));
      toast({ title: "Item removed" });
    } catch {
      toast({ title: "Failed to remove item", variant: "destructive" });
    }
  };

  const handleUpdateColor = async (item, newColor) => {
    try {
      if (user) {
        await base44.entities.Cart.update(item.id, { selected_color: newColor });
        await loadCart(user.id);
      }
      toast({ title: "Color updated" });
    } catch {
      toast({ title: "Failed to update color", variant: "destructive" });
    }
  };

  const calculateTotal = () =>
    cartItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const handleProceedToCheckout = () => {
    // Allow guest checkout — don't force login here.
    // The Checkout page will handle sign-in if the payment provider requires it.
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
                <Link to={createPageUrl("Marketplace")}>Browse Marketplace</Link>
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
                  <CardContent className="p-4 sm:p-6">
                    {/* ── Two-row layout: image + details stacked on mobile, side-by-side on sm+ ── */}
                    <div className="flex gap-4">
                      {/* Product image */}
                      <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28">
                        {product?.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={item.product_name || product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        {/* Title row — price pinned to the right, title truncates */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight line-clamp-2">
                            {item.product_name || product?.name || (isCustomRequest ? "Custom Print Request" : "Unknown Product")}
                          </h3>
                          {/* Price — never pushed off-screen */}
                          <div className="flex-shrink-0 text-right ml-2">
                            <p className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
                              ${(item.total_price ?? 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              ${(item.unit_price ?? 0).toFixed(2)} ea
                            </p>
                          </div>
                        </div>

                        {isCustomRequest && (
                          <span className="inline-block mb-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            Custom Quote
                          </span>
                        )}

                        {/* Specs */}
                        <div className="text-xs text-gray-600 space-y-0.5 mb-3">
                          <p><span className="font-medium">Material:</span> {item.selected_material}</p>
                          {item.unit_price === DROP_PRICE ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium">Color:</span>
                              <Select
                                value={item.selected_color || "White"}
                                onValueChange={(val) => handleUpdateColor(item, val)}
                              >
                                <SelectTrigger className="h-6 text-xs w-28">
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
                          {!isCustomRequest && item.unit_price !== DROP_PRICE && item.selected_resolution && (
                            <p><span className="font-medium">Resolution:</span> {item.selected_resolution}mm</p>
                          )}
                          {item.multi_color_selections && (
                            <p className="text-purple-600">
                              <span className="font-medium">Multi-color:</span> {item.multi_color_selections.join(", ")}
                            </p>
                          )}
                          {item.unit_price === DROP_PRICE && (
                            <span className="inline-block px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded">
                              $5 Design Drop
                            </span>
                          )}
                        </div>

                        {/* Quantity controls + remove */}
                        <div className="flex items-center justify-between">
                          {item.unit_price === DROP_PRICE ? (
                            <span className="text-xs text-gray-500 italic">Qty: 1 (limit 1)</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                    <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? "item" : "items"})</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Shipping</span>
                    <span className="text-gray-400 italic">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-2">
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

                <Button asChild variant="outline" className="w-full">
                  <Link to={createPageUrl("Marketplace")}>Continue Shopping</Link>
                </Button>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    🌱 We encourage makers to use recycled filament — committed to 100% recycled materials by 2030.
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