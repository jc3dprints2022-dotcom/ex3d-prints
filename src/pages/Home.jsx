import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AnnouncementBanner from "../components/home/AnnouncementBanner";
import HeroSection from "../components/home/HeroSection";
import HowItWorksSection from "../components/home/HowItWorksSection";
import FeaturedProducts from "../components/home/FeaturedProducts";
import TestimonialsSection from "../components/home/TestimonialsSection";

export default function Home() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    loadUser();
    loadFeaturedProducts();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const loadFeaturedProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      setTotalProducts(allProducts.length);
      
      // Load featured products from HomepageFeatured entity
      const featuredList = await base44.entities.HomepageFeatured.filter({ is_active: true });
      
      if (featuredList.length > 0) {
        // Sort by display order
        featuredList.sort((a, b) => a.display_order - b.display_order);
        
        // Fetch the actual product details
        const productPromises = featuredList.map(f =>
          base44.entities.Product.get(f.product_id).catch(() => null)
        );
        const productsData = await Promise.all(productPromises);
        const validProducts = productsData.filter(p => p && p.status === 'active');
        
        if (validProducts.length > 0) {
          setProducts(validProducts);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to most viewed products if no featured products set
      const featured = allProducts
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12);
      setProducts(featured);
    } catch (error) {
      console.error("Failed to load featured products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <HeroSection />
      
      {/* What We Do Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Local Distributed Manufacturing for Pediatric Practices
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              EX3D Prints is a local distributed manufacturing network that provides custom pediatric engagement rewards through a subscription model. We design, produce, and deliver high-quality 3D printed reward items for dental and medical offices, allowing practices to improve patient experience without managing inventory or vendors. Everything is locally produced, customizable with your business's name or logo, and delivered on a predictable monthly schedule. We're infrastructure for pediatric engagement, not a hobby print shop.
            </p>
          </div>
        </div>
      </section>

      <HowItWorksSection />
      <TestimonialsSection />
    </div>
  );
}