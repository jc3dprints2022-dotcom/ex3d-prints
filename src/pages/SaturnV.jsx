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
  const [timeLeft, setTimeLeft] = useState({ h: 23, m: 47, s: 12 });
  const { toast } = useToast();

  // Countdown timer
  useEffect(() => {
    const key = "saturnv_timer_end";
    let end = localStorage.getItem(key);
    if (!end) {
      end = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(key, end);
    }
    const tick = () => {
      const diff = Math.max(0, parseInt(end) - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) { base44.auth.redirectToLogin(window.location.href); return; }

      if (type === "saturn" || type === "bundle") {
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, { unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE * existing[0].quantity });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SATURN_V_ID, product_name: "SATURN V", quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE });
        }
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName = type === "bundle" ? "SLS (Artemis) — Bundle" : "SLS (Artemis)";
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, { unit_price: slsPrice, total_price: slsPrice * existing[0].quantity, product_name: slsName });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SLS_ID, product_name: slsName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice });
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") {
        toast({ title: "Bundle added! 🚀", description: "Saturn V + SLS — $60 total" });
      }
      setTimeout(() => { window.location.href = "/Cart"; }, type === "bundle" ? 600 : 0);
    } catch (e) {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  const Btn = ({ type, children, className = "" }) => (
    <button
      onClick={() => addToCart(type)}
      disabled={adding !== null}
      className={`font-bold rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-70 shadow-lg ${className}`}
    >
      {adding === type ? "Adding..." : children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-4xl mx-auto pt-20 sm:pt-28">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-5">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5 text-white">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
            Get the Saturn V and SLS together for $60. Built for people who love space.
          </p>

          {/* Both rockets side by side — aligned by center */}
          <div className="flex justify-center items-center gap-6 mb-10">
            <div className="flex flex-col items-center">
              <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 w-[160px] sm:w-[200px] h-[220px] sm:h-[280px] flex items-center justify-center bg-gray-900">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="max-w-full max-h-full object-contain" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Saturn V</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/20 w-[160px] sm:w-[200px] h-[220px] sm:h-[280px] flex items-center justify-center bg-gray-900">
                <img src={SLS_IMAGE} alt="SLS" className="max-w-full max-h-full object-contain" />
              </div>
              <p className="text-xs text-gray-400 mt-2">SLS</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-3">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-10 py-4 shadow-orange-900/40">
              Get the Bundle — $60
            </Btn>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Btn type="saturn" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm px-6 py-2">
              Get Saturn V — $39
            </Btn>
            <Btn type="sls" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm px-6 py-2">
              Get SLS — $30
            </Btn>
          </div>
        </div>
      </section>

      {/* ── URGENCY SECTION ── */}
      <section className="py-16 px-6 bg-[#0f0f1a] border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block bg-orange-500/20 text-orange-400 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-orange-500/30 mb-6">Early Access</span>
          <h2 className="text-3xl font-bold mb-3">Limited Release Bonus</h2>
          <p className="text-gray-400 mb-6">Order in the next 24 hours and get access to the EX3D Inner Circle</p>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Be the first to see new rocket designs, get access to exclusive drops, and receive special discounts not available to the public.
          </p>
          <ul className="text-left max-w-xs mx-auto space-y-2 mb-8">
            {["Early access to new releases", "Exclusive designs only available to members", "Private discounts on future drops"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="text-orange-400">✦</span> {item}
              </li>
            ))}
          </ul>
          <div className="flex justify-center gap-4 text-center mb-6">
            {[["h", timeLeft.h], ["m", timeLeft.m], ["s", timeLeft.s]].map(([label, val]) => (
              <div key={label} className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-3 min-w-[64px]">
                <div className="text-3xl font-bold text-orange-400 font-mono">{pad(val)}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-orange-400 font-bold text-sm">Only available for the next 24 hours</p>
          <button
            onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-6 inline-block bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm px-6 py-2 rounded-full transition-all"
          >
            Unlock This Bonus
          </button>
        </div>
      </section>

      {/* ── CHOOSE YOUR SETUP ── */}
      <section id="choose-setup" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Choose Your Setup</p>
          <h2 className="text-3xl font-bold text-center mb-12">Pick What's Right for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Saturn V card */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-gray-800">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">Saturn V</h3>
              <p className="text-orange-400 font-bold text-lg mb-3">$39</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 56cm precision-printed model kit of the rocket that took humanity to the Moon.</p>
              <Btn type="saturn" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Get Saturn V
              </Btn>
            </div>

            {/* SLS card */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-gray-800">
                <img src={SLS_IMAGE} alt="SLS" className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-lg mb-3">$30</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 50cm precision-printed model kit inspired by the rocket taking humanity back to the Moon.</p>
              <Btn type="sls" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Get SLS
              </Btn>
            </div>

            {/* Bundle card — highlighted */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 rounded-xl overflow-hidden bg-gray-800">
                  <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-20 object-contain" />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-gray-800">
                  <img src={SLS_IMAGE} alt="SLS" className="w-full h-20 object-contain" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">Bundle</h3>
              <p className="text-orange-400 font-bold text-lg mb-1">$60</p>
              <p className="text-gray-500 text-xs mb-3">Save vs. buying separately</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">Get both Saturn V and SLS together and save compared to buying separately.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get the Bundle
              </Btn>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* ── SPECS ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Specifications</p>
          <h2 className="text-3xl font-bold text-center mb-12">Built to Spec</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 text-orange-400">Saturn V</h3>
              <div className="space-y-3">
                {[["Height", "56cm (22 inches)"], ["Scale", "1:200"], ["Material", "PLA"], ["Assembly", "Ships as a precision kit, press-fit, some glue may be needed"]].map(([k, v]) => (
                  <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{k}</p>
                    <p className="text-white font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4 text-blue-400">SLS (Artemis)</h3>
              <div className="space-y-3">
                {[["Height", "50cm"], ["Scale", "1:200"], ["Material", "PLA"], ["Assembly", "Ships as a precision kit, press-fit, some glue may be needed"]].map(([k, v]) => (
                  <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{k}</p>
                    <p className="text-white font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* ── STORY ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          <div className="w-44 h-44 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
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

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-10 max-w-sm mx-auto">
          Own both of the most iconic Moon rockets in one bundle.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-12 py-5 shadow-xl shadow-orange-900/50">
            Get the Bundle — $60
          </Btn>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Btn type="saturn" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm px-8 py-3">
            Get Saturn V — $39
          </Btn>
          <Btn type="sls" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm px-8 py-3">
            Get SLS — $30
          </Btn>
        </div>
        <p className="text-gray-700 text-xs mt-12">© 2025 EX3D Prints · Jacob L.</p>
      </section>
    </div>
  );
}