import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, Search, Printer, Package, CheckCircle, 
  Zap, Shield, TrendingUp, DollarSign 
} from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            How EX3D Prints Works
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            From browsing to delivery - your 3D printing journey made simple
          </p>
        </div>
      </section>

      {/* For Customers Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              For Customers
            </h2>
            <p className="text-xl text-slate-600">
              Get your 3D prints in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">1. Browse & Select</h3>
                <p className="text-slate-600">
                  Explore our marketplace of pre-designed 3D models or upload your own custom files for printing.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">2. We Print</h3>
                <p className="text-slate-600">
                  Our network of skilled makers receives your order and begins printing your item with care.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">3. Pick Up</h3>
                <p className="text-slate-600">
                  Pick up your completed print at the campus location - fast, convenient, and hassle-free.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For Makers Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              For Makers
            </h2>
            <p className="text-xl text-slate-600">
              Turn your 3D printer into a revenue stream
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Sign Up</h3>
                <p className="text-sm text-slate-600">
                  Quick application process to join our maker network
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Receive Orders</h3>
                <p className="text-sm text-slate-600">
                  Get matched with print jobs that fit your capabilities
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Printer className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Print & Deliver</h3>
                <p className="text-sm text-slate-600">
                  Complete the print and drop off at campus pickup location
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Get Paid</h3>
                <p className="text-sm text-slate-600">
                  Earn 50% of the order value with monthly payouts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-teal-500 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8">
            Whether you're looking to print or make, we've got you covered.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-gray-100">
              <Link to={createPageUrl("Marketplace")}>
                Browse Marketplace
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white border-2 hover:bg-white/10 hover:text-white">
              <Link to={createPageUrl("MakerSignup")}>
                Become a Maker
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}