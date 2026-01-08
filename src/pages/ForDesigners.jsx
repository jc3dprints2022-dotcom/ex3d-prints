import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, DollarSign, Globe, Shield, TrendingUp, Users, Loader2, Upload, ArrowRight } from "lucide-react";
import DesignersRequirementsSection from "../components/designers/DesignersRequirementsSection";

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
      {/* New Code Based on Maker's Hero Section */}  
      <section className="relative z-0 py-20 bg-gradient-to-br from-slate-100 via-white to-red-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Turn Your Ideas Into
                <span className="text-red-500"> Real Money</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Join our designer community earning royalties from their 3D CAD models. 
                No marketing needed - we bring the customers to you.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">10%</p>
                  <p className="text-sm text-slate-600">Royalties for each of your prints sold</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <DollarSign className="w-8 h-8 text-red-600 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">Monthly</p>
                  <p className="text-sm text-slate-600">Royalty Payouts</p>
                </div>
              </div>

              <Button size="lg" className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-orange-600 hover:to-red-700 h-14 px-8">
                <Link to={createPageUrl("DesignerSignup")}>
                  Start Earning Today
                </Link>
              </Button>
            </div>

            {/* Right: Paid to Designers Card with Red Background */}
            <div className="flex items-center justify-center">
              <Card 
                className="text-white shadow-2xl w-full max-w-sm text-center bg-red-500"
              >
                <CardContent className="p-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4"/>
                  <p className="text-lg font-medium">Total Designer Revenue</p>
                  {loading ? <Loader2 className="w-10 h-10 mx-auto mt-2 animate-spin"/> : (
                    <p className="text-5xl font-bold mt-2">${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <DesignersRequirementsSection />

      {/* Why Choose Us Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Benefits of Choosing EX3D Prints
            </h2>
            <p className="text-xl text-slate-600">
              Join our successful designers building profitable businesses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Consistent Sales</h3>
                <p className="text-slate-600">
                  Our growing customer base means reliable sales for dedicated designers. Earn 10% per sale of your design.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Secure Payments</h3>
                <p className="text-slate-600">
                  Get paid quickly and securely through our platform. Monthly payouts directly to your account.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Community Support</h3>
                <p className="text-slate-600">
                  Connect with other designers, share tips, and grow your skills in our supportive community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section with Orange Background and Orange Button Text */}
      <section className="py-20 bg-red-500 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Turn Your Designs Into Profit?
          </h2>
          <p className="text-xl mb-8">
            Join our designer community and start earning money doing what you love.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white border-white text-red-500 hover:bg-slate-300">
              <Link to={createPageUrl("DesignerSignup")}>
                <Upload className="w-5 h-5 mr-2" />
                Start Making Money
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-white border-white hover:bg-slate-300">
              <Link to={createPageUrl("HowItWorks")}>
                <span className="text-orange-500">Learn How It Works</span>
                <ArrowRight className="w-5 h-5 ml-2 text-red-500" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

