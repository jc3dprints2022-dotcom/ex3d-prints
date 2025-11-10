import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, ShoppingCart, Package, 
  Printer, DollarSign,
  ArrowRight
} from "lucide-react";

export default function HowItWorksSection() {
  const consumerSteps = [
    {
      icon: Search,
      title: "Browse & Discover",
      description: "Explore over a hundred unique 3D designs from talented creators worldwide.",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: ShoppingCart,
      title: "Customize & Order",
      description: "Choose materials, colors, and quantities. Add items to cart and checkout securely.",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: Package,
      title: "Receive Your Print",
      description: "Student makers print and deliver your print to the Student Union.",
      color: "bg-purple-100 text-purple-600"
    }
  ];

  const makerSteps = [
    {
      icon: Printer,
      title: "Register Your Printer",
      description: "List your 3D printer specifications and set your availability.",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Package,
      title: "Accept Orders",
      description: "Review and accept print jobs that match your capabilities.",
      color: "bg-teal-100 text-teal-600"
    },
    {
      icon: DollarSign,
      title: "Get Paid",
      description: "Complete orders and receive payments directly to your account.",
      color: "bg-green-100 text-green-600"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            How Express3D Prints Works
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Two simple ways to be part of our 3D printing ecosystem
          </p>
        </div>

        <div className="space-y-20">
          {/* For Consumers */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6">
              <ShoppingCart className="w-8 h-8 text-white"/>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">For Consumers</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Get unique 3D printed products with a quick turn around time!
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {consumerSteps.map((step, index) => (
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
            
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link to={createPageUrl("Marketplace")}>
                Start Shopping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* For Makers */}
          <div className="text-center">
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
              <Link to={createPageUrl("ForMakers")}>
                Become a Maker
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}