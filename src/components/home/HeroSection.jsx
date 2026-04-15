import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative bg-[#0a0a0f] py-28 overflow-hidden min-h-[600px] flex items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">EX3D Prints · Space Collection</p>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          The Best Space Gifts<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
            You Can Buy
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Premium Saturn V and SLS rocket model kits for people who love space.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/SaturnV">
            <Button className="h-14 px-10 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg font-bold rounded-full shadow-lg shadow-orange-900/40 transition-all hover:scale-105 border-0">
              Shop the Rocket Collection
            </Button>
          </Link>
          <Link to="/SaturnV">
            <Button variant="outline" className="h-14 px-10 text-white border-white/30 bg-white/10 hover:bg-white/20 text-lg font-bold rounded-full backdrop-blur-sm">
              Get the Bundle for $60
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}