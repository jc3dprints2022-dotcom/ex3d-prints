import React from "react";
import { Button } from "@/components/ui/button";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

export default function FounderSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 flex-shrink-0 rounded-full overflow-hidden border-4 border-teal-200 mx-auto md:mx-0">
            <img src={FOUNDER_IMAGE} alt="Jacob" className="w-full h-full object-cover" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-3">Built by Someone Who Loves Space</h2>
            <p className="text-slate-700 text-lg leading-relaxed mb-6">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I made these models because I wanted high-quality versions of the greatest rockets ever built. Now EX3D Prints makes them for other people who feel the same way.
            </p>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              onClick={() => { window.location.href = "/SaturnV"; window.scrollTo(0, 0); }}
            >
              See the Rocket Collection
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}