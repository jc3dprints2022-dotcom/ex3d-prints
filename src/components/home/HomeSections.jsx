import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Users, RefreshCw } from "lucide-react";

export function HowItWorksHome() {
  const steps = [
    { number: "1", title: "Pick your rocket", description: "Choose Saturn V, SLS, or get both together as a bundle." },
    { number: "2", title: "We print it fast", description: "Each model is produced quickly and carefully by local makers." },
    { number: "3", title: "Build and display", description: "Your model arrives ready to assemble and display proudly." },
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
    { icon: Zap, title: "Fast delivery", subtitle: "Ships in days, not weeks" },
    { icon: Users, title: "Built by makers around the US", subtitle: "Not mass produced" },
    { icon: RefreshCw, title: "Free remake", subtitle: "If it's not right, we'll fix it" },
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

export function FounderSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">Built by Someone Who Loves Space</h2>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          I'm Jacob, an aerospace engineering student who helps build real rocket engines. I made these models because I wanted high-quality versions of the greatest rockets ever built. Now EX3D Prints makes them for other people who feel the same way.
        </p>
        <Link to="/SaturnV">
          <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
            See the Rocket Collection
          </Button>
        </Link>
      </div>
    </section>
  );
}

// Keep for backward compat but unused on homepage
export function CustomSection() { return null; }