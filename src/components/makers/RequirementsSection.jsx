
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star } from "lucide-react";

export default function RequirementsSection() {
  const requirements = [
    "Own a working FDM 3D printer",
    "Consistent print quality",
    "Reliable internet connection",
    "Ability to meet deadlines",
    "Basic knowledge of slicing software"
  ];

  const benefits = [
    "No upfront costs or inventory",
    "We handle customer service",
    "Flexible work hours",
    "Weekly payouts",
    "Growing customer base"
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Maker Requirements
          </h2>
          <p className="text-xl text-gray-600">
            Here's what you need to become an EX3D maker
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Requirements</h3>
              <ul className="space-y-4">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-lg">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center border-none shadow-lg">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Earn Rewards</h3>
              <p className="text-gray-600">
                Earn 250 EXP for using a referral code on your first order. Redeem EXP for rewards, filament, and equipment!
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Benefits</h3>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          
          <Card className="text-center border-none shadow-lg">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Sell Designs Faster</h3>
              <p className="text-gray-600">
                Designs with more documentation and high quality images sell more quickly. Remember, the more people buy the product, the more you earn!
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  );
}
