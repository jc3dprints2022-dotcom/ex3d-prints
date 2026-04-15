import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, ArrowDown, ShoppingCart, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DROP_PRICE = 10;

const DEFAULT_COLORS = ["White", "Black", "Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink"];

export default function DesignDrop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [addingToCart, setAddingToCart] = useState({});
  const [addedToCart, setAddedToCart] = useState({});
  const [purchasedProductIds, setPurchasedProductIds] = useState(new Set());
  const [selectedColors, setSelectedColors] = useState({});
  const [cartProductIds, setCartProductIds] = useState(new Set());
  const gridRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadProducts();
  }, []);

  const loadUser = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      await loadPurchasedAndCartIds(u.id);
    } catch {
      setUser(null);
    }
  };

  const loadPurchasedAndCartIds = async (userId) => {
    try {
      const orders = await base44.entities.Order.filter({ customer_id: userId });
      const purchasedIds = new Set();
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          if (item.unit_price === DROP_PRICE) {
            purchasedIds.add(item.product_id);
          }
        });
      });
      setPurchasedProductIds(purchasedIds);

      const cartItems = await base44.entities.Cart.filter({ user_id: userId });
      const inCartIds = new Set();
      cartItems.forEach(item => {
        if (item.unit_price === DROP_PRICE) {
          inCartIds.add(item.product_id);
        }
      });
      setCartProductIds(inCartIds);
    } catch {
      // ignore
    }
  };

  const loadProducts = async () => {
    try {
      const featuredList = await base44.entities.HomepageFeatured.filter({ is_active: true });

      if (featuredList.length > 0) {
        featuredList.sort((a, b) => a.display_order - b.display_order);
        const productsData = await Promise.all(
          featuredList.map((f) => base44.entities.Product.get(f.product_id).catch(() => null))
        );
        const valid = productsData.filter((p) => p && p.status === 'active' && p.images?.length > 0);
        if (valid.length > 0) {
          setProducts(valid);
          initColors(valid);
          setLoading(false);
          return;
        }
      }

      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      const filtered = allProducts
        .filter((p) => p.images?.length > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12);
      setProducts(filtered);
      initColors(filtered);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const initColors = (prods) => {
    const colorMap = {};
    prods.forEach(p => {
      const colors = p.colors?.length > 0 ? p.colors : DEFAULT_COLORS;
      colorMap[p.id] = colors[0];
    });
    setSelectedColors(colorMap);
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (purchasedProductIds.has(product.id)) {
      toast({ title: "Already purchased", description: "You've already ordered this design.", variant: "destructive" });
      return;
    }

    if (cartProductIds.has(product.id)) {
      toast({ title: "Already in cart", description: "This design is already in your cart." });
      return;
    }

    setAddingToCart((prev) => ({ ...prev, [product.id]: true }));
    try {
      await base44.entities.Cart.create({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: DROP_PRICE,
        total_price: DROP_PRICE,
        selected_material: product.materials?.[0] || 'PLA',
        selected_color: selectedColors[product.id] || product.colors?.[0] || 'White',
        is_design_drop: true,
      });

      setAddedToCart((prev) => ({ ...prev, [product.id]: true }));
      setCartProductIds(prev => new Set(prev).add(product.id));
      window.dispatchEvent(new Event('cartUpdated'));
      toast({ title: "Added to cart!", description: `${product.name} — $${DROP_PRICE}` });
      setTimeout(() => setAddedToCart((prev) => ({ ...prev, [product.id]: false })), 2000);
    } catch (err) {
      toast({ title: "Error", description: "Could not add to cart.", variant: "destructive" });
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getProductColors = (product) => {
    return product.colors?.length > 0 ? product.colors : DEFAULT_COLORS;
  };

  const isUnavailable = (productId) => purchasedProductIds.has(productId) || cartProductIds.has(productId);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-teal-500/20 border border-teal-400/40 text-teal-300 text-sm font-semibold px-4 py-1 rounded-full mb-6 uppercase tracking-wider">
            Limited-Time Drop
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
            Premium 3D Designs<br />
            <span className="text-teal-400">$10 Each</span>
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Pick a design, we match it with a local printer near you, and ship it straight to your door. Simple as that.
          </p>
          <Button
            onClick={scrollToGrid}
            size="lg"
            className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-10 py-6 rounded-full shadow-lg shadow-teal-500/30 font-bold">
            Browse Designs
            <ArrowDown className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Urgency Banner */}
      <section className="bg-amber-50 border-b border-amber-200 py-8 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <Clock className="w-7 h-7 text-amber-500" />
          <h3 className="text-xl font-bold text-amber-900">Limited-Time $10 Launch Drop</h3>
          <p className="text-amber-700 text-sm max-w-md">
            These prices are part of our launch promotion. Once the drop ends, standard pricing applies. Don't miss your chance to grab premium 3D designs at $10 each.
          </p>
        </div>
      </section>

      {/* Product Grid */}
      <section ref={gridRef} className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">This Drop's Designs</h2>
            <p className="text-slate-500">All prints are made locally and shipped to you. Shipping shown at checkout.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {products.map((product) => {
                const colors = getProductColors(product);
                const unavailable = isUnavailable(product.id);

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <Link to={`${createPageUrl("ProductDetail")}?id=${product.id}&from=designdrop&drop_price=10`} className="aspect-square overflow-hidden bg-gray-50 block relative">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {unavailable && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-slate-800 text-xs font-bold px-3 py-1 rounded-full">
                            {purchasedProductIds.has(product.id) ? "Already Purchased" : "In Cart"}
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-600 font-bold text-lg">${DROP_PRICE}</span>
                        {product.price && product.price > DROP_PRICE && (
                          <span className="text-slate-400 text-sm line-through">${product.price.toFixed(2)}</span>
                        )}
                      </div>

                      {/* Color Selector */}
                      <Select
                        value={selectedColors[product.id] || colors[0]}
                        onValueChange={(val) => setSelectedColors(prev => ({ ...prev, [product.id]: val }))}
                        disabled={unavailable}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colors.map(color => (
                            <SelectItem key={color} value={color} className="text-xs">{color}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={addingToCart[product.id] || unavailable}
                        className={`w-full mt-auto text-xs font-semibold transition-all ${
                          unavailable
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : addedToCart[product.id]
                            ? "bg-green-500 hover:bg-green-500"
                            : "bg-teal-600 hover:bg-teal-700"
                        }`}
                      >
                        {addedToCart[product.id] ? (
                          <><Check className="w-3 h-3 mr-1" /> Added!</>
                        ) : unavailable ? (
                          purchasedProductIds.has(product.id) ? "Already Purchased" : "In Cart"
                        ) : (
                          <><ShoppingCart className="w-3 h-3 mr-1" /> Add to Cart</>
                        )}
                      </Button>
                    </div>
                    </div>
                    );
                    })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-900 text-white py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-3">Want to see more designs?</h2>
          <p className="text-white/70 mb-8">Browse hundreds of high quality designs on our marketplace.</p>
          <Button
            asChild
            size="lg"
            className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-10 py-6 rounded-full font-bold shadow-lg shadow-teal-500/20">
            <Link to={createPageUrl("Marketplace")}>
              Marketplace
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}