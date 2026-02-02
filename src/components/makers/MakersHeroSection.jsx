import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, TrendingUp, Loader2, DollarSign } from "lucide-react";

export default function MakersHeroSection({ paidToMakers, loading }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <section className="relative z-0 py-20 bg-gradient-to-br from-slate-100 via-white to-orange-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Turn Your 3D Printer Into a
              <span className="text-orange-500"> Profitable Business</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Join our maker community earning consistent income from their 3D printers. 
              No upfront work needed, we bring the customers to you.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">70%</p>
                <p className="text-sm text-slate-600">Profit Each Order</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <Printer className="w-8 h-8 text-orange-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">Skill</p>
                <p className="text-sm text-slate-600">Receive skill-matched orders</p>
              </div>
            </div>

            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-14 px-8">
              <Link to={createPageUrl("MakerSignup")}>
                Start Earning Today
              </Link>
            </Button>
          </div>

          {/* Right: Paid to Makers Card with Orange Background */}
          <div className="flex items-center justify-center">
            <Card 
              className="text-white shadow-2xl w-full max-w-sm text-center bg-orange-500"
            >
              <CardContent className="p-8">
                <DollarSign className="w-12 h-12 mx-auto mb-4"/>
                <p className="text-lg font-medium">Total Maker Revenue</p>
                {loading ? <Loader2 className="w-10 h-10 mx-auto mt-2 animate-spin"/> : (
                  <p className="text-5xl font-bold mt-2">${paidToMakers.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}