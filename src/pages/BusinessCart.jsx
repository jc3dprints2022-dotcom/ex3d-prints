import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus, ShoppingCart, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function BusinessCart() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCartData();
  }, []);

  const loadCartData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

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
    } catch (error) {
      console.error("Failed to load cart:", error);
    }
    setLoading(false);
  };

  const updateQuantity = async (itemId, newQuantity, moq) => {
    if (newQuantity < 30) {
      toast({ title: `Minimum order per item is 30 units`, variant: "destructive" });
      return;
    }

    const item = cartItems.find(i => i.id === itemId);
    await base44.entities.Cart.update(itemId, {
      quantity: newQuantity,
      total_price: newQuantity * item.unit_price
    });

    await loadCartData();
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = async (itemId) => {
    await base44.entities.Cart.delete(itemId);
    await loadCartData();
    window.dispatchEvent(new Event('cartUpdated'));
    toast({ title: "Removed from cart" });
  };

  const calculateBulkDiscount = () => {
    const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    if (totalUnits >= 100) {
      return { percentage: 15, amount: subtotal * 0.15, totalUnits };
    } else if (totalUnits >= 50) {
      return { percentage: 10, amount: subtotal * 0.1, totalUnits };
    }
    return { percentage: 0, amount: 0, totalUnits };
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Please sign in to view your business cart</p>
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
  const bulkDiscount = calculateBulkDiscount();
  const totalUnits = bulkDiscount.totalUnits;
  const canCheckout = totalUnits >= 30;
  const total = subtotal - bulkDiscount.amount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          Business Cart
        </h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Your business cart is empty</p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link to={createPageUrl("BusinessMarketplace")}>Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.product?.images?.[0] ? (
                          <img src={item.product.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.product_name}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Color: {item.selected_color}</p>
                          <p>Material: {item.selected_material}</p>
                          <p className="text-purple-600 font-medium">${item.unit_price?.toFixed(2)} per unit</p>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, 30)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-medium w-12 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, 30)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-gray-500 ml-2">
                            (Min: 30 per item)
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-lg mb-2">${item.total_price?.toFixed(2)}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {bulkDiscount.percentage > 0 && (
                      <>
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Bulk Discount ({bulkDiscount.percentage}% - {bulkDiscount.totalUnits}+ units)</span>
                          <span>-${bulkDiscount.amount.toFixed(2)}</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {bulkDiscount.totalUnits >= 100 ? (
                            "Maximum 15% discount applied!"
                          ) : bulkDiscount.totalUnits >= 50 ? (
                            `Order ${100 - bulkDiscount.totalUnits} more units for 15% off`
                          ) : (
                            `Order ${50 - bulkDiscount.totalUnits} more units for 10% off`
                          )}
                        </div>
                      </>
                    )}

                    {bulkDiscount.percentage === 0 && bulkDiscount.totalUnits < 50 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Order {50 - bulkDiscount.totalUnits} more units for 10% off
                      </div>
                    )}

                    <div className="border-t pt-3 flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-purple-600">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {!canCheckout && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 mb-3">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Minimum order: 30 total items. Add {30 - totalUnits} more to checkout.
                    </div>
                  )}

                  <Button 
                    asChild={canCheckout} 
                    size="lg" 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!canCheckout}
                  >
                    {canCheckout ? (
                      <Link to={createPageUrl("BusinessCheckout")}>
                        Proceed to Checkout
                      </Link>
                    ) : (
                      <span>Minimum 30 Items Required</span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}