import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, DollarSign, FileCheck, TrendingUp } from "lucide-react";

export default function DesignerHowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How EX3D Prints Works for <span className="text-red-600">Designers</span>
          </h1>
          <p className="text-xl text-gray-600">
            A simple process to start earning from your 3D designs
          </p>
        </div>

        <div className="space-y-12 mb-16">
          <Card className="border-2 border-red-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Upload className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">1. Upload Your Designs</h2>
                  <p className="text-gray-600 mb-4">
                    After approval, upload your 3D model files for free to our platform. Add descriptions, images, and set your pricing.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Supported formats: STL, OBJ, and more</li>
                    <li>Add multiple images to showcase your design</li>
                    <li>Set your own pricing or use our recommendations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">2. We Handle Production</h2>
                  <p className="text-gray-600 mb-4">
                    When a customer orders your design, our network of makers handles the printing and shipping. You don't need to worry about manufacturing or fulfillment.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Professional makers print your designs</li>
                    <li>Quality control ensures perfect prints</li>
                    <li>Automated order tracking and updates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">3. Earn Royalties</h2>
                  <p className="text-gray-600 mb-4">
                    You earn 10% of every sale. Payments are processed monthly via your preferred payment method.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>10% royalty on every sale</li>
                    <li>Monthly automated payouts</li>
                    <li>Detailed earnings dashboard</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">4. Grow Your Portfolio</h2>
                  <p className="text-gray-600 mb-4">
                    Track your sales, receive feedback, and continue uploading new designs to grow your earnings.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Real-time sales analytics</li>
                    <li>Customer reviews and ratings</li>
                    <li>Unlimited design uploads</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">🚀 Boost Your Listings</h2>
                  <p className="text-gray-600 mb-4">
                    Want more visibility? Boost your listings to appear at the top of search results and category pages!
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>$5 per week</strong> - Flexible duration from 1 week to 1 month</li>
                    <li>Your design appears first in relevant searches</li>
                    <li>Increased views and sales potential</li>
                    <li>Perfect for new launches or seasonal designs</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-3 italic">
                    Select boost duration when uploading your design. Payment processed after admin approval.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Ready to Start Earning?</h2>
          <Link to={createPageUrl("DesignerSignup")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-lg px-8 py-6">
              Sign Up for Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}