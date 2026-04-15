import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Building2, ArrowRight, CheckCircle } from "lucide-react";

const INDUSTRIES = [
  "Local Souvenir Shops",
  "Toy Store",
  "Health & Personal Care",
  "Office & Desk",
  "Other"
];

const QUANTITIES = [
  { value: "30-100", label: "30-100 units", min: 30, max: 100 },
  { value: "100-250", label: "100-250 units", min: 100, max: 250 },
  { value: "250-500", label: "250-500 units", min: 250, max: 500 },
  { value: "500-1000", label: "500-1,000 units", min: 500, max: 1000 },
  { value: "1000+", label: "1,000+ units", min: 1000, max: 2000 }
];

const BUDGETS = [
  { value: "0-100", label: "Under $100", min: 0, max: 100 },
  { value: "100-500", label: "$100 - $500", min: 100, max: 500 },
  { value: "500-2000", label: "$500 - $2,000", min: 500, max: 2000 },
  { value: "2000-5000", label: "$2,000 - $5,000", min: 2000, max: 50000 },
  { value: "5000+", label: "$5,000+", min: 5000, max: 20000 }
];

export default function BusinessMarketplace() {
  const [industry, setIndustry] = useState(null);
  const [quantity, setQuantity] = useState(null);
  const [budget, setBudget] = useState(null);

  const handleViewProducts = () => {
    const params = new URLSearchParams();
    if (industry) params.set('industry', industry);
    if (quantity) params.set('quantity', quantity);
    if (budget) params.set('budget', budget);
    
    window.location.href = `${createPageUrl("BusinessCatalog")}?${params.toString()}`;
  };

  const canProceed = industry || quantity || budget;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            3D Printing for Your Business
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            We manufacture high-quality 3D printed products for businesses to sell.
          </p>
        </div>
      </div>

      {/* Main Selection Interface */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Get Started in 3 Simple Steps</h2>
          <p className="text-gray-600">
            Help us understand your manufacturing needs
          </p>
        </div>

        {/* 3-Column Selection Interface */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Industry Selection */}
          <Card className={`transition-all ${industry ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold">Industry</h3>
                  <p className="text-xs text-gray-600">Your retail type</p>
                </div>
              </div>
              <div className="space-y-2">
                {INDUSTRIES.map(ind => (
                  <div
                    key={ind}
                    className={`cursor-pointer p-3 rounded-lg border-2 transition-all text-sm ${
                      industry === ind 
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold' 
                        : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                    onClick={() => setIndustry(ind)}
                  >
                    {ind}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quantity Selection */}
          <Card className={`transition-all ${quantity ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold">Quantity</h3>
                  <p className="text-xs text-gray-600">Units needed</p>
                </div>
              </div>
              <div className="space-y-2">
                {QUANTITIES.map(q => (
                  <div
                    key={q.value}
                    className={`cursor-pointer p-3 rounded-lg border-2 transition-all text-sm ${
                      quantity === q.value 
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold' 
                        : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                    onClick={() => setQuantity(q.value)}
                  >
                    {q.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Selection */}
          <Card className={`transition-all ${budget ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold">Budget</h3>
                  <p className="text-xs text-gray-600">Project budget</p>
                </div>
              </div>
              <div className="space-y-2">
                {BUDGETS.map(b => (
                  <div
                    key={b.value}
                    className={`cursor-pointer p-3 rounded-lg border-2 transition-all text-sm ${
                      budget === b.value 
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold' 
                        : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}
                    onClick={() => setBudget(b.value)}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="mt-12 text-center">
          <Button 
            size="lg" 
            onClick={handleViewProducts}
            disabled={!canProceed}
            className={`text-lg px-12 py-6 h-auto ${
              canProceed 
                ? 'bg-teal-600 hover:bg-teal-700' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            View Curated Products
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          {!canProceed && (
            <p className="text-sm text-gray-500 mt-3">
              Select at least one option to see curated products
            </p>
          )}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-slate-100 py-16 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Businesses Choose EX3D</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-600">
                  24 hour production start. Most orders completed within 3-5 business days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Made Locally</h3>
                <p className="text-sm text-gray-600">
                  Network of Prescott.-based manufacturers ensures quality control and supports local economy
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Cost Effective</h3>
                <p className="text-sm text-gray-600">
                  Competitive pricing with volume discounts up to 15% off.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}