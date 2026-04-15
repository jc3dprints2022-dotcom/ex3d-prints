import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const SPACE_PRODUCT_IDS = [
  "693b06e655e441e07049d328", // Saturn V
  "69dbf08433850e148542d876", // SLS
];
const SPACE_KEYWORDS = ["saturn", "sls", "starship", "v-22", "osprey", "solar system", "space race", "rocket", "space", "artemis", "apollo"];
const HIDE_KEYWORDS = ["fidget", "dragon", "egg", "headphone", "spiral", "flexi", "crystal"];
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID = "69dbf08433850e148542d876";

export default function FeaturedGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await base44.entities.Product.filter({ status: "active" });
      const withImages = allProducts.filter((p) => p.images?.length > 0);

      // Priority: known space IDs first, then keyword matches, then hide non-space
      const priority = withImages.filter(p => SPACE_PRODUCT_IDS.includes(p.id));
      const keywordMatch = withImages.filter(p =>
        !SPACE_PRODUCT_IDS.includes(p.id) &&
        SPACE_KEYWORDS.some(kw => p.name?.toLowerCase().includes(kw) || p.tags?.some(t => t.toLowerCase().includes(kw)))
      );
      const rest = withImages.filter(p =>
        !SPACE_PRODUCT_IDS.includes(p.id) &&
        !SPACE_KEYWORDS.some(kw => p.name?.toLowerCase().includes(kw) || p.tags?.some(t => t.toLowerCase().includes(kw))) &&
        !HIDE_KEYWORDS.some(kw => p.name?.toLowerCase().includes(kw))
      );

      const ordered = [...priority, ...keywordMatch, ...rest].slice(0, 9);
      setProducts(ordered);
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
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-2">Featured</h2>
          <p className="text-2xl md:text-3xl font-bold text-slate-900">Featured Space Collection</p>
          <p className="text-slate-600 mt-2">Our best rocket models and space-inspired gifts.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
            {products.map((product) => {
              const isSaturnV = product.id === SATURN_V_ID;
              const isSLS = product.id === SLS_ID;
              return (
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
                  {isSaturnV && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Best Seller</div>
                  )}
                  {isSLS && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Bundle Available</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
                    <div className="p-2 sm:p-3 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs sm:text-sm font-semibold truncate">{product.name}</p>
                      <p className="text-white/80 text-xs">${product.price?.toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="h-20 px-20 bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold shadow-2xl"
            onClick={() => {
              window.location.href = createPageUrl("Marketplace");
              window.scrollTo(0, 0);
            }}
          >
            Shop Now
          </Button>
        </div>
      </div>
    </section>
  );
}