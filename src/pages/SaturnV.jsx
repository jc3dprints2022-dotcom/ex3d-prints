import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Rocket } from "lucide-react";

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
  const [adding, setAdding] = useState(null); // null | 'saturn' | 'sls' | 'bundle'
  const [timeLeft, setTimeLeft] = useState({ h: 23, m: 59, s: 59 });
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = n => String(n).padStart(2, "0");

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) { base44.auth.redirectToLogin(window.location.href); return; }

      if (type === "saturn" || type === "bundle") {
        const ex = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
        if (ex.length > 0) {
          await base44.entities.Cart.update(ex[0].id, { unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE * ex[0].quantity });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SATURN_V_ID, product_name: "SATURN V", quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE });
        }
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const productName = type === "bundle" ? "SLS (Artemis) — Bundle" : "SLS (Artemis)";
        const ex = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
        if (ex.length > 0) {
          await base44.entities.Cart.update(ex[0].id, { unit_price: slsPrice, total_price: slsPrice * ex[0].quantity, product_name: productName });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SLS_ID, product_name: productName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice });
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Bundle added! 🚀", description: "Saturn V + SLS — $60 total" });
      setTimeout(() => { window.location.href = "/Cart"; }, 400);
    } catch (e) {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  const btnText = (type, label) => adding === type ? "Adding..." : label;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Toaster />

      {/* HERO */}
      <section className="relative bg-[#0a0a0f] min-h-[80vh] flex items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <div className="relative z-10 max-w-4xl mx-auto pt-16 pb-12">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">EX3D Prints · Space Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Get the Saturn V and SLS together for $60. Built for people who love space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              onClick={() => addToCart("bundle")}
              disabled={!!adding}
              className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-70 order-first"
            >
              {btnText("bundle", "Get the Bundle — $60")}
            </button>
            <button
              onClick={() => addToCart("saturn")}
              disabled={!!adding}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full transition-all hover:scale-105 disabled:opacity-70 backdrop-blur-sm"
            >
              {btnText("saturn", "Get Saturn V — $39")}
            </button>
            <button
              onClick={() => addToCart("sls")}
              disabled={!!adding}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full transition-all hover:scale-105 disabled:opacity-70 backdrop-blur-sm"
            >
              {btnText("sls", "Get SLS — $30")}
            </button>
          </div>
        </div>
      </section>

      {/* URGENCY SECTION */}
      <section className="bg-slate-900 border-b border-orange-500/20 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 tracking-widest uppercase">Early Access</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Limited Release Bonus</h2>
          <p className="text-gray-300 mb-6">
            Order in the next 24 hours and get access to the <strong className="text-white">EX3D Inner Circle</strong>.
            Be the first to see new rocket designs, get access to exclusive drops, and receive special discounts not available to the public.
          </p>
          <ul className="text-left inline-block space-y-2 mb-6">
            {["Early access to new releases", "Exclusive designs only available to members", "Private discounts on future drops"].map(item => (
              <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                <Rocket className="w-4 h-4 text-orange-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-orange-400 font-bold text-sm tracking-wide uppercase mb-6">Only available for the next 24 hours</p>
          {/* Countdown */}
          <div className="flex gap-4 justify-center">
            {[["Hours", timeLeft.h], ["Minutes", timeLeft.m], ["Seconds", timeLeft.s]].map(([label, val]) => (
              <div key={label} className="bg-black/40 rounded-xl px-5 py-3 border border-orange-500/20 min-w-[70px]">
                <p className="text-2xl font-bold text-orange-400 font-mono">{pad(val)}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHOOSE YOUR SETUP */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-600 uppercase text-center mb-3">Products</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Choose Your Setup</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Saturn V Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-48 object-contain mb-4 rounded-xl bg-gray-50" />
              <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">Saturn V</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">$39</p>
              <p className="text-slate-600 text-sm mb-6 flex-1">A 56cm precision-printed model kit of the rocket that took humanity to the Moon.</p>
              <button
                onClick={() => addToCart("saturn")}
                disabled={!!adding}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70"
              >
                {btnText("saturn", "Get Saturn V")}
              </button>
            </div>

            {/* SLS Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <img src={SLS_IMAGE} alt="SLS" className="w-full h-48 object-contain mb-4 rounded-xl bg-gray-50" />
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">SLS</p>
              <p className="text-3xl font-bold text-slate-900 mb-3">$30</p>
              <p className="text-slate-600 text-sm mb-6 flex-1">A 50cm precision-printed model kit inspired by the rocket taking humanity back to the Moon.</p>
              <button
                onClick={() => addToCart("sls")}
                disabled={!!adding}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70"
              >
                {btnText("sls", "Get SLS")}
              </button>
            </div>

            {/* Bundle Card - highlighted */}
            <div className="bg-gradient-to-b from-orange-50 to-white border-2 border-orange-400 rounded-2xl p-6 shadow-lg flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</span>
              <div className="flex w-full h-48 mb-4 gap-2">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-1/2 h-full object-contain rounded-xl bg-gray-50" />
                <img src={SLS_IMAGE} alt="SLS" className="w-1/2 h-full object-contain rounded-xl bg-gray-50" />
              </div>
              <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">Bundle</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">$60</p>
              <p className="text-sm text-gray-400 mb-3 line-through">$69 separately</p>
              <p className="text-slate-600 text-sm mb-6 flex-1">Get both Saturn V and SLS together and save compared to buying separately.</p>
              <button
                onClick={() => addToCart("bundle")}
                disabled={!!adding}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70"
              >
                {btnText("bundle", "Get the Bundle")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SPECS */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-600 uppercase text-center mb-3">Specifications</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Built to Spec</h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-bold text-orange-500 mb-4">Saturn V</h3>
              <div className="space-y-3">
                {[["Height", "56cm (22 inches)"], ["Scale", "1:200"], ["Material", "PLA"], ["Assembly", "Ships as a precision kit, press-fit, some glue may be needed"]].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{k}</p>
                    <p className="font-semibold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-500 mb-4">SLS (Artemis)</h3>
              <div className="space-y-3">
                {[["Height", "50cm"], ["Material", "PLA"], ["Assembly", "Ships as a precision kit, press-fit, some glue may be needed"], ["Color", "Authentic core stage orange and booster white using colored filament"]].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{k}</p>
                    <p className="font-semibold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          <div className="w-40 h-40 flex-shrink-0 rounded-full border-2 border-teal-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-teal-600 uppercase mb-3 font-bold">Why I Made These</p>
            <p className="text-slate-700 leading-loose">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I wanted high-quality models of the greatest rockets ever made, and I couldn't find the kind I wanted. So I made them. Now EX3D Prints makes them for people who feel the same way.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center bg-[#0a0a0f]">
        <div className="max-w-xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
          <h2 className="text-4xl font-bold text-white mb-4">Bring Apollo and Artemis Together</h2>
          <p className="text-gray-400 mb-10">Own both of the most iconic Moon rockets in one bundle.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              onClick={() => addToCart("bundle")}
              disabled={!!adding}
              className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-xl px-12 py-5 rounded-full shadow-xl transition-all hover:scale-105 disabled:opacity-70"
            >
              {btnText("bundle", "Get the Bundle — $60")}
            </button>
          </div>
          <div className="flex gap-4 justify-center mt-4">
            <button onClick={() => addToCart("saturn")} disabled={!!adding} className="text-gray-400 hover:text-white text-sm underline transition-colors disabled:opacity-70">
              {btnText("saturn", "Get Saturn V — $39")}
            </button>
            <span className="text-gray-700">·</span>
            <button onClick={() => addToCart("sls")} disabled={!!adding} className="text-gray-400 hover:text-white text-sm underline transition-colors disabled:opacity-70">
              {btnText("sls", "Get SLS — $30")}
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-10">© 2025 EX3D Prints · Jacob L.</p>
        </div>
      </section>
    </div>
  );
}