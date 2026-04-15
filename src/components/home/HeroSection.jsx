import React from "react";
import { Link } from "react-router-dom";

const SATURN_V_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

export default function HeroSection() {
  return (
    <section className="relative bg-slate-900 py-24 overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900/30" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <p className="text-xs tracking-[0.4em] text-teal-400 uppercase mb-4">EX3D Prints · Rocket Collection</p>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          The Best Space Gifts<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400">You Can Buy</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Premium Saturn V and SLS rocket model kits for people who love space.
        </p>

        <div className="flex justify-center gap-3 mb-14 flex-wrap">
          <Link to="/SaturnV" className="inline-block bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105">
            Shop the Rocket Collection
          </Link>
          <Link to="/SaturnV" className="inline-block bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105">
            Get the Bundle for $60
          </Link>
        </div>

        <div className="flex justify-center gap-6 flex-wrap">
          <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 w-48 sm:w-64">
            <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-auto object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/10 w-48 sm:w-64 bg-gray-900 flex items-center justify-center">
            <img src={SLS_IMAGE} alt="SLS" className="w-full h-64 object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}