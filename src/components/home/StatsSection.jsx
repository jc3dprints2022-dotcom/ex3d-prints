import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, Users, Star } from "lucide-react";

export default function StatsSection({ totalProducts }) {
  const stats = [
    {
      icon: Package,
      value: totalProducts > 0 ? `${totalProducts}+` : "Loading...",
      label: "Designs Available",
      color: "text-blue-600"
    },
    {
      icon: Package,
      value: "10,000+",
      label: "Products Printed",
      color: "text-blue-600"
    },
    {
      icon: Clock,
      value: "7 Days",
      label: "Average Delivery",
      color: "text-green-600"
    },
    {
      icon: Users,
      value: "1,000+",
      label: "Active Makers",
      color: "text-purple-600"
    },
    {
      icon: Star,
      value: "4.9/5",
      label: "Customer Rating",
      color: "text-orange-600"
    }
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-slate-600">
            Join our growing community of creators and innovators
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md mb-4`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</div>
                <div className="text-slate-600 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
  */}
}