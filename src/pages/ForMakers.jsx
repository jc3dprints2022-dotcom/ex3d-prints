import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign, Printer, ArrowRight, TrendingUp, Shield, Users
} from "lucide-react";

import MakersHeroSection from "../components/makers/MakersHeroSection";
import RequirementsSection from "../components/makers/RequirementsSection";

export default function ForMakers() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      try {
        // Use actual payout records for accuracy
        const payouts = await base44.entities.Payout.filter({ user_role: 'maker', status: 'completed' });
        const paid = payouts.reduce((sum, p) => sum + (p.net_amount || 0), 0);
        setTotalRevenue(paid);
      } catch (error) {
        // Fallback to order estimates
        try {
          const [completed, dropped, delivered] = await Promise.all([
            base44.entities.Order.filter({ status: 'completed' }),
            base44.entities.Order.filter({ status: 'dropped_off' }),
            base44.entities.Order.filter({ status: 'delivered' })
          ]);
          const allOrders = [...completed, ...dropped, ...delivered];
          const paid = allOrders.reduce((sum, order) => sum + (order.maker_payout_amount || order.total_amount * 0.50 || 0), 0);
          setTotalRevenue(paid);
        } catch (e) {
          console.error("Failed to fetch revenue:", e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  const paidToMakers = totalRevenue;

  return (
    <div className="min-h-screen">
      <MakersHeroSection paidToMakers={paidToMakers} loading={loading} />
      <RequirementsSection />

      {/* Why Choose Us Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Benefits of Choosing EX3D Prints
            </h2>
            <p className="text-xl text-slate-600">
              Join our successful makers building profitable businesses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Consistent Orders</h3>
                <p className="text-slate-600">
                  Our growing customer base means steady work and reliable income for dedicated makers. Earn 50% per order plus priority order profit.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Monthly Payments</h3>
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
                  Connect with other makers, share tips, and grow your skills in our supportive community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section with Orange Background and Orange Button Text */}
      <section className="py-20 bg-orange-500 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Turn Your 3D Printer Into Profit?
          </h2>
          <p className="text-xl mb-8">
            Join our maker community and start earning money doing what you love.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white border-white text-orange-500 hover:bg-slate-300">
              <Link to={createPageUrl("MakerSignup")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <Printer className="w-5 h-5 mr-2" />
                Start Making Money
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-white border-white hover:bg-slate-300">
              <Link to={createPageUrl("MakerHowItWorks")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="text-orange-500">Learn How It Works</span>
                <ArrowRight className="w-5 h-5 ml-2 text-orange-500" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}