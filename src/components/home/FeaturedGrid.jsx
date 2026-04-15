import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function FeaturedGrid() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const featuredList = await base44.entities.HomepageFeatured.filter({ is_active: true });

      if (featuredList.length > 0) {
        featuredList.sort((a, b) => a.display_order - b.display_order);
        const productsData = await Promise.all(
          featuredList.map((f) => base44.entities.Product.get(f.product_id).catch(() => null))
        );
        const valid = productsData.filter((p) => p && p.status === "active" && p.images?.length > 0);
        if (valid.length > 0) {
          setProducts(valid.slice(0, 9));
          setLoading(false);
          return;
        }
      }

      const allProducts = await base44.entities.Product.filter({ status: "active" });
      const top = allProducts
        .filter((p) => p.images?.length > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 9);
      setProducts(top);
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
          <p className="text-2xl md:text-3xl font-bold text-slate-900">Fast, Unique Gifts</p>
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