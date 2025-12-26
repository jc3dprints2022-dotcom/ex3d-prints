import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Palette, DollarSign, Loader2 } from "lucide-react";

export default function DesignersHeroSection({ totalEarnings, loading }) {
  return (
    <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-pink-600 text-white py-24 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <Palette className="w-5 h-5" />
              <span className="font-semibold">For Creative Designers</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Turn Your Designs Into Passive Income
            </h1>
            
            <p className="text-xl text-red-100 mb-8">
              Upload your 3D models, reach thousands of customers, and earn 10% royalties on every print. No upfront costs, no inventory management.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-white text-red-600 hover:bg-red-50 h-14 px-8">
                <Link to={createPageUrl("DesignerSignup")}>
                  <Palette className="w-5 h-5 mr-2" />
                  Apply as Designer
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white/20 h-14 px-8">
                <Link to={createPageUrl("DesignerHowItWorks")}>
                  Learn More
                </Link>
              </Button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Total Paid to Designers</h3>
              {loading ? (
                <Loader2 className="w-12 h-12 animate-spin mx-auto my-4" />
              ) : (
                <p className="text-5xl font-bold mb-2">
                  ${totalEarnings?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              )}
              <p className="text-red-100">And growing every day!</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/20">
              <div className="text-center">
                <p className="text-3xl font-bold">10%</p>
                <p className="text-sm text-red-100">Royalty</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">∞</p>
                <p className="text-sm text-red-100">Listings</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">24/7</p>
                <p className="text-sm text-red-100">Earning</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}