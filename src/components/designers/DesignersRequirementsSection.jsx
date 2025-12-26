import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function DesignersRequirementsSection() {
  const requirements = [
    "Original 3D designs that you own the rights to",
    "High-quality STL, OBJ, or 3MF files",
    "Clear product images showing the finished print",
    "Accurate specifications (dimensions, print time, weight)",
    "Designs that are commercially licensable"
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Designer Requirements
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We welcome all skill levels! Here's what you need to start selling your designs
          </p>
        </div>

        <Card className="max-w-3xl mx-auto shadow-lg border-red-200">
          <CardContent className="p-8">
            <ul className="space-y-4">
              {requirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-lg text-gray-700">{requirement}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 p-6 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-900 mb-2">💡 Pro Tip</h4>
              <p className="text-red-800">
                Designs with detailed descriptions, multiple high-quality photos, and assembly instructions tend to sell better!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}