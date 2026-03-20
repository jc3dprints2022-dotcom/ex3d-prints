import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MousePointerClick, Printer, PackageCheck, Clock, ArrowDown } from "lucide-react";

export default function DesignDrop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // Use the same featured products logic as homepage
      const featuredList = await base44.entities.HomepageFeatured.filter({ is_active: true });

      if (featuredList.length > 0) {
        featuredList.sort((a, b) => a.display_order - b.display_order);
        const productPromises = featuredList.map(f =>
          base44.entities.Product.get(f.product_id).catch(() => null)
        );
        const productsData = await Promise.all(productPromises);
        const validProducts = productsData.filter(p => p && p.status === 'active' && p.images && p.images.length > 0);

        if (validProducts.length > 0) {
          setProducts(validProducts);
          setLoading(false);
          return;
        }
      }

      // Fallback: most viewed active products
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      const top = allProducts
        .filter(p => p.images && p.images.length > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12);
      setProducts(top);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth" });
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

      {/* How It Works */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <MousePointerClick className="w-7 h-7 text-teal-600" />
              </div>
              <div className="text-3xl font-extrabold text-teal-500 mb-1">1</div>
              <h3 className="font-semibold text-slate-800 mb-2">Pick a Design</h3>
              <p className="text-slate-500 text-sm">Browse our curated drop and choose the design you love.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Printer className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-3xl font-extrabold text-orange-400 mb-1">2</div>
              <h3 className="font-semibold text-slate-800 mb-2">We Match a Local Printer</h3>
              <p className="text-slate-500 text-sm">We connect your order with a vetted maker in our local network.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <PackageCheck className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-3xl font-extrabold text-green-500 mb-1">3</div>
              <h3 className="font-semibold text-slate-800 mb-2">Printed &amp; Shipped to You</h3>
              <p className="text-slate-500 text-sm">Your item gets printed, quality-checked, and shipped directly to your door.</p>
            </div>
          </div>
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
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`${createPageUrl("ProductDetail")}?id=${product.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-teal-600 font-bold text-lg">$5</span>
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Made locally</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Urgency Banner */}
      <section className="bg-amber-50 border-y border-amber-200 py-10 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500" />
          <h3 className="text-xl font-bold text-amber-900">Limited-Time $5 Launch Drop</h3>
          <p className="text-amber-700 text-sm max-w-md">
            These prices are part of our launch promotion. Once the drop ends, standard pricing applies. Don't miss your chance to grab premium 3D designs at $5 each.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-900 text-white py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-3">Ready to Get Your First Print?</h2>
          <p className="text-white/70 mb-8">Browse the designs above and place your first order in minutes.</p>
          <Button
            onClick={scrollToGrid}
            size="lg"
            className="bg-teal-500 hover:bg-teal-400 text-white text-lg px-10 py-6 rounded-full font-bold shadow-lg shadow-teal-500/20"
          >
            Get Your First Print
          </Button>
        </div>
      </section>
    </div>
  );
}