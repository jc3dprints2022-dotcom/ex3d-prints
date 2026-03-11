import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Printer, CheckCircle, ArrowRight } from "lucide-react";
import HeroSection from "../components/home/HeroSection";
import HowItWorksSection from "../components/home/HowItWorksSection";
import TestimonialsSection from "../components/home/TestimonialsSection";
import EmailSignupReward from "../components/shared/EmailSignupReward";

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

      {/* For Shoppers Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">For Shoppers</h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Browse unique 3D printed designs or request custom creations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 text-teal-600 mb-3">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Browse the Marketplace</h4>
                <p className="text-slate-600 text-sm mb-4">
                  Explore unique 3D printed products from talented designers
                </p>
                <Button asChild size="sm" className="w-full bg-teal-600 hover:bg-teal-700">
                  <Link to={createPageUrl("Marketplace")}>
                    Visit Marketplace
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-3">
                  <Printer className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Request Custom Prints</h4>
                <p className="text-slate-600 text-sm mb-4">
                  Upload your file or describe your idea for a custom quote
                </p>
                <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to={createPageUrl("CustomPrintRequest")}>
                    Request Custom Print
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Wholesale Pricing</h4>
                <p className="text-slate-600">Order 3D printed products for retail stores in volume with automatic discounts and flexible delivery options.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <Printer className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Fast Production</h4>
                <p className="text-slate-600">Locally produced by our network of makers. Quick turnaround times with consistent quality.</p>
              </CardContent>
            </Card>
            
            <Card className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-2">Recurring Orders</h4>
                <p className="text-slate-600">Never run out of inventory by setting up automatic biweekly, or monthly reorders.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Link to={createPageUrl("BusinessMarketplace")}>
                Browse Business Marketplace
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      {/* For Designers Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">For Designers</h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Turn your 3D designs into income. Join our marketplace and reach thousands of customers.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Sell Your Designs</h4>
                <p className="text-slate-600 text-sm">Upload your 3D models and earn from every sale. Set your own prices and control your inventory.</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">We Handle Production</h4>
                <p className="text-slate-600 text-sm">Focus on creating. Our network of makers handles printing, packaging, and delivery to customers.</p>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <Printer className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Grow Your Brand</h4>
                <p className="text-slate-600 text-sm">Build your reputation, gain followers, and establish yourself in the 3D printing community.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link to={createPageUrl("ForDesigners")}>
                Learn More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <TestimonialsSection />
      
      <EmailSignupReward />
    </div>
  );
}