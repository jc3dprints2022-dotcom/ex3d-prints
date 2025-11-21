import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, DollarSign, Globe, Shield, TrendingUp, Users, Loader2, ArrowRight } from "lucide-react";

export default function ForDesigners() {
  const [totalEarnings, setTotalEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesignerEarnings();
  }, []);

  const loadDesignerEarnings = async () => {
    try {
      const allOrders = await base44.entities.Order.list();
      const completedOrders = allOrders.filter(o =>
        ['completed', 'delivered', 'dropped_off'].includes(o.status) && o.payment_status === 'paid'
      );

      let total = 0;
      completedOrders.forEach(order => {
        order.items?.forEach(item => {
          if (item.designer_id) {
            total += item.total_price * 0.10;
          }
        });
      });

      setTotalEarnings(total);
    } catch (error) {
      console.error("Failed to load designer earnings:", error);
      setTotalEarnings(0);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Turn Your 3D Designs Into Passive Income
            </h1>
            <p className="text-xl md:text-2xl text-red-100 mb-8">
              Share your 3D designs with the world and earn from every print. Join our creative community today!
            </p>
            
            {/* Payout Display */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border-2 border-white/20">
              <p className="text-red-100 mb-2 text-lg">Total Paid to Designers</p>
              {loading ? (
                <Loader2 className="w-12 h-12 animate-spin mx-auto" />
              ) : (
                <h2 className="text-5xl md:text-6xl font-bold">
                  ${totalEarnings?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </h2>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-red-600 hover:bg-red-50 text-lg px-8 py-6 font-bold">
                <Link to={createPageUrl("DesignerSignup")}>
                  <Palette className="w-5 h-5 mr-2" />
                  Apply as a Designer
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-white border-white hover:bg-red-800 text-lg px-8 py-6">
                <Link to={createPageUrl("DesignerHowItWorks")}>
                  Learn How It Works
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - 3 Cards */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Benefits of Choosing EX3D Prints
            </h2>
            <p className="text-xl text-slate-600">
              Join our successful designers earning passive income worldwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">10% Royalties</h3>
                <p className="text-slate-600">
                  Earn on every sale with transparent tracking. Get paid monthly directly to your account.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Global Reach</h3>
                <p className="text-slate-600">
                  Your designs reach thousands of customers worldwide through our growing marketplace.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">IP Protected</h3>
                <p className="text-slate-600">
                  Your intellectual property is secured with DRM protection and controlled distribution.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="text-lg font-bold mb-2">Apply</h3>
              <p className="text-sm text-gray-600">Submit your designer application with portfolio</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="text-lg font-bold mb-2">Upload</h3>
              <p className="text-sm text-gray-600">Upload your 3D designs to our marketplace</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="text-lg font-bold mb-2">Sell</h3>
              <p className="text-sm text-gray-600">Customers discover and order your designs</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                4
              </div>
              <h3 className="text-lg font-bold mb-2">Earn</h3>
              <p className="text-sm text-gray-600">Get paid monthly for every print</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Share Your Designs With The World?
          </h2>
          <p className="text-xl mb-8">
            Join our community of talented designers and start earning passive income from your creative work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-red-600 hover:bg-red-50 text-lg px-8 py-6 font-bold">
              <Link to={createPageUrl("DesignerSignup")}>
                <Palette className="w-5 h-5 mr-2" />
                Apply Now
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-white border-white hover:bg-red-700 text-lg px-8 py-6">
              <Link to={createPageUrl("DesignerHowItWorks")}>
                Learn More
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}