import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, ShoppingCart, Package, 
  Printer, DollarSign,
  ArrowRight, Upload, CheckCircle
} from "lucide-react";

export default function HowItWorksSection() {
  const consumerSteps = [
    {
      icon: Search,
      title: "Browse & Discover",
      description: "Explore hundreds of unique 3D designs from talented creators worldwide.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: ShoppingCart,
      title: "Customize & Order",
      description: "Personalize and add items to your cart to checkout securely.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Package,
      title: "Receive Your Print",
      description: "Local makers print and deliver your order within a few days.",
      color: "bg-purple-100 text-purple-600"
    }
  ];

  const makerSteps = [
    {
      icon: Printer,
      title: "Register Your Printer",
      description: "Share your printer details and set when you're available to print.",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Package,
      title: "Accept Jobs",
      description: "Receive print orders that match your skills and equipment.",
      color: "bg-teal-100 text-teal-600"
    },
    {
      icon: DollarSign,
      title: "Get Paid",
      description: "Complete the job and get paid directly to your account.",
      color: "bg-green-100 text-green-600"
    }
  ];

  const designerSteps = [
    {
      icon: Upload,
      title: "Sign Up",
      description: "Create your account, add your details, and connect your bank to get started.",
      color: "bg-red-100 text-red-600"
    },
    {
      icon: Package,
      title: "Upload Your Designs",
      description: "Easily list your designs using our simple upload tools.",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: DollarSign,
      title: "Earn Money",
      description: "When someone orders your design, you earn 10% of the profit.",
      color: "bg-green-100 text-green-600"
    }
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-0">
          {/* For Makers */}
          <div className="text-center pb-16 pt-0">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl mb-6">
              <Printer className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">For Makers</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Turn your 3D printer into a profitable business
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {makerSteps.map((step, index) => (
                <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${step.color} mb-4`}>
                      <step.icon className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-slate-600">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
              <Link to={createPageUrl("MakerSignup")}>
                Become a Maker
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="text-center pb-8">
            <p className="text-slate-600 max-w-3xl mx-auto text-lg leading-relaxed">
              Browse ready to buy items from local makers or submit a custom request. If you need something designed, we do it for free. Every order is matched with a trusted local maker to keep shipping low and quality high. If it is not right, we remake it free.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}