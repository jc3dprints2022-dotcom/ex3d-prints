import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const SPACE_PRODUCT_NAMES = [
  "saturn v", "sls", "starship", "v-22 osprey", "solar system", "space race"
];
const HIDDEN_NAMES = [
  "slider satisfying egg fidget", "flexi dragon", "baby crystal dragon",
  "coral headphone stand", "interlocking spiral fidget"
];
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID = "69dbf08433850e148542d876";

export default function FeaturedGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.filter({ status: "active" });
      const visible = allProducts.filter(p => {
        if (!p.images?.length) return false;
        const nameLower = p.name?.toLowerCase() || "";
        return !HIDDEN_NAMES.some(h => nameLower.includes(h));
      });

      // Sort: space products first (Saturn V, SLS priority), then others by view count
      const spaceFirst = [];
      const saturnV = visible.find(p => p.id === SATURN_V_ID);
      const sls = visible.find(p => p.id === SLS_ID);
      if (saturnV) spaceFirst.push(saturnV);
      if (sls) spaceFirst.push(sls);

      const rest = visible
        .filter(p => p.id !== SATURN_V_ID && p.id !== SLS_ID)
        .sort((a, b) => {
          const aSpace = SPACE_PRODUCT_NAMES.some(s => (a.name?.toLowerCase() || "").includes(s));
          const bSpace = SPACE_PRODUCT_NAMES.some(s => (b.name?.toLowerCase() || "").includes(s));
          if (aSpace && !bSpace) return -1;
          if (!aSpace && bSpace) return 1;
          return (b.view_count || 0) - (a.view_count || 0);
        });

      setProducts([...spaceFirst, ...rest].slice(0, 9));
    } catch (error) {
      console.error("Failed to load featured products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-2">Featured Space Collection</h2>
          <p className="text-2xl md:text-3xl font-bold text-slate-900">Our best rocket models and space-inspired gifts.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`${createPageUrl("ProductDetail")}?id=${product.id}`}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.id === SATURN_V_ID && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    Best Seller
                  </div>
                )}
                {product.id === SLS_ID && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    Bundle Available
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
                  <div className="p-2 sm:p-3 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs sm:text-sm font-semibold truncate">{product.name}</p>
                    <p className="text-white/80 text-xs">${product.price?.toFixed(2)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="h-20 px-20 bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold shadow-2xl"
            onClick={() => { window.location.href = createPageUrl("Marketplace"); window.scrollTo(0, 0); }}
          >
            Shop Now
          </Button>
        </div>
      </div>
    </section>
  );
}