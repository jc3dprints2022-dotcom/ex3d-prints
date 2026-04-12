import React from "react";

const PRODUCT_URL = "/ProductDetail?id=693b06e655e441e07049d328";
const PRODUCT_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

export default function SaturnV() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Starfield background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }} />
        

        <div className="relative z-10 max-w-3xl mx-auto pt-20 sm:pt-28">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-6">EX3D Prints · Saturn V Kit</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Build the Rocket That Took<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Humanity to the Moon
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">A 56cm precision-printed Saturn V model kit. Build the most iconic rocket ever flown.

          </p>

          {/* Hero Image */}
          <div className="mb-10 mx-auto rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 inline-block">
            <img src={PRODUCT_IMAGE} alt="Saturn V Model Kit" className="w-auto h-auto max-w-full block" />
          </div>

          <a
            href={PRODUCT_URL}
            className="inline-block bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-orange-900/40 transition-all duration-200 hover:scale-105">
            
            Get Yours: $39
          </a>
        </div>
      </section>

      {/* STORY */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          {/* Founder photo */}
          <div className="w-48 h-48 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">The Story</p>
            <p className="text-gray-300 leading-loose text-lg">
              I'm Jacob. I'm an aerospace engineering student who helps build real rocket engines. I printed this because I wanted a high quality model of the greatest rocket ever made. Now I make them for people who feel the same way.
            </p>
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* SPECS */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Specifications</p>
          <h2 className="text-3xl font-bold text-center mb-12">Built to Spec</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
            { label: "Height", value: "56cm (22 inches)" },
            { label: "Scale", value: "1:200" },
            { label: "Material", value: "PLA" },
            { label: "Assembly", value: "Ships as a precision kit, press-fit, no glue required" }].
            map((spec) =>
            <div key={spec.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{spec.label}</p>
                <p className="text-white font-semibold">{spec.value}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-800 max-w-4xl mx-auto" />



      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Your Desk Deserves This</h2>
        <p className="text-gray-400 mb-10 max-w-sm mx-auto">Hand-printed, shipped in 5–7 days. Free shipping over $35.</p>
        <a
          href={PRODUCT_URL}
          className="inline-block bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-xl px-12 py-5 rounded-full shadow-xl shadow-orange-900/50 transition-all duration-200 hover:scale-105">
          
          Build Yours: $39
        </a>
        <p className="text-gray-700 text-xs mt-6">© 2025 EX3D Prints · Jacob C.</p>
      </section>
    </div>);

}