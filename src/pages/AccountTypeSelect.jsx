import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Building2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AccountTypeSelect() {
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedType) return;
    
    setLoading(true);
    try {
      // Update user account type
      await base44.auth.updateMe({ account_type: selectedType });
      
      // Redirect based on type
      if (selectedType === 'business') {
        window.location.href = createPageUrl("BusinessDashboard");
      } else {
        window.location.href = createPageUrl("ConsumerDashboard");
      }
    } catch (error) {
      console.error("Failed to set account type:", error);
      // If update fails, still redirect to appropriate dashboard
      if (selectedType === 'business') {
        window.location.href = createPageUrl("BusinessDashboard");
      } else {
        window.location.href = createPageUrl("ConsumerDashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Welcome to EX3D Prints!</h1>
          <p className="text-gray-600 text-lg">
            Let's set up your account. What type of shopper are you?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Consumer Option */}
          <Card 
            className={`cursor-pointer transition-all border-2 ${
              selectedType === 'consumer' 
                ? 'border-teal-500 ring-4 ring-teal-100' 
                : 'border-gray-200 hover:border-teal-300'
            }`}
            onClick={() => setSelectedType('consumer')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Personal Shopper</h2>
              <p className="text-gray-600 mb-4">
                I'm shopping for myself or individual purchases
              </p>
              <ul className="text-sm text-left space-y-2 text-gray-600">
                <li>✓ Browse marketplace products</li>
                <li>✓ Individual orders & custom requests</li>
                <li>✓ Earn & redeem EXP rewards</li>
                <li>✓ Quick campus pickup</li>
              </ul>
            </CardContent>
          </Card>

          {/* Business Option */}
          <Card 
            className={`cursor-pointer transition-all border-2 ${
              selectedType === 'business' 
                ? 'border-purple-500 ring-4 ring-purple-100' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => setSelectedType('business')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Business Account</h2>
              <p className="text-gray-600 mb-4">
                I'm ordering products for my business to sell
              </p>
              <ul className="text-sm text-left space-y-2 text-gray-600">
                <li>✓ Wholesale pricing & bulk discounts</li>
                <li>✓ Recurring order automation</li>
                <li>✓ Minimum 30-unit orders</li>
                <li>✓ Business dashboard & analytics</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            onClick={handleContinue}
            disabled={!selectedType || loading}
            className={`px-12 ${
              selectedType === 'business' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {loading ? "Setting up..." : "Continue"}
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            You can change this later in your account settings
          </p>
        </div>
      </div>
    </div>
  );
}