import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const SATURN_V_ID = "693b06e655e441e07049d328";
const SATURN_V_PRICE = 39;
const SLS_ID = "69dbf08433850e148542d876";
const SLS_PRICE = 30;
const BUNDLE_PRICE = 60;

// Bundle split: Saturn V $39, SLS $21 (total $60)
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE;

const SATURN_V_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SATURN_V_URL = "/ProductDetail?id=693b06e655e441e07049d328";

export default function SaturnV() {
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingBundle, setAddingBundle] = useState(false);
  const { toast } = useToast();

  const addSaturnVToCart = async () => {
    setAddingToCart(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
      if (existing.length > 0) {
        await base44.entities.Cart.update(existing[0].id, {
          quantity: existing[0].quantity + 1,
          total_price: SATURN_V_PRICE * (existing[0].quantity + 1),
        });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          product_id: SATURN_V_ID,
          product_name: "SATURN V",
          quantity: 1,
          selected_material: "PLA",
          selected_color: "Shown Colors",
          unit_price: SATURN_V_PRICE,
          total_price: SATURN_V_PRICE,
        });
      }
      window.dispatchEvent(new Event("cartUpdated"));
      window.location.href = "/Cart";
    } catch (e) {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAddingToCart(false);
  };

  const addBundleToCart = async () => {
    setAddingBundle(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      // Add Saturn V at $39
      const existingSaturn = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
      if (existingSaturn.length > 0) {
        await base44.entities.Cart.update(existingSaturn[0].id, {
          unit_price: SATURN_V_PRICE,
          total_price: SATURN_V_PRICE * existingSaturn[0].quantity,
        });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          product_id: SATURN_V_ID,
          product_name: "SATURN V",
          quantity: 1,
          selected_material: "PLA",
          selected_color: "Shown Colors",
          unit_price: SATURN_V_PRICE,
          total_price: SATURN_V_PRICE,
        });
      }

      // Add SLS at bundle price ($21 to make total $60)
      const existingSLS = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
      if (existingSLS.length > 0) {
        await base44.entities.Cart.update(existingSLS[0].id, {
          unit_price: BUNDLE_SLS_PRICE,
          total_price: BUNDLE_SLS_PRICE * existingSLS[0].quantity,
        });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          product_id: SLS_ID,
          product_name: "SLS (Artemis) — Bundle",
          quantity: 1,
          selected_material: "PLA",
          selected_color: "Shown Colors",
          unit_price: BUNDLE_SLS_PRICE,
          total_price: BUNDLE_SLS_PRICE,
        });
      }

      window.dispatchEvent(new Event("cartUpdated"));
      toast({ title: "Bundle added to cart! 🚀", description: "Saturn V + SLS — $60 total" });
      setTimeout(() => { window.location.href = "/Cart"; }, 800);
    } catch (e) {
      toast({ title: "Failed to add bundle to cart", variant: "destructive" });
    }
    setAddingBundle(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      <Toaster />

      {/* HERO — Saturn V */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-3xl mx-auto pt-20 sm:pt-28">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-6">EX3D Prints · Saturn V Kit</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Build the Rocket That Took<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Humanity to the Moon
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            A 56cm precision-printed Saturn V model kit. Build the most iconic rocket ever flown.
          </p>

          <div className="mb-10 mx-auto rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 inline-block">
            <img src={SATURN_V_IMAGE} alt="Saturn V Model Kit" className="w-auto h-auto max-w-full block" />
          </div>

          <button
            onClick={addSaturnVToCart}
            disabled={addingToCart}
            className="inline-block bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-orange-900/40 transition-all duration-200 hover:scale-105 disabled:opacity-70"
          >
            {addingToCart ? "Adding..." : "Get Yours: $39"}
          </button>
        </div>
      </section>

      {/* SATURN V SPECS */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Specifications</p>
          <h2 className="text-3xl font-bold text-center mb-12">Saturn V — Built to Spec</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Height", value: "56cm (22 inches)" },
              { label: "Scale", value: "1:200" },
              { label: "Material", value: "PLA" },
              { label: "Assembly", value: "Ships as a precision kit, press-fit, some glue may be needed" },
            ].map((spec) => (
              <div key={spec.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{spec.label}</p>
                <p className="text-white font-semibold">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* SLS SECTION */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-blue-400 uppercase mb-6">EX3D Prints · SLS Kit</p>
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6 text-white">
            Build the Rocket Taking<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-white">
              Humanity Back to the Moon
            </span>
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            A 50cm precision-printed SLS model kit inspired by the rocket powering the Artemis generation. Printed in authentic core stage orange and solid rocket booster white using colored filament.
          </p>

          <div className="mb-10 mx-auto rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/10 inline-block">
            <img src={SLS_IMAGE} alt="SLS Model Kit" className="w-auto h-auto max-w-full block max-h-[500px] object-contain" />
          </div>

          <a
            href={"/ProductDetail?id=" + SLS_ID}
            className="inline-block bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 mb-12"
          >
            Get Yours: $30
          </a>

          {/* SLS Specs */}
          <div className="mb-12">
            <p className="text-xs tracking-[0.4em] text-blue-400 uppercase text-center mb-4">Specifications</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                { label: "Height", value: "50cm" },
                { label: "Material", value: "PLA" },
                { label: "Assembly", value: "Ships as a precision kit, press-fit, some glue may be needed" },
                { label: "Color", value: "Authentic core stage orange & booster white using colored filament" },
              ].map((spec) => (
                <div key={spec.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{spec.label}</p>
                  <p className="text-white font-semibold">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bundle callout */}
          <div className="bg-gradient-to-br from-orange-900/40 to-blue-900/40 border border-orange-500/30 rounded-2xl p-8">
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">Bundle Offer</p>
            <p className="text-3xl font-bold text-white mb-2">Get the Saturn V + SLS together for $60</p>
            <p className="text-gray-400 text-sm">Buy both and save compared to purchasing separately.</p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* STORY */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          <div className="w-48 h-48 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">The Story</p>
            <p className="text-gray-300 leading-loose text-lg">
              I'm Jacob. I'm an aerospace engineering student who helps build real rocket engines. I printed these because I wanted high quality models of the greatest rockets ever made. Now I make them for people who feel the same way.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* FINAL CTA — Bundle */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Your Desk Deserves Both</h2>
        <p className="text-gray-400 mb-10 max-w-sm mx-auto">
          Hand-printed, shipped in 5–7 days. Bring Apollo and Artemis together in one bundle.
        </p>
        <button
          onClick={addBundleToCart}
          disabled={addingBundle}
          className="inline-block bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-xl px-12 py-5 rounded-full shadow-xl shadow-orange-900/50 transition-all duration-200 hover:scale-105 disabled:opacity-70"
        >
          {addingBundle ? "Adding..." : "Get Both: $60"}
        </button>
        <p className="text-gray-700 text-xs mt-6">© 2025 EX3D Prints · Jacob L.</p>
      </section>
    </div>
  );
}