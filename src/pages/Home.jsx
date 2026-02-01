import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AnnouncementBanner from "../components/home/AnnouncementBanner";
import HeroSection from "../components/home/HeroSection";
import HowItWorksSection from "../components/home/HowItWorksSection";
import StatsSection from "../components/home/StatsSection";
import FeaturedProducts from "../components/home/FeaturedProducts";
import TestimonialsSection from "../components/home/TestimonialsSection";

export default function Home() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

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
      <StatsSection />
      <FeaturedProducts products={products} loading={loading} />
      <HowItWorksSection />
      <TestimonialsSection />
    </div>
  );
}