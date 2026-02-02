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
      <AnnouncementBanner />
      <HeroSection />
      <FeaturedProducts products={products} loading={loading} />
      <HowItWorksSection />
      <TestimonialsSection />
    </div>
  );
}