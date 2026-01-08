import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star } from "lucide-react";

export default function DesignersRequirementsSection() {
  const requirements = [
    "Original 3D designs that you own the rights to",
    "High-quality STL, OBJ, or 3MF files",
    "Clear product images showing the finished print",
    "Accurate specifications (dimensions, print time, weight)",
    "Designs that are commercially licensable"
  ];

  const benefits = [
    "High royalty rates",
    "We handle customer service",
    "Upload on your own terms",
    "Monthly payouts",
    "Growing customer base"
  ];

    const steps = [
    "Name your new design and select a category",
    "Add a product description",
    "Enter stats about the product",
    "Attach the files and pictures ",
    "Add assembly instructions if necessary"
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Designer Requirements
          </h2>
          <p className="text-xl text-gray-600">
            Here's what you need to become an EX3D designer
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

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Steps for Upload</h3>

              <ol className="space-y-4 list-decimal list-inside">
                {steps.map((step, index) => (
                  <li key={index} className="text-gray-700 text-lg">
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  );
}
