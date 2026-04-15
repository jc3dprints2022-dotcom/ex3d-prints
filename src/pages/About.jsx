import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Built by Someone Who Loves Space</h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          EX3D Prints turns real engineering and great designs into products you can actually own.
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        {/* Founder */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">About the Founder</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            I'm Jacob, an aerospace engineering student working on real rocket engines. I started EX3D Prints because I wanted high-quality models of the rockets I care about, and I couldn't find the kind I wanted. So I built them.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mt-4">
            This started with rockets like the Saturn V and SLS, but the goal is bigger than that.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        {/* What EX3D Prints Is */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">What EX3D Prints Is</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            EX3D Prints is a marketplace where you can buy real 3D printed products without needing a printer yourself.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mt-4">
            Instead of downloading files and printing them, you can just order the item and have it made and shipped to you.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        {/* How It Works */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">How It Works</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            People across the US can sign up as makers and use their own 3D printers to fulfill orders.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mt-4">
            When someone places an order, it gets routed to a qualified local maker who prints and ships the item. This allows makers to earn income using equipment they already own, while customers get faster delivery.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        {/* Designers */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">Designers</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            Designers can upload their own models to EX3D Prints and sell them as real physical products.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mt-4">
            Instead of just selling files, their designs are turned into actual items that customers can order. Designers get exposure and earn from every product sold.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        {/* Direction */}
        <section>
          <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">Where This Is Going</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            Right now, EX3D Prints is focused on building high-quality products, starting with space-related models like rockets.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mt-4">
            Over time, the goal is to expand into more categories while keeping the same system: real designers, real makers, and real products.
          </p>
        </section>

        <div className="border-t border-gray-100" />

        {/* CTA */}
        <section className="text-center">
          <Link
            to="/SaturnV"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            See the Rocket Collection
          </Link>
        </section>
      </div>
    </div>
  );
}