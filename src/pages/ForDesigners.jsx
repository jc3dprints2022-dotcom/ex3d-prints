import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, DollarSign, Globe, Shield, TrendingUp, Users, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            For <span className="text-red-600">Designers</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Share your 3D designs with the world and earn from every print. Join our creative community today!
          </p>
          <div className="mt-8">
            <Link to={createPageUrl("DesignerSignup")}>
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6">
                Apply as a Designer
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-2 border-red-200 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Earn Royalties</h3>
              <p className="text-gray-600">
                Get paid every time your design is printed. Earn 10% of every sale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Global Reach</h3>
              <p className="text-gray-600">
                Your designs reach customers worldwide through our marketplace.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Protected Designs</h3>
              <p className="text-gray-600">
                Your intellectual property is protected with our DRM system.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Apply</h3>
              <p className="text-sm text-gray-600">Submit your designer application with portfolio</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Upload</h3>
              <p className="text-sm text-gray-600">Upload your 3D designs to our marketplace</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Sell</h3>
              <p className="text-sm text-gray-600">Customers discover and order your designs</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Earn</h3>
              <p className="text-sm text-gray-600">Get paid monthly for every print</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Designer Earnings</h2>
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-12 h-12 text-red-600" />
            </div>
            {loading ? (
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-red-600 mb-4" />
            ) : (
              <p className="text-5xl font-bold text-red-600 mb-4">
                ${totalEarnings?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
            )}
            <p className="text-gray-600">Total earned by our designers</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8">Ready to Share Your Designs?</h2>
          <Link to={createPageUrl("DesignerSignup")}>
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6">
              Apply Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}