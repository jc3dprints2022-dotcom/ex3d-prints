import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const SATURN_V_ID = "693b06e655e441e07049d328";
const SATURN_V_PRICE = 39;
const SLS_ID = "69dbf08433850e148542d876";
const SLS_PRICE = 30;
const BUNDLE_PRICE = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE; // $21
const SEPARATE_TOTAL = SATURN_V_PRICE + SLS_PRICE; // $69
const BUNDLE_SAVINGS = SEPARATE_TOTAL - BUNDLE_PRICE; // $9

const SATURN_V_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";
// TODO: Replace this with a working/lab/workshop photo of Jacob — the tuxedo portrait reads as "student," not "aerospace engineer"
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

// TODO: Update these with real values
const SHIPPING_DAYS = "5-10 days";
const MAKER_COUNT = "a growing network of"; // e.g. "12" once you know

export default function SaturnV() {
  const [adding, setAdding] = useState(null); // 'saturn' | 'sls' | 'bundle'
  const [openFaq, setOpenFaq] = useState(null);
  const { toast } = useToast();

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
        toast({ title: "Bundle added! 🚀", description: `Saturn V + SLS — $${BUNDLE_PRICE} total` });
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

  const faqs = [
    {
      q: "How long until my rocket arrives?",
      a: `Most orders ship within ${SHIPPING_DAYS} of being placed. Because we print on a distributed maker network, your rocket is made by a maker near you — not shipped from overseas — so you get it faster and for less.`,
    },
    {
      q: "How hard is the assembly?",
      a: "The kits are designed to press-fit together. Most parts snap into place; a small amount of super glue or plastic cement is recommended for a few joints to make the final build rock-solid. No painting or sanding required. Typical build time is 30-60 minutes.",
    },
    {
      q: "What if a part is missing or arrives damaged?",
      a: "Every kit is quality-checked by the maker before it ships. If anything is wrong when it arrives, email us and we'll send replacement parts free of charge. No returns to deal with.",
    },
    {
      q: "Who designs these rockets?",
      a: "The rocket designs are by AstroDesign 3D, one of the most accurate rocket modelers working in 3D printing today. EX3D Prints is the exclusive print-and-fulfillment partner — we license the designs and work with a network of independent makers to produce them on demand.",
    },
    {
      q: "Can I return it if I don't like it?",
      a: "Because each kit is printed to order, we don't accept returns for change of mind. But if there's anything wrong with what you received — wrong part, damaged in shipping, print defect — we'll make it right.", // TODO: Confirm your actual return policy
    },
  ];

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
          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-xl mx-auto leading-relaxed">
            Precision-printed Saturn V and SLS model kits. Designed by aerospace nerds, printed by makers near you.
          </p>
          {/* Trust signal right in the hero */}
          <p className="text-sm text-orange-400 font-semibold mb-8 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          {/* Both rockets side by side — centered */}
          <div className="flex justify-center items-end gap-4 sm:gap-6 mb-10 w-full">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 w-[140px] sm:w-[200px] h-[200px] sm:h-[280px] flex items-center justify-center bg-gray-900">
                <img src={SATURN_V_IMAGE} alt="Saturn V model kit" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Saturn V · 56cm</p>
            </div>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/20 w-[140px] sm:w-[200px] h-[200px] sm:h-[280px] flex items-center justify-center bg-gray-900">
                <img src={SLS_IMAGE} alt="SLS model kit" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-gray-400 mt-2">SLS · 50cm</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-8 italic">Designs by AstroDesign 3D · Printed & shipped by EX3D's maker network</p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-10 py-4 shadow-orange-900/40">
              Get the Bundle — $60
            </Btn>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            <span className="line-through">${SEPARATE_TOTAL}</span> <span className="text-orange-400 font-semibold">${BUNDLE_PRICE}</span> · Save ${BUNDLE_SAVINGS} with the bundle
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 bg-[#0f0f1a] border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">How It Works</p>
          <h2 className="text-3xl font-bold text-center mb-4">Printed locally. Shipped fast.</h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-14 leading-relaxed">
            Instead of mass-producing in a warehouse and shipping overseas, we route your order to an independent 3D printing maker near you. Faster shipping, lower cost, and you're supporting real makers.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "1", title: "You order", desc: "Pick the Saturn V, SLS, or both as a bundle." },
              { n: "2", title: "A local maker prints it", desc: `Your order is routed to one of ${MAKER_COUNT} vetted makers near you who prints it on demand.` },
              { n: "3", title: "Ships in days, not weeks", desc: `Quality-checked, packed, and shipped in ${SHIPPING_DAYS}.` },
            ].map((step) => (
              <div key={step.n} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-lg">
                  {step.n}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
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
              <p className="text-orange-400 font-bold text-lg mb-3">${SATURN_V_PRICE}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 56cm precision-printed model kit of the rocket that took humanity to the Moon. 1:200 scale.</p>
              <Btn type="saturn" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* SLS card */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-gray-800">
                <img src={SLS_IMAGE} alt="SLS" className="w-full h-40 object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-lg mb-3">${SLS_PRICE}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 50cm precision-printed model kit inspired by the rocket taking humanity back to the Moon. 1:200 scale.</p>
              <Btn type="sls" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
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
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-gray-500 line-through text-sm">${SEPARATE_TOTAL}</p>
                <p className="text-orange-400 font-bold text-lg">${BUNDLE_PRICE}</p>
              </div>
              <p className="text-gray-400 text-xs mb-3">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">Both Saturn V and SLS together — the full Moon-rocket lineup from Apollo to Artemis.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get the Bundle
              </Btn>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-8 italic">Designs by AstroDesign 3D · Printed & shipped by EX3D's maker network</p>
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
                {[
                  ["Height", "56cm (22 inches)"],
                  ["Scale", "1:200"],
                  ["Material", "PLA (eco-friendly bioplastic)"],
                  ["Assembly", "Press-fit kit · light glue recommended for a few joints"],
                  ["Build time", "~30-60 minutes"],
                  ["Tools needed", "None (optional: super glue or plastic cement)"],
                ].map(([k, v]) => (
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
                {[
                  ["Height", "50cm"],
                  ["Scale", "1:200"],
                  ["Material", "PLA (eco-friendly bioplastic)"],
                  ["Assembly", "Press-fit kit · light glue recommended for a few joints"],
                  ["Build time", "~30-60 minutes"],
                  ["Tools needed", "None (optional: super glue or plastic cement)"],
                ].map(([k, v]) => (
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

      {/* ── STORY / BUSINESS MODEL ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          <div className="w-44 h-44 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob, EX3D Prints" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">Why EX3D Prints Exists</p>
            <p className="text-gray-300 leading-relaxed text-base mb-4">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I wanted high-quality models of the greatest rockets ever made, and everything I could find was either a cheap plastic toy or a $300 collector's piece.
            </p>
            <p className="text-gray-300 leading-relaxed text-base mb-4">
              So I teamed up with <span className="text-white font-semibold">AstroDesign 3D</span> — the best rocket modeler I could find — and built a network of independent makers to print his designs on demand. You get museum-quality models, printed by real people, shipped fast, at a price that doesn't require a second mortgage.
            </p>
            <p className="text-gray-400 leading-relaxed text-sm italic">
              Every order supports a maker. Every rocket is quality-checked before it ships. That's the whole model.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* ── FAQ ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Before You Buy</p>
          <h2 className="text-3xl font-bold text-center mb-12">Questions, Answered</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-900/70 transition-colors"
                >
                  <span className="font-semibold text-white">{faq.q}</span>
                  <span className={`text-orange-400 text-2xl transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-300 leading-relaxed text-sm border-t border-gray-800 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-4 max-w-md mx-auto">
          Own both of the most iconic Moon rockets — printed locally, shipped fast, quality guaranteed.
        </p>
        <p className="text-xs text-gray-500 mb-10">
          Ships in {SHIPPING_DAYS} · Free replacement parts if anything's wrong
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-12 py-5 shadow-xl shadow-orange-900/50">
            Get the Bundle — ${BUNDLE_PRICE}
          </Btn>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <span className="line-through">${SEPARATE_TOTAL}</span> <span className="text-orange-400">${BUNDLE_PRICE}</span> · Save ${BUNDLE_SAVINGS}
        </p>
        <p className="text-gray-700 text-xs mt-12">© 2025 EX3D Prints · Jacob L. · Designs by AstroDesign 3D</p>
      </section>
    </div>
  );
}