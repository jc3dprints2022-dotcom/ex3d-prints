import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function HeroSection() {
  const [products, setProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      products.forEach((product, index) => {
        const img = new Image();
        img.src = product.images[0];
        img.onload = () => {
          setPreloadedImages((prev) => new Set(prev).add(index));
        };
      });
    }
  }, [products]);

  useEffect(() => {
    if (products.length > 1 && preloadedImages.size > 0) {
      const interval = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % products.length;
        if (preloadedImages.has(nextIndex)) {
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentImageIndex(nextIndex);
            setIsTransitioning(false);
          }, 300);
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [products, currentImageIndex, preloadedImages]);

  const loadProducts = async () => {
    try {
      const featuredList = await base44.entities.HomepageFeatured.filter({ is_active: true });
      if (featuredList.length > 0) {
        featuredList.sort((a, b) => a.display_order - b.display_order);
        const productsData = await Promise.all(
          featuredList.map((f) => base44.entities.Product.get(f.product_id).catch(() => null))
        );
        const validProducts = productsData.filter((p) => p && p.status === "active" && p.images && p.images.length > 0);
        if (validProducts.length > 0) {
          setProducts(validProducts);
          return;
        }
      }
      const allProducts = await base44.entities.Product.list();
      const topProducts = allProducts
        .filter((p) => p.status === "active" && p.images && p.images.length > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12);
      setProducts(topProducts);
    } catch (error) {
      console.error("Failed to load products for slideshow:", error);
    }
  };

  const handleImageClick = () => {
    if (products[currentImageIndex]) {
      window.location.href = `${createPageUrl("ProductDetail")}?id=${products[currentImageIndex].id}`;
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDotClick = (index) => {
    if (preloadedImages.has(index) && index !== currentImageIndex) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(index);
        setIsTransitioning(false);
      }, 800);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-white to-teal-50 py-20 overflow-hidden" style={{ minHeight: "600px" }}>
      {/* Background Slideshow */}
      <div className="absolute inset-0">
        {products.length > 0 && preloadedImages.size > 0 && (
          <>
            <div
              className="absolute inset-0 cursor-pointer transition-opacity duration-700 ease-in-out"
              style={{ opacity: isTransitioning ? 0 : 1, zIndex: 10, pointerEvents: isTransitioning ? "none" : "auto" }}
              onClick={handleImageClick}
            >
              <img
                src={products[currentImageIndex]?.images?.[0]}
                alt="Featured product"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.6)", transform: "translateZ(0)", backfaceVisibility: "hidden" }}
                draggable={false}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/40 pointer-events-none" style={{ zIndex: 30 }} />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 40 }}>
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Forgot a Gift?<br />
            <span className="text-teal-400">{"We've Got You."}</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Unique 3D printed gifts delivered in days, not weeks.
          </p>

          <div className="flex justify-center mb-8">
            <Button
              asChild
              size="lg"
              onClick={scrollToTop}
              className="h-20 px-20 bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold shadow-2xl"
            >
              <Link to={createPageUrl("Marketplace")}>Marketplace</Link>
            </Button>
          </div>

          {products.length > 1 && (
            <div className="flex justify-center gap-2">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  disabled={!preloadedImages.has(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? "bg-teal-400 w-8"
                      : preloadedImages.has(index)
                      ? "bg-white/50 hover:bg-white/80"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}