import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Package, Printer, CheckCircle, ArrowRight } from "lucide-react";
import HeroSection from "../components/home/HeroSection";
import HowItWorksSection from "../components/home/HowItWorksSection";
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
      
      {/* How It Works Header */}
      <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            How EX3D Prints Works
          </h2>
        </div>
      </div>

      {/* For Businesses Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-6">
              <Building2 className="w-8 h-8 text-white"/>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">For Businesses</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Made for Dental Offices</h4>
                <p className="text-slate-600">We create custom 3D printed reward items designed for pediatric patients. Each item is branded with your office name or logo and built to support a better patient experience.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <Printer className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Produced Locally</h4>
                <p className="text-slate-600">All products are manufactured locally by student makers in your community. This means fast turnaround, consistent quality, and reliable monthly delivery.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Fully Automatic</h4>
                <p className="text-slate-600">We handle design, production, and restocking. No inventory tracking. No vendor calls. Just dependable, ready-to-use rewards delivered on schedule.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Link to={createPageUrl("BusinessSubscriptions")}>
                For Businesses
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <HowItWorksSection />
      <TestimonialsSection />
    </div>
  );
}