import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Package, Truck, MapPin, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function BusinessProductDetail() {
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(20);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadProduct();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const loadProduct = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      const productData = await base44.entities.Product.get(productId);
      setProduct(productData);
      setQuantity(productData.moq || 20);
      setSelectedColor(productData.colors?.[0] || "");
      setSelectedMaterial(productData.materials?.[0] || "PLA");
    } catch (error) {
      console.error("Failed to load product:", error);
    }
    setLoading(false);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "Sign in to add to cart", variant: "destructive" });
      return;
    }

    if (quantity < (product.moq || 20)) {
      toast({ title: "Minimum order not met", description: `Minimum order is ${product.moq || 20} units`, variant: "destructive" });
      return;
    }

    try {
      const existingItems = await base44.entities.Cart.filter({
        user_id: user.id,
        product_id: product.id,
        marketplace_type: 'business'
      });

      if (existingItems.length > 0) {
        const item = existingItems[0];
        await base44.entities.Cart.update(item.id, {
          quantity: item.quantity + quantity,
          total_price: (item.quantity + quantity) * product.wholesale_price
        });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          marketplace_type: 'business',
          product_id: product.id,
          product_name: product.name,
          quantity,
          selected_material: selectedMaterial,
          selected_color: selectedColor,
          unit_price: product.wholesale_price,
          total_price: quantity * product.wholesale_price
        });
      }

      toast({ title: "Added to business cart!" });
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      toast({ title: "Error", description: "Failed to add to cart", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center">Product not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to={createPageUrl("BusinessMarketplace")} className="text-purple-600 hover:underline mb-4 inline-block">
          ← Back to Business Marketplace
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <Badge className="mb-4 bg-purple-600">Business Exclusive</Badge>
            <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Building2 className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                ${product.wholesale_price?.toFixed(2)} <span className="text-lg font-normal text-gray-600">per unit</span>
              </div>
              {product.suggested_retail_price && (
                <p className="text-sm text-gray-600">Suggested retail: ${product.suggested_retail_price.toFixed(2)}</p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Package className="w-5 h-5" />
                <span>MOQ: {product.moq || 20} units</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Truck className="w-5 h-5" />
                <span>Lead Time: {product.lead_time_days || 'N/A'} days</span>
              </div>
              {product.local_delivery_eligible && (
                <div className="flex items-center gap-2 text-green-600">
                  <MapPin className="w-5 h-5" />
                  <span>Local delivery available</span>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
              {product.colors && product.colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {product.colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              )}

              {product.materials && product.materials.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Material</label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {product.materials.map(mat => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Quantity (MOQ: {product.moq || 20})</label>
                <input
                  type="number"
                  min={product.moq || 20}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || product.moq || 20)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <Button onClick={handleAddToCart} size="lg" className="w-full bg-purple-600 hover:bg-purple-700">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Business Cart
            </Button>

            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}