import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const SATURN_V_ID = "693b06e655e441e07049d328";
const SATURN_V_PRICE = 39;
const SLS_ID = "69dbf08433850e148542d876";
const SLS_PRICE = 30;
const BUNDLE_PRICE = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL = SATURN_V_PRICE + SLS_PRICE;
const BUNDLE_SAVINGS = SEPARATE_TOTAL - BUNDLE_PRICE;

// ── IMAGES ────────────────────────────────────────────────────────────────────
const SATURN_V_HERO   = ""; // TODO: paste new photo URL
const SLS_HERO        = ""; // TODO: paste new photo URL
const SATURN_V_LEGACY = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_LEGACY      = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";
const SATURN_V_IMAGE  = SATURN_V_HERO || SATURN_V_LEGACY;
const SLS_IMAGE       = SLS_HERO      || SLS_LEGACY;
const FOUNDER_IMAGE   = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

export default function SaturnV() {
  const [adding, setAdding]     = useState(null);
  const [openFaq, setOpenFaq]   = useState(null);
  const { toast }               = useToast();

  // ── ADD TO CART ─────────────────────────────────────────────────────────────
  // CRITICAL FIX: removed login-wall redirect. Guest users proceed directly to
  // cart/checkout — losing them to a login screen kills cold-traffic conversion.
  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      if (type === "saturn" || type === "bundle") {
        const price = SATURN_V_PRICE;
        if (user) {
          const ex = await base44.entities.Cart.filter({ user_id: user.id, product_id: SATURN_V_ID });
          if (ex.length > 0) {
            await base44.entities.Cart.update(ex[0].id, { unit_price: price, total_price: price * ex[0].quantity });
          } else {
            await base44.entities.Cart.create({ user_id: user.id, product_id: SATURN_V_ID, product_name: "SATURN V", quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: price, total_price: price });
          }
        }
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        if (user) {
          const ex = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
          if (ex.length > 0) {
            await base44.entities.Cart.update(ex[0].id, { unit_price: slsPrice, total_price: slsPrice * ex[0].quantity, product_name: slsName });
          } else {
            await base44.entities.Cart.create({ user_id: user.id, product_id: SLS_ID, product_name: slsName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice });
          }
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Bundle added! 🚀", description: `Saturn V + SLS for $${BUNDLE_PRICE}` });
      setTimeout(() => { window.location.href = "/Cart"; }, type === "bundle" ? 500 : 0);
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  const Btn = ({ type, children, className = "" }) => (
    <button
      onClick={() => addToCart(type)}
      disabled={adding !== null}
      className={`font-bold rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-60 ${className}`}
    >
      {adding === type ? "Adding…" : children}
    </button>
  );

  const faqs = [
    { q: "How long until it arrives?", a: "Most orders ship within 2–4 days. Your rocket is printed by a maker near you, not shipped from overseas." },
    { q: "How hard is assembly?", a: "Parts press-fit together. A little super glue on a few joints makes it rock-solid. No painting. About 30–60 min build time." },
    { q: "What if something arrives damaged?", a: "Email us. We send replacement parts free. No return shipping needed." },
    { q: "Who designed these?", a: "kmobrain (AstroDesign 3D) — one of the most accurate rocket modelers in 3D printing. EX3D prints and fulfills his designs." },
  ];

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 text-center py-16 overflow-hidden">
        {/* starfield bg */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, #1a1033 0%, #080810 65%)" }} />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "55px 55px" }} />

        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <p className="text-[10px] tracking-[0.45em] text-orange-400/80 uppercase mb-4">EX3D Prints · Rocket Collection</p>

          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] mb-4 tracking-tight">
            The Moon Rockets,<br />
            <span style={{ background: "linear-gradient(90deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              On Your Desk
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 mb-2 max-w-xl mx-auto leading-relaxed">
            Precision 3D-printed Saturn V &amp; SLS model kits. Printed by a local maker, shipped in days, not weeks.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-10">
            <span className="text-orange-400">✦</span>
            <span>Ships in 2–4 days</span>
            <span className="text-orange-400">✦</span>
            <span>Printed locally</span>
            <span className="text-orange-400">✦</span>
            <span>Quality guaranteed</span>
          </div>

          {/* Rocket photos */}
          <div className="flex justify-center items-end gap-4 sm:gap-8 mb-8 w-full">
            {[
              { src: SATURN_V_IMAGE, label: "Saturn V · 56cm", accent: "#fb923c" },
              { src: SLS_IMAGE,      label: "SLS · 50cm",      accent: "#60a5fa" },
            ].map(({ src, label, accent }) => (
              <div key={label} className="flex flex-col items-center flex-1 max-w-[260px]">
                <div className="rounded-2xl overflow-hidden w-full aspect-[2/3] bg-black flex items-center justify-center"
                  style={{ border: `1px solid ${accent}30`, boxShadow: `0 20px 60px ${accent}18` }}>
                  <img src={src} alt={label} className="w-full h-full object-contain" />
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-600 mb-8 italic">Designs by kmobrain (AstroDesign 3D)</p>

          {/* Primary CTA */}
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-lg px-10 py-4 shadow-lg shadow-orange-900/40 mb-3">
            Get Both for $60 →
          </Btn>
          <p className="text-sm text-gray-500">
            <span className="line-through mr-2">${SEPARATE_TOTAL}</span>
            <span className="text-orange-400 font-semibold">Save ${BUNDLE_SAVINGS}</span>
          </p>
        </div>
      </section>

      {/* ── CHOOSE YOUR SETUP ── */}
      <section className="py-16 px-5 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-teal-400 uppercase text-center mb-3">Choose Your Setup</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Pick What's Right for You</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Saturn V */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 flex flex-col">
              <div className="h-48 rounded-xl bg-black flex items-center justify-center mb-4 overflow-hidden border border-gray-800">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="h-full object-contain" />
              </div>
              <h3 className="text-lg font-bold mb-1">Saturn V</h3>
              <p className="text-orange-400 font-bold text-xl mb-2">${SATURN_V_PRICE}</p>
              <p className="text-gray-400 text-sm flex-1 leading-relaxed">56cm precision-printed kit of the rocket that took humanity to the Moon. 1:200 scale.</p>
              <Btn type="saturn" className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* SLS */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 flex flex-col">
              <div className="h-48 rounded-xl bg-black flex items-center justify-center mb-4 overflow-hidden border border-gray-800">
                <img src={SLS_IMAGE} alt="SLS" className="h-full object-contain" />
              </div>
              <h3 className="text-lg font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-xl mb-2">${SLS_PRICE}</p>
              <p className="text-gray-400 text-sm flex-1 leading-relaxed">50cm precision-printed kit of the rocket taking humanity back to the Moon. 1:200 scale.</p>
              <Btn type="sls" className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* Bundle */}
            <div className="rounded-2xl p-5 flex flex-col relative" style={{ background: "linear-gradient(160deg, #2d1200 0%, #111 100%)", border: "1.5px solid rgba(251,146,60,0.5)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-widest uppercase">Best Value</div>
              <div className="flex gap-2 h-48 mb-4">
                {[SATURN_V_IMAGE, SLS_IMAGE].map((src, i) => (
                  <div key={i} className="flex-1 rounded-xl bg-black overflow-hidden flex items-center justify-center border border-gray-800">
                    <img src={src} alt="" className="h-full object-contain" />
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-bold mb-1">Bundle — Both Rockets</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-gray-500 line-through text-sm">${SEPARATE_TOTAL}</span>
                <span className="text-orange-400 font-black text-2xl">${BUNDLE_PRICE}</span>
              </div>
              <p className="text-orange-300 text-xs font-semibold mb-2">Save ${BUNDLE_SAVINGS} — Apollo to Artemis</p>
              <p className="text-gray-400 text-sm flex-1 leading-relaxed">Both Moon rockets together. The complete story from Apollo to Artemis on your shelf.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm shadow-lg shadow-orange-900/30">
                Get the Bundle
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="py-10 px-5 border-t border-white/5">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { stat: "2–4 days", label: "Ships in" },
            { stat: "19",       label: "Verified makers" },
            { stat: "11",       label: "States covered" },
            { stat: "Free",     label: "Replacement parts" },
          ].map(({ stat, label }) => (
            <div key={label} className="bg-white/3 border border-white/5 rounded-xl py-4">
              <p className="text-2xl font-black text-orange-400">{stat}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (condensed) ── */}
      <section className="py-16 px-5 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Printed locally. Shipped fast.</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { n: "01", title: "You order", desc: "Pick the Saturn V, SLS, or the bundle." },
              { n: "02", title: "Local maker prints it", desc: "Routed to the nearest of our 19 vetted makers. Printed on demand, not from a warehouse." },
              { n: "03", title: "Ships in days", desc: "Quality-checked, packed, at your door in 2–4 days." },
            ].map(s => (
              <div key={s.n} className="bg-white/3 border border-white/5 rounded-2xl p-5">
                <p className="text-3xl font-black text-orange-500/30 mb-2 leading-none">{s.n}</p>
                <h3 className="font-bold mb-1 text-sm">{s.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-16 px-5 border-t border-white/5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <img src={FOUNDER_IMAGE} alt="Jacob" className="w-24 h-24 rounded-full object-cover border-2 border-orange-500/30 flex-shrink-0 mx-auto sm:mx-0" />
          <div>
            <p className="text-[10px] tracking-widest text-orange-400 uppercase mb-2">Why this exists</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              I'm Jacob — aerospace engineering student, I help build real rocket engines. I couldn't find high-quality models that weren't $300 collector pieces, so I partnered with <strong className="text-white">kmobrain (AstroDesign 3D)</strong> and built a network of local makers to print his designs on demand. Quality models, printed by real people, at a real price.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-5 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center"
                >
                  <span className="font-semibold text-sm text-white">{faq.q}</span>
                  <span className={`text-orange-400 text-xl transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-5 text-center" style={{ background: "linear-gradient(to top, #1a0800, transparent)" }}>
        <h2 className="text-3xl sm:text-4xl font-black mb-3">Apollo to Artemis.<br/>On Your Shelf.</h2>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">Both Moon rockets, printed locally, shipped in 2–4 days, quality guaranteed.</p>
        <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-xl px-12 py-5 shadow-2xl shadow-orange-900/50 mb-3">
          Get Both for $60 →
        </Btn>
        <p className="text-sm text-gray-600">
          <span className="line-through mr-2">${SEPARATE_TOTAL}</span>
          <span className="text-orange-400">Save ${BUNDLE_SAVINGS}</span>
        </p>
        <p className="text-gray-800 text-xs mt-16">© 2025 EX3D Prints · Designs by kmobrain (AstroDesign 3D)</p>
      </section>
    </div>
  );
}