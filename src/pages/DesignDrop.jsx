import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, ArrowDown, ShoppingCart, Check, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DROP_PRICE = 5;

export default function DesignDrop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [addingToCart, setAddingToCart] = useState({});
  const [addedToCart, setAddedToCart] = useState({});
  // Set of product IDs already in cart or already purchased
  const [ownedProductIds, setOwnedProductIds] = useState(new Set());
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
      await loadOwned(u.id);
    } catch {
      setUser(null);
    }
  };

  const loadOwned = async (userId) => {
    try {
      // Check cart items
      const cartItems = await base44.entities.Cart.filter({ user_id: userId });
      const cartProductIds = cartItems.map(c => c.product_id);

      // Check completed/paid orders
      const orders = await base44.entities.Order.filter({ customer_id: userId });
      const purchasedProductIds = orders
        .filter(o => ['accepted', 'printing', 'done_printing', 'shipped', 'delivered', 'completed', 'dropped_off'].includes(o.status))
        .flatMap(o => (o.items || []).map(i => i.product_id));

      setOwnedProductIds(new Set([...cartProductIds, ...purchasedProductIds]));
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
          setLoading(false);
          return;
        }
      }

      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      setProducts(
        allProducts
          .filter((p) => p.images?.length > 0)
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 12)
      );
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (ownedProductIds.has(product.id)) return;

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
        selected_color: product.colors?.[0] || 'White',
        // Flag to lock quantity in cart
        is_drop_item: true,
      });

      setOwnedProductIds((prev) => new Set([...prev, product.id]));
      setAddedToCart((prev) => ({ ...prev, [product.id]: true }));
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

  const getButtonState = (product) => {
    if (ownedProductIds.has(product.id)) return 'owned';
    if (addedToCart[product.id]) return 'added';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-teal-500/20 border border-teal-400/40 text-teal-300 text-sm font-semibold px-4 py-1 rounded-full mb-6 uppercase tracking-wider">
            Limited-Time Drop
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
            Premium 3D Designs —{" "}
            <span className="text-teal-400">$5 Each</span>
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Pick a design, we match it with a local printer near you, and ship it straight to your door. Simple as that.
          </p>
          <Button
            onClick={scrollToGrid}
            size="lg"
            className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-10 py-6 rounded-full shadow-lg shadow-teal-500/30 font-bold"
          >
            Browse Designs
            <ArrowDown className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Urgency Banner */}
      <section className="bg-amber-50 border-b border-amber-200 py-8 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <Clock className="w-7 h-7 text-amber-500" />
          <h3 className="text-xl font-bold text-amber-900">Limited-Time $5 Launch Drop</h3>
          <p className="text-amber-700 text-sm max-w-md">
            These prices are part of our launch promotion. Once the drop ends, standard pricing applies. Don't miss your chance to grab premium 3D designs at $5 each.
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
                const btnState = getButtonState(product);
                return (
                  <Link
                    key={product.id}
                    to={`${createPageUrl("ProductDetail")}?id=${product.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-50 relative">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-600 font-bold text-lg">${DROP_PRICE}</span>
                        {product.price && product.price > DROP_PRICE && (
                          <span className="text-slate-400 text-sm line-through">${product.price.toFixed(2)}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={addingToCart[product.id] || btnState === 'owned'}
                        className={`w-full mt-auto text-xs font-semibold transition-all ${
                          btnState === 'owned'
                            ? "bg-slate-300 hover:bg-slate-300 text-slate-500 cursor-not-allowed"
                            : btnState === 'added'
                            ? "bg-green-500 hover:bg-green-500"
                            : "bg-teal-600 hover:bg-teal-700"
                        }`}
                      >
                        {btnState === 'owned' ? (
                          <><Lock className="w-3 h-3 mr-1" /> Already Owned</>
                        ) : btnState === 'added' ? (
                          <><Check className="w-3 h-3 mr-1" /> Added!</>
                        ) : (
                          <><ShoppingCart className="w-3 h-3 mr-1" /> Add to Cart</>
                        )}
                      </Button>
                    </div>
                  </Link>
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
            className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-10 py-6 rounded-full font-bold shadow-lg shadow-teal-500/20"
          >
            <Link to={createPageUrl("Marketplace")}>Marketplace</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}