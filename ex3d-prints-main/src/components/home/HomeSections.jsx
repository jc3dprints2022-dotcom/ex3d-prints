import React from "react";
import { Button } from "@/components/ui/button";
import { Zap, Users, RefreshCw } from "lucide-react";



export function HowItWorksHome() {
  const steps = [
    { number: "1", title: "Designers Upload Models", description: "Creators share their 3D designs and ideas with our platform." },
    { number: "2", title: "You Pick the Design", description: "Browse and choose from hundreds of unique designs that match your style." },
    { number: "3", title: "Local Maker Prints", description: "Your order goes to skilled makers who produce it quickly with precision." },
    { number: "4", title: "Product Ships Fast", description: "Your finished item arrives quickly and ready to use." },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase text-center mb-10">How It Works</h2>
        <p className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-10">From designers to your doorstep</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-14 h-14 rounded-full bg-teal-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyUsSection() {
  const reasons = [
    { icon: Zap, title: "Fast delivery", subtitle: "Ships in days, not weeks" },
    { icon: Users, title: "Built by makers around the US", subtitle: "Handcrafted, not mass produced" },
    { icon: RefreshCw, title: "Free remake guarantee", subtitle: "If it's not right, we'll fix it free" },
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase text-center mb-10">Why EX3D Prints</h2>
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
          size="lg"
          className="h-20 px-20 bg-teal-600 hover:bg-teal-700 text-white text-2xl font-bold shadow-2xl"
          asChild
        >
          <a href="/CustomPrintRequest">Request a Gift</a>
        </Button>
      </div>
    </section>
  );
}