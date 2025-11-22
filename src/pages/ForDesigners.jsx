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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">
              For Designers
            </h1>
            <p className="text-xl text-red-100 max-w-3xl mx-auto mb-8">
              Share your 3D designs with the world and earn from every print. Join our creative community today!
            </p>
            <Link to={createPageUrl("DesignerSignup")}>
              <Button size="lg" className="bg-white text-red-600 hover:bg-red-50 text-lg px-8 py-6 font-bold">
                Apply as a Designer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-3">10% Royalties</h3>
              <p className="text-red-100">
                Earn on every sale with transparent tracking
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Wide Reach</h3>
              <p className="text-pink-100">
                Your designs reach thousands
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Protected</h3>
              <p className="text-purple-100">
                Your IP secured with DRM protection
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
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

        <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-0 mb-16">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Designer Earnings</h2>
            {loading ? (
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            ) : (
              <p className="text-6xl font-bold mb-4">
                ${totalEarnings?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
            )}
            <p className="text-xl text-red-100">Total earned by our designers</p>
          </CardContent>
        </Card>

        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Share Your Designs?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our community of talented designers and start earning passive income from your creative work
          </p>
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