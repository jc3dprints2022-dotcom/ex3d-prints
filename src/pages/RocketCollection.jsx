import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ── PRODUCT IDs ───────────────────────────────────────────────────────────────
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// ── PRICING ───────────────────────────────────────────────────────────────────
const SATURN_V_PRICE   = 39;
const SLS_PRICE        = 30;
const BUNDLE_PRICE     = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL   = SATURN_V_PRICE + SLS_PRICE;
const BUNDLE_SAVINGS   = SEPARATE_TOTAL - BUNDLE_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";

// ── IMAGES ────────────────────────────────────────────────────────────────────
// Vertical photos — used in bundle card only
const SATURN_V_HERO = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_HERO      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";

// Product images — used in hero section and individual cards
const SATURN_V_IMAGE = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE      = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS = "2-4 days";
const MAKER_STATES  = 11;
const MAKER_COUNT   = 19;

export default function SaturnV() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const { toast } = useToast();

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      const itemsToAdd = [];
      if (type === "saturn" || type === "bundle") {
        itemsToAdd.push({
          product_id: SATURN_V_ID,
          product_name: type === "bundle" ? "Saturn V (Moon Mission Bundle)" : "Saturn V",
          price: SATURN_V_PRICE,
          image: SATURN_V_IMAGE,
        });
      }
      if (type === "sls" || type === "bundle") {
        itemsToAdd.push({
          product_id: SLS_ID,
          product_name: type === "bundle" ? "SLS — Artemis (Moon Mission Bundle)" : "SLS (Artemis)",
          price: type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE,
          image: SLS_IMAGE,
        });
      }

      if (user) {
        for (const item of itemsToAdd) {
          const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: item.product_id });
          if (existing.length > 0) {
            await base44.entities.Cart.update(existing[0].id, {
              unit_price: item.price,
              total_price: item.price * existing[0].quantity,
              product_name: item.product_name,
            });
          } else {
            await base44.entities.Cart.create({
              user_id: user.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: 1,
              selected_material: "PLA",
              selected_color: "Shown Colors",
              unit_price: item.price,
              total_price: item.price,
              images: [item.image],
            });
          }
        }
      } else {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        for (const item of itemsToAdd) {
          const idx = cart.findIndex(i => i.product_id === item.product_id);
          if (idx >= 0) {
            cart[idx].unit_price   = item.price;
            cart[idx].total_price  = item.price * cart[idx].quantity;
            cart[idx].product_name = item.product_name;
          } else {
            cart.push({
              id: `anon_${item.product_id}_${Date.now()}`,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: 1,
              selected_material: "PLA",
              selected_color: "Shown Colors",
              unit_price: item.price,
              total_price: item.price,
              images: [item.image],
            });
          }
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Bundle added! 🚀", description: `Saturn V + SLS for $${BUNDLE_PRICE}` });
      setTimeout(() => { window.location.href = "/Cart"; }, type === "bundle" ? 500 : 0);
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast({ title: "Please enter a valid email", variant: "destructive" }); return; }
    setEmailLoading(true);
    try { await base44.entities.User.create({ email: email.trim().toLowerCase() }); } catch {}
    setEmailSubmitted(true);
    setEmailLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(EMAIL_DISCOUNT_CODE).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    });
  };

  const BundleBtn = ({ size = "base" }) => (
    <button
      onClick={() => addToCart("bundle")}
      disabled={adding !== null}
      className={`font-black rounded-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-yellow-400 text-white transition-all duration-200 hover:scale-105 disabled:opacity-60 shadow-xl shadow-orange-900/40 ${size === "lg" ? "text-xl px-14 py-5" : "text-base px-8 py-4"}`}
    >
      {adding === "bundle" ? "Adding…" : `Get the Bundle — $${BUNDLE_PRICE}`}
    </button>
  );

  const SingleBtn = ({ type, children }) => (
    <button
      onClick={() => addToCart(type)}
      disabled={adding !== null}
      className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all disabled:opacity-50"
    >
      {adding === type ? "Adding…" : children}
    </button>
  );

  const faqs = [
    { q: "How long until my rocket arrives?",       a: `Most orders ship within ${SHIPPING_DAYS}. Printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states — not shipped from overseas.` },
    { q: "How hard is the assembly?",               a: "Press-fit kits. Most parts snap into place. A small amount of super glue on a few joints makes it rock-solid. No painting needed. About 30–60 min." },
    { q: "What if a part arrives damaged?",         a: "Every kit is quality-checked before it ships. If anything is wrong, email us and we'll send replacement parts free. No return shipping needed." },
    { q: "Who designed these rockets?",             a: "kmobrain (AstroDesign 3D) — one of the most accurate rocket modelers in 3D printing. EX3D licenses his designs and handles fulfillment through our maker network." },
    { q: "What's your return policy?",              a: "Printed to order, so no change-of-mind returns. If anything is wrong with what you received, we make it right — no questions." },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center px-5 text-center overflow-hidden pt-6 pb-6">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, #1e1035 0%, #080810 65%)" }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "55px 55px" }} />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-[10px] tracking-[0.45em] text-orange-400/70 uppercase mb-3">EX3D Prints · Moon Mission Collection</p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] mb-3 tracking-tight">
            Own Both Moon Rockets.<br />
            <span style={{ background: "linear-gradient(90deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Apollo to Artemis.
            </span>
          </h1>

          <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs text-gray-500 mb-5 flex-wrap">
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Ships in {SHIPPING_DAYS}</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Printed locally in the US</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Free replacement parts</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> {MAKER_COUNT} vetted makers</span>
          </div>

          <p className="text-[10px] tracking-[0.3em] text-orange-400 uppercase mb-2">Best Value · The Moon Mission Bundle</p>

          {/* Hero images — product images, object-contain */}
          <div className="flex justify-center items-end gap-4 sm:gap-8 md:gap-12 mb-4 w-full">
            {[
              { src: SATURN_V_IMAGE, alt: "Saturn V",   label: "Saturn V · 56cm", shadow: "#fb923c18", border: "rgba(251,146,60,0.3)" },
              { src: SLS_IMAGE,      alt: "SLS Artemis", label: "SLS · 50cm",      shadow: "#60a5fa18", border: "rgba(96,165,250,0.3)"  },
            ].map(({ src, alt, label, shadow, border }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[200px] sm:max-w-[260px] md:max-w-[320px]">
                <button
                  onClick={() => setLightboxImage(src)}
                  className="rounded-2xl overflow-hidden w-full h-[180px] sm:h-[280px] md:h-[360px] transition-transform hover:scale-[1.02] bg-black"
                  style={{ border: `1px solid ${border}`, boxShadow: `0 24px 60px ${shadow}` }}
                >
                  <img src={src} alt={alt} className="w-full h-full object-contain" />
                </button>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 mb-2">
            <BundleBtn size="lg" />
            <p className="text-sm">
              <span className="text-gray-500 line-through mr-2">${SEPARATE_TOTAL}</span>
              <span className="text-orange-400 font-bold">Save ${BUNDLE_SAVINGS}</span>
            </p>
            <p className="text-gray-600 text-xs mt-0.5">↓ or buy each separately below</p>
          </div>

          <p className="text-[10px] text-gray-700 italic">Designs by kmobrain (AstroDesign 3D)</p>
        </div>
      </section>

      {/* ── INDIVIDUAL PRODUCT CARDS ── */}
      <section id="choose-setup" className="py-8 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-1">Buy Each Separately</h2>
          <p className="text-gray-600 text-xs text-center mb-6">Or save ${BUNDLE_SAVINGS} with the bundle above</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Saturn V */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-3 bg-black h-44 flex items-center justify-center flex-shrink-0">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-sm mb-0.5">Saturn V</h3>
              <p className="text-orange-400 font-black text-lg mb-1">${SATURN_V_PRICE}</p>
              <p className="text-xs text-gray-600 mb-1">56cm · 1:200 · PLA · Press-fit</p>
              <p className="text-xs text-gray-500 flex-1 mb-3">The rocket that took humanity to the Moon.</p>
              <SingleBtn type="saturn">Add to Cart</SingleBtn>
            </div>

            {/* SLS */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-3 bg-black h-44 flex items-center justify-center flex-shrink-0">
                <img src={SLS_IMAGE} alt="SLS Artemis" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-sm mb-0.5">SLS (Artemis)</h3>
              <p className="text-blue-400 font-black text-lg mb-1">${SLS_PRICE}</p>
              <p className="text-xs text-gray-600 mb-1">50cm · 1:200 · PLA · Press-fit</p>
              <p className="text-xs text-gray-500 flex-1 mb-3">NASA's next Moon rocket, the Artemis program.</p>
              <SingleBtn type="sls">Add to Cart</SingleBtn>
            </div>

            {/* Bundle card — vertical hero images, object-cover */}
            <div className="bg-white/[0.03] border-2 rounded-2xl p-4 flex flex-col relative" style={{ borderColor: "rgba(251,146,60,0.4)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-wide">BEST VALUE</div>
              <div className="flex gap-2 mb-3 h-44">
                <div className="flex-1 rounded-xl overflow-hidden bg-black">
                  <img src={SATURN_V_HERO} alt="Saturn V" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black">
                  <img src={SLS_HERO} alt="SLS" className="w-full h-full object-cover" />
                </div>
              </div>
              <h3 className="font-bold text-sm mb-0.5">Moon Mission Bundle</h3>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-gray-600 line-through text-sm">${SEPARATE_TOTAL}</span>
                <span className="text-orange-400 font-black text-lg">${BUNDLE_PRICE}</span>
              </div>
              <p className="text-orange-300 text-xs font-semibold mb-1">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-xs text-gray-500 flex-1 mb-3">Both Moon rockets. Apollo to Artemis.</p>
              <button
                onClick={() => addToCart("bundle")}
                disabled={adding !== null}
                className="w-full py-2.5 rounded-full font-black text-sm text-white transition-all disabled:opacity-50 hover:scale-105"
                style={{ background: "linear-gradient(90deg, #f97316, #fbbf24)" }}
              >
                {adding === "bundle" ? "Adding…" : `Get Both — $${BUNDLE_PRICE}`}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ── */}
      <section className="py-8 px-5 bg-white/[0.02]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-[10px] tracking-[0.4em] text-orange-400 uppercase mb-3">Space Nerds Only</p>
          <h2 className="text-2xl font-black mb-2">Get 10% Off Your First Order</h2>
          <p className="text-gray-500 text-sm mb-5">Join the list. Get a discount code instantly.</p>
          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-black border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm hover:scale-105 transition-all disabled:opacity-60 whitespace-nowrap">
                {emailLoading ? "Saving…" : "Get My Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-green-400 font-semibold text-sm">You're in! Here's your code:</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-black border border-orange-500/40 rounded-xl px-8 py-4">
                  <p className="text-3xl font-black tracking-widest text-orange-400 font-mono">{EMAIL_DISCOUNT_CODE}</p>
                </div>
                <button onClick={handleCopyCode}
                  className="px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all">
                  {codeCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-gray-600 text-xs">10% off any rocket or bundle. Enter at checkout.</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-orange-400 hover:text-orange-300 text-sm font-semibold underline">
                Shop now ↑
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-8 px-5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <img src={FOUNDER_IMAGE} alt="Jacob" className="w-24 h-24 rounded-full object-cover flex-shrink-0 mx-auto sm:mx-0" style={{ border: "2px solid rgba(251,146,60,0.3)" }} />
          <div>
            <p className="text-[10px] tracking-widest text-orange-400 uppercase mb-2">Why this exists</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              I'm Jacob — aerospace engineering student, I help build real rocket engines. I couldn't find a high-quality model of a Saturn V that wasn't either a cheap toy or a $300 collector piece, so I partnered with <strong className="text-white">kmobrain (AstroDesign 3D)</strong> and built a network of {MAKER_COUNT} local makers to print his designs on demand. Quality models, made by real people, at a real price.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-8 px-5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-6">Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center">
                  <span className="font-semibold text-sm text-white pr-4">{faq.q}</span>
                  <span className={`text-orange-400 text-xl flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-10 px-5 text-center" style={{ background: "linear-gradient(to top, #1a0800, transparent)" }}>
        <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
          Two Rockets.<br />
          <span style={{ background: "linear-gradient(90deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            One Bundle. ${BUNDLE_PRICE}.
          </span>
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          Saturn V and SLS. Printed by a maker near you, shipped in {SHIPPING_DAYS}.
        </p>
        <div className="flex flex-col items-center gap-2">
          <BundleBtn size="lg" />
          <p className="text-sm text-gray-600">
            <span className="line-through mr-2">${SEPARATE_TOTAL}</span>
            <span className="text-orange-400 font-bold">Save ${BUNDLE_SAVINGS}</span>
          </p>
        </div>
        <p className="text-gray-800 text-xs mt-10">© 2025 EX3D Prints · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

      {/* ── LIGHTBOX ── */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400">✕</button>
        </div>
      )}
    </div>
  );
}