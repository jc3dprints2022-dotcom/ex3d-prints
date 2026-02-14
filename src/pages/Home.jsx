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
      


      {/* What We Do Section */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-slate-900 mb-3">What We Make</h3>
            <p className="text-lg text-slate-600">
              Custom items delivered fast — no bulk minimums
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 text-teal-600 mb-3">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">One-offs & Small Batches</h4>
                <p className="text-slate-600 text-sm">1-200 units</p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 text-purple-600 mb-3">
                  <Printer className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">Prototypes & Parts</h4>
                <p className="text-slate-600 text-sm">Custom designs welcome</p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-3">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">Branded Items</h4>
                <p className="text-slate-600 text-sm">Add your logo free</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700">
              <Link to={createPageUrl("CustomPrintRequest")}>
                Request a Quote
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Three Column Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-3">Browse Marketplace</h4>
                <p className="text-slate-600 mb-6">
                  Explore unique designs from our community
                </p>
                <Button asChild size="lg" className="w-full bg-teal-600 hover:bg-teal-700">
                  <Link to={createPageUrl("Marketplace")}>
                    Shop Now
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4">
                  <Printer className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-3">Become a Maker</h4>
                <p className="text-slate-600 mb-6">
                  Print for businesses and earn money
                </p>
                <Button asChild size="lg" className="w-full bg-orange-600 hover:bg-orange-700">
                  <Link to={createPageUrl("ForMakers")}>
                    Get Started
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Printer className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-3">Sell Your Designs</h4>
                <p className="text-slate-600 mb-6">
                  Join as a designer and earn from your work
                </p>
                <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to={createPageUrl("ForDesigners")}>
                    Get Started
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


    </div>
  );
}