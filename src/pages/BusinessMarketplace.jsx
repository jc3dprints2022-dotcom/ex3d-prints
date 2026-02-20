import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Building2, ArrowRight, CheckCircle } from "lucide-react";

const INDUSTRIES = [
  "Retail & E-commerce",
  "Healthcare & Medical",
  "Manufacturing & Industrial",
  "Technology & Electronics",
  "Hospitality & Events",
  "Education & Research",
  "Consumer Goods",
  "Other"
];

const QUANTITIES = [
  { value: "20-50", label: "20-50 units" },
  { value: "50-100", label: "50-100 units" },
  { value: "100-500", label: "100-500 units" },
  { value: "500-1000", label: "500-1,000 units" },
  { value: "1000+", label: "1,000+ units" }
];

const BUDGETS = [
  { value: "0-500", label: "Under $500" },
  { value: "500-2000", label: "$500 - $2,000" },
  { value: "2000-5000", label: "$2,000 - $5,000" },
  { value: "5000-10000", label: "$5,000 - $10,000" },
  { value: "10000+", label: "$10,000+" }
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
          <div className="inline-flex items-center gap-2 bg-teal-600/20 border border-teal-500/30 px-4 py-2 rounded-full text-sm mb-6">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>Trusted by 500+ Businesses</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Manufacturing Solutions for Your Business
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            We manufacture high-quality 3D printed products for businesses to sell, distribute, and use. Tell us what you need, and we'll provide curated options.
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

        <div className="space-y-8">
          {/* Industry Selection */}
          <Card className={`transition-all ${industry ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold">Select Your Industry</h3>
                  <p className="text-sm text-gray-600">What type of business do you operate?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {INDUSTRIES.map(ind => (
                  <Badge
                    key={ind}
                    variant={industry === ind ? "default" : "outline"}
                    className={`cursor-pointer py-3 px-4 text-center justify-center transition-all ${
                      industry === ind 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => setIndustry(ind)}
                  >
                    {ind}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quantity Selection */}
          <Card className={`transition-all ${quantity ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold">Choose Your Quantity</h3>
                  <p className="text-sm text-gray-600">How many units do you need manufactured?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {QUANTITIES.map(q => (
                  <Badge
                    key={q.value}
                    variant={quantity === q.value ? "default" : "outline"}
                    className={`cursor-pointer py-3 px-4 text-center justify-center transition-all ${
                      quantity === q.value 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => setQuantity(q.value)}
                  >
                    {q.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Selection */}
          <Card className={`transition-all ${budget ? 'ring-2 ring-teal-500' : ''}`}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold">Set Your Budget</h3>
                  <p className="text-sm text-gray-600">What's your estimated budget for this project?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {BUDGETS.map(b => (
                  <Badge
                    key={b.value}
                    variant={budget === b.value ? "default" : "outline"}
                    className={`cursor-pointer py-3 px-4 text-center justify-center transition-all ${
                      budget === b.value 
                        ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => setBudget(b.value)}
                  >
                    {b.label}
                  </Badge>
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
              Please select all three options to continue
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
                <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Distributed Network</h3>
                <p className="text-sm text-gray-600">
                  Access to hundreds of verified manufacturers ensures we meet your production deadlines
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Quality Guaranteed</h3>
                <p className="text-sm text-gray-600">
                  Multi-stage quality control process ensures every product meets professional standards
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Fast & Scalable</h3>
                <p className="text-sm text-gray-600">
                  From prototypes to thousands of units with competitive volume pricing
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}