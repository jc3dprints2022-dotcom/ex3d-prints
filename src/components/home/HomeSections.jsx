import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Zap, DollarSign, RefreshCw } from "lucide-react";

export function HowItWorksHome() {
  const steps = [
    { number: "1", title: "Pick a gift", description: "Browse our marketplace for the perfect 3D printed gift." },
    { number: "2", title: "We print in 24–48 hrs", description: "A local maker prints your order fast." },
    { number: "3", title: "You get it fast", description: "Shipped or delivered to you in days." },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-14 h-14 rounded-full bg-teal-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyUsSection() {
  const reasons = [
    { icon: Zap, title: "Fast delivery", subtitle: "Days, not weeks" },
    { icon: DollarSign, title: "From $10", subtitle: "Affordable unique gifts" },
    { icon: RefreshCw, title: "Free remake", subtitle: "If it's not right" },
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase text-center mb-10">Why Us</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {reasons.map((r) => (
            <div key={r.title} className="text-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4">
                <r.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{r.title}</h3>
              <p className="text-slate-600">{r.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">Custom</h2>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Need something specific?</h3>
        <p className="text-lg text-slate-600 mb-8">
          Tell us what you want. We handle the rest.
        </p>
        <Button
          asChild
          size="lg"
          className="h-20 px-20 bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold shadow-2xl"
        >
          <Link to={createPageUrl("CustomPrintRequest")}>Request a Gift</Link>
        </Button>
      </div>
    </section>
  );
}