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
      icon: Clock,
      value: "2-3 Days",
      label: "Fast Delivery",
      color: "text-green-600"
    },
    {
      icon: Users,
      value: "Local",
      label: "Campus Makers",
      color: "text-purple-600"
    },
    {
      icon: Star,
      value: "Quality",
      label: "Guaranteed",
      color: "text-orange-600"
    }
  ];

  return (
    <section className="py-12 md:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">
            For Shoppers
          </h2>
          <p className="text-lg md:text-xl text-slate-600">
            Browse, order, and receive high-quality 3D prints
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-8">
                <div className={`inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white rounded-full shadow-md mb-2 md:mb-4`}>
                  <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
                </div>
                <div className="text-xl md:text-3xl font-bold text-slate-900 mb-1 md:mb-2">{stat.value}</div>
                <div className="text-xs md:text-base text-slate-600 font-medium">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
}