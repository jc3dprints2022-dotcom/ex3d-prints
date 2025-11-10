import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, DollarSign, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [products, setProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  useEffect(() => {
    loadProducts();
  }, []);

  // Preload all images when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      products.forEach((product, index) => {
        const img = new Image();
        img.src = product.images[0];
        img.onload = () => {
          setPreloadedImages(prev => new Set(prev).add(index));
        };
      });
    }
  }, [products]);

  useEffect(() => {
    if (products.length > 1 && preloadedImages.size > 0) {
      const interval = setInterval(() => {
        // Only transition if next image is preloaded
        const nextIndex = (currentImageIndex + 1) % products.length;
        if (preloadedImages.has(nextIndex)) {
          setNextImageIndex(nextIndex);
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
        const productPromises = featuredList.map(f =>
          base44.entities.Product.get(f.product_id).catch(() => null)
        );
        const productsData = await Promise.all(productPromises);
        const validProducts = productsData.filter(p => p && p.images && p.images.length > 0);
        if (validProducts.length > 0) {
          setProducts(validProducts);
          return;
        }
      }
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      const productsWithImages = allProducts.filter(p => p.images && p.images.length > 0);
      setProducts(productsWithImages.slice(0, 10));
    } catch (error) {
      console.error("Failed to load products for slideshow:", error);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `${createPageUrl("Marketplace")}?search=${encodeURIComponent(searchQuery)}`;
    } else {
      window.location.href = createPageUrl("Marketplace");
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
      setNextImageIndex(index);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(index);
        setIsTransitioning(false);
      }, 800);
    }
  };

  return (
    <section
      className="relative bg-gradient-to-br from-slate-50 via-white to-teal-50 py-20 overflow-hidden"
      style={{ minHeight: "600px" }}
    >
      {/* Background Slideshow */}
      <div className="absolute inset-0">
        {products.length > 0 && preloadedImages.size > 0 && (
          <>
            {/* Current Image - Always visible when not transitioning */}
            <div
              className="absolute inset-0 cursor-pointer transition-opacity duration-700 ease-in-out"
              style={{
                opacity: isTransitioning ? 0 : 1,
                zIndex: 10,
                pointerEvents: isTransitioning ? "none" : "auto",
              }}
              onClick={handleImageClick}
            >
              <img
                src={products[currentImageIndex]?.images?.[0]}
                alt="Featured product"
                className="w-full h-full object-cover"
                style={{
                  filter: "brightness(0.4)",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                }}
                draggable={false}
              />
            </div>

            {/* Next Image - Only visible during transition and if preloaded */}
            {/*
            {preloadedImages.has(nextImageIndex) && (
              <div
                className="absolute inset-0 cursor-pointer transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: isTransitioning ? 1 : 0,
                  zIndex: 20,
                  pointerEvents: isTransitioning ? "auto" : "none",
                }}
                onClick={handleImageClick}
              >
                <img
                  src={products[nextImageIndex]?.images?.[0]}
                  alt="Featured product"
                  className="w-full h-full object-cover"
                  style={{
                    filter: "brightness(0.4)",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                  }}
                  draggable={false}
                />
              </div>
            )}
            */}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 pointer-events-none" style={{ zIndex: 30 }} />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ zIndex: 40 }}>
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Fast, Affordable, On-Campus <br />
            <span className="text-teal-400">3D Printing</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Order locally. Printed on campus. Picked up in days
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search for 3D models, designs, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-12 h-14 text-lg border-2 border-gray-200 focus:border-teal-500 bg-white/95"
                />
              </div>
              <Button
                onClick={handleSearch}
                size="lg"
                className="h-14 px-8 bg-teal-500 hover:bg-teal-600"
              >
                Search
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              asChild
              variant="outline"
              size="lg"
              onClick={scrollToTop}
              className="h-14 px-8 border-2 border-red-400 bg-red-500/90 text-white hover:bg-red-500 backdrop-blur-sm"
            >
              <Link to={createPageUrl("CustomPrintRequest")}>
                <Upload className="w-5 h-5 mr-2" />
                Upload Custom Files
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              onClick={scrollToTop}
              className="h-14 px-8 bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Link to={createPageUrl("Marketplace")}>
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop 3D Prints Now
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              onClick={scrollToTop}
              className="h-14 px-8 border-2 border-orange-400 bg-orange-500/90 text-white hover:bg-orange-500 backdrop-blur-sm"
            >
              <Link to={createPageUrl("ForMakers")}>
                <DollarSign className="w-5 h-5 mr-2" />
                Start Printing
              </Link>
            </Button>
          </div>

          {/* Slideshow Dots */}
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