import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Package, DollarSign, TrendingUp } from "lucide-react";

export default function MakerHowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How EX3D Prints Works for <span className="text-orange-600">Makers</span>
          </h1>
          <p className="text-xl text-gray-600">
            A simple process to start earning from your 3D printer
          </p>
        </div>

        <div className="space-y-12 mb-16">
          <Card className="border-2 border-orange-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Printer className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">1. Sign Up & Get Approved</h2>
                  <p className="text-gray-600 mb-4">
                    Apply to become a maker by submitting your 3D printer details and experience. Once approved, you'll gain access to our order management dashboard.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Register your 3D printers and materials</li>
                    <li>Set your weekly printing capacity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">2. Receive Orders</h2>
                  <p className="text-gray-600 mb-4">
                    Orders are automatically assigned to you based on your printer capabilities, available materials, and capacity. Accept orders that fit your schedule.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Smart order matching based on your equipment</li>
                    <li>Accept or decline orders at your discretion</li>
                    <li>Download print files and instructions instantly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">3. Print & Deliver</h2>
                  <p className="text-gray-600 mb-4">
                    Print the order, update the status, and drop off or ship it. Track all your orders in one convenient dashboard.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Print at your own pace within the deadline</li>
                    <li>Simple campus pickup cabinet system</li>
                    <li>Update order status in real-time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3">4. Get Paid</h2>
                  <p className="text-gray-600 mb-4">
                    Earn 70% of the order value (minus Stripe fees). Payments are processed weekly via Stripe Connect directly to your bank account.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>70% commission on every completed order</li>
                    <li>Weekly automated payouts</li>
                    <li>Detailed earnings tracking and reports</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Ready to Start Earning?</h2>
          <Link to={createPageUrl("MakerSignup")}>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6">
              Sign Up for Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}