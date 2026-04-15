import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const SATURN_V_ID = "693b06e655e441e07049d328";
const SATURN_V_PRICE = 39;
const SLS_ID = "69dbf08433850e148542d876";
const SLS_PRICE = 30;
const BUNDLE_PRICE = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE; // $21

const SATURN_V_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

export default function SaturnV() {
  const [adding, setAdding] = useState(null); // 'saturn' | 'sls' | 'bundle'
  const [countdown, setCountdown] = useState({ h: 23, m: 59, s: 42 });
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("saturnv_countdown_start");
    if (!stored) {
      localStorage.setItem("saturnv_countdown_start", Date.now().toString());
    }
    const tick = setInterval(() => {
      const start = parseInt(localStorage.getItem("saturnv_countdown_start") || Date.now().toString());
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const total = 24 * 3600;
      const remaining = Math.max(0, total - elapsed);
      setCountdown({
        h: Math.floor(remaining / 3600),
        m: Math.floor((remaining % 3600) / 60),
        s: remaining % 60,
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      if (type === "saturn" || type === "bundle") {
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: SATURN_V_PRICE,
            total_price: SATURN_V_PRICE * existing[0].quantity,
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
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName = type === "bundle" ? "SLS (Artemis) — Bundle" : "SLS (Artemis)";
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: slsPrice,
            total_price: slsPrice * existing[0].quantity,
          });
        } else {
          await base44.entities.Cart.create({
            user_id: user.id,
            product_id: SLS_ID,
            product_name: slsName,
            quantity: 1,
            selected_material: "PLA",
            selected_color: "Shown Colors",
            unit_price: slsPrice,
            total_price: slsPrice,
          });
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") {
        toast({ title: "Bundle added! 🚀", description: "Saturn V + SLS — $60 total" });
        setTimeout(() => { window.location.href = "/Cart"; }, 600);
      } else {
        window.location.href = "/Cart";
      }
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      <Toaster />

      {/* HERO — Bundle First */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-4xl mx-auto pt-20 sm:pt-28">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-6">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Get the Saturn V and SLS together for $60. Built for people who love space.
          </p>

          {/* Both rocket images */}
          <div className="flex justify-center gap-6 flex-wrap mb-12">
            <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 w-48 sm:w-56">
              <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/10 w-48 sm:w-56 bg-gray-900 flex items-center justify-center">
              <img src={SLS_IMAGE} alt="SLS" className="w-full h-56 object-contain" />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => addToCart("bundle")}
              disabled={!!adding}
              className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-orange-900/40 transition-all duration-200 hover:scale-105 disabled:opacity-70"
            >
              {adding === "bundle" ? "Adding..." : "Get the Bundle — $60"}
            </button>
            <button
              onClick={() => addToCart("saturn")}
              disabled={!!adding}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-4 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-70"
            >
              {adding === "saturn" ? "Adding..." : "Get Saturn V — $39"}
            </button>
            <button
              onClick={() => addToCart("sls")}
              disabled={!!adding}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-4 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-70"
            >
              {adding === "sls" ? "Adding..." : "Get SLS — $30"}
            </button>
          </div>
        </div>
      </section>

      {/* URGENCY — Limited Release */}
      <section className="py-20 px-6 bg-[#0f0f1a]">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold px-4 py-1 rounded-full mb-6 tracking-widest uppercase">Early Access</span>
          <h2 className="text-3xl font-bold text-white mb-3">Limited Release Bonus</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Order in the next 24 hours and get access to the EX3D Inner Circle.
          </p>
          <p className="text-gray-400 mb-6">
            Be the first to see new rocket designs, get access to exclusive drops, and receive special discounts not available to the public.
          </p>
          <ul className="text-left inline-block space-y-2 mb-8">
            {["Early access to new releases", "Exclusive designs only available to members", "Private discounts on future drops"].map(b => (
              <li key={b} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          {/* Countdown */}
          <div className="flex justify-center gap-4 mb-8">
            {[["h", countdown.h], ["m", countdown.m], ["s", countdown.s]].map(([label, val]) => (
              <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 text-center min-w-[70px]">
                <p className="text-3xl font-bold text-white font-mono">{pad(val)}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-orange-400 font-bold text-sm mb-6">Only available for the next 24 hours</p>
          <a href="#choose" className="inline-block bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-semibold px-8 py-3 rounded-full transition-colors text-sm">
            Unlock This Bonus ↓
          </a>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* CHOOSE YOUR SETUP */}
      <section id="choose" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Choose Your Setup</p>
          <h2 className="text-3xl font-bold text-center mb-12">Pick What You Want</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Saturn V Card */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-48 object-cover rounded-xl mb-4" />
              <h3 className="text-xl font-bold text-white mb-1">Saturn V</h3>
              <p className="text-2xl font-bold text-orange-400 mb-3">$39</p>
              <p className="text-gray-400 text-sm mb-6 flex-1">A 56cm precision-printed model kit of the rocket that took humanity to the Moon.</p>
              <button
                onClick={() => addToCart("saturn")}
                disabled={!!adding}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-full transition-all disabled:opacity-70"
              >
                {adding === "saturn" ? "Adding..." : "Get Saturn V"}
              </button>
            </div>

            {/* SLS Card */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="w-full h-48 bg-gray-800 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                <img src={SLS_IMAGE} alt="SLS" className="w-full h-48 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">SLS</h3>
              <p className="text-2xl font-bold text-blue-400 mb-3">$30</p>
              <p className="text-gray-400 text-sm mb-6 flex-1">A 50cm precision-printed model kit inspired by the rocket taking humanity back to the Moon.</p>
              <button
                onClick={() => addToCart("sls")}
                disabled={!!adding}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold py-3 rounded-full transition-all disabled:opacity-70"
              >
                {adding === "sls" ? "Adding..." : "Get SLS"}
              </button>
            </div>

            {/* Bundle Card — highlighted */}
            <div className="bg-gradient-to-br from-orange-900/40 to-yellow-900/20 border-2 border-orange-500/60 rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 w-full h-48 rounded-xl mb-4 overflow-hidden">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-1/2 h-full object-cover" />
                <div className="w-1/2 h-full bg-gray-800 flex items-center justify-center">
                  <img src={SLS_IMAGE} alt="SLS" className="w-full h-full object-contain" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Bundle</h3>
              <p className="text-2xl font-bold text-orange-400 mb-3">$60</p>
              <p className="text-gray-300 text-sm mb-6 flex-1">Get both Saturn V and SLS together and save compared to buying separately.</p>
              <button
                onClick={() => addToCart("bundle")}
                disabled={!!adding}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold py-3 rounded-full transition-all disabled:opacity-70 hover:scale-105"
              >
                {adding === "bundle" ? "Adding..." : "Get the Bundle"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* SPECIFICATIONS */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Specifications</p>
          <h2 className="text-3xl font-bold text-center mb-12">Built to Spec</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-4">Saturn V</h3>
              <div className="space-y-3">
                {[
                  { label: "Height", value: "56cm (22 inches)" },
                  { label: "Scale", value: "1:200" },
                  { label: "Material", value: "PLA" },
                  { label: "Assembly", value: "Precision kit, press-fit, some glue may be needed" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-white font-semibold text-sm">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-4">SLS</h3>
              <div className="space-y-3">
                {[
                  { label: "Height", value: "50cm" },
                  { label: "Material", value: "PLA" },
                  { label: "Assembly", value: "Precision kit, press-fit, some glue may be needed" },
                  { label: "Color", value: "Authentic core stage orange & booster white" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-white font-semibold text-sm">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
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
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">Why I Made These</p>
            <p className="text-gray-300 leading-loose text-lg">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I wanted high-quality models of the greatest rockets ever made, and I couldn't find the kind I wanted. So I made them. Now EX3D Prints makes them for people who feel the same way.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-10 max-w-sm mx-auto">
          Own both of the most iconic Moon rockets in one bundle.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => addToCart("bundle")}
            disabled={!!adding}
            className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-xl px-12 py-5 rounded-full shadow-xl shadow-orange-900/50 transition-all duration-200 hover:scale-105 disabled:opacity-70"
          >
            {adding === "bundle" ? "Adding..." : "Get the Bundle — $60"}
          </button>
          <button
            onClick={() => addToCart("saturn")}
            disabled={!!adding}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-5 rounded-full transition-all disabled:opacity-70"
          >
            Get Saturn V
          </button>
          <button
            onClick={() => addToCart("sls")}
            disabled={!!adding}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-5 rounded-full transition-all disabled:opacity-70"
          >
            Get SLS
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-10">© 2025 EX3D Prints · Jacob L.</p>
      </section>
    </div>
  );
}