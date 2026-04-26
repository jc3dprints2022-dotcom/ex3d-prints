import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ── PRODUCT IDs ───────────────────────────────────────────────────────────────
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// ── PRICING ───────────────────────────────────────────────────────────────────
const SATURN_V_PRICE  = 39;
const SLS_PRICE       = 30;
const BUNDLE_PRICE    = 60;
const BUNDLE_SLS_PRICE  = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL  = SATURN_V_PRICE + SLS_PRICE;
const BUNDLE_SAVINGS  = SEPARATE_TOTAL - BUNDLE_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";

// ── HERO IMAGES (uploaded photos — used only in the top two vertical slots) ──
const SATURN_V_HERO = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_HERO      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";

// Fallback hero images (used only in the top two hero slots if hero is empty)
const SATURN_V_HERO_FALLBACK = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_HERO_FALLBACK      = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

const SATURN_V_IMAGE = SATURN_V_HERO || SATURN_V_HERO_FALLBACK;
const SLS_IMAGE      = SLS_HERO      || SLS_HERO_FALLBACK;

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS = "2-4 days";
const MAKER_STATES  = 11;
const MAKER_COUNT   = 19;

export default function RocketCollection() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  // DB product images — used in product cards and bundle card only
  const [productCardImages, setProductCardImages] = useState({
    saturn: SATURN_V_HERO_FALLBACK,
    sls: SLS_HERO_FALLBACK,
  });
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Product.filter({ status: "active" })
      .then((products) => {
        const saturn = products.find((p) => p.id === SATURN_V_ID);
        const sls    = products.find((p) => p.id === SLS_ID);
        setProductCardImages({
          saturn: saturn?.images?.[0] || SATURN_V_HERO_FALLBACK,
          sls:    sls?.images?.[0]    || SLS_HERO_FALLBACK,
        });
      })
      .catch(console.error);
  }, []);

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      const upsertDB = async (productId, productName, price, imageUrl) => {
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: productId });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: price, total_price: price * existing[0].quantity, product_name: productName,
          });
        } else {
          await base44.entities.Cart.create({
            user_id: user.id, product_id: productId, product_name: productName,
            quantity: 1, selected_material: "PLA", selected_color: "Shown Colors",
            unit_price: price, total_price: price, images: [imageUrl],
          });
        }
      };

      const pushLocal = (productId, productName, price, imageUrl) => {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        const idx = cart.findIndex(i => i.product_id === productId);
        if (idx >= 0) {
          cart[idx].unit_price = price; cart[idx].total_price = price * cart[idx].quantity; cart[idx].product_name = productName;
        } else {
          cart.push({ id: `anon_${productId}_${Date.now()}`, product_id: productId, product_name: productName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: price, total_price: price, images: [imageUrl] });
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      };

      if (type === "saturn" || type === "bundle") {
        const name  = type === "bundle" ? "Saturn V (Bundle)" : "Saturn V";
        const price = SATURN_V_PRICE;
        const img   = productCardImages.saturn;
        if (user) await upsertDB(SATURN_V_ID, name, price, img);
        else pushLocal(SATURN_V_ID, name, price, img);
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        const img      = productCardImages.sls;
        if (user) await upsertDB(SLS_ID, slsName, slsPrice, img);
        else pushLocal(SLS_ID, slsName, slsPrice, img);
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Bundle added! 🚀", description: `Saturn V plus SLS for $${BUNDLE_PRICE}` });
      setTimeout(() => { window.location.href = "/Cart"; }, type === "bundle" ? 600 : 0);
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
    navigator.clipboard?.writeText(EMAIL_DISCOUNT_CODE).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2500); });
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

  const BundlePriceDisplay = ({ size = "base" }) => {
    const s = size === "large"
      ? { old: "text-xl sm:text-2xl", new: "text-4xl sm:text-5xl", save: "text-sm sm:text-base" }
      : { old: "text-lg sm:text-xl", new: "text-2xl sm:text-3xl", save: "text-xs sm:text-sm" };
    return (
      <div className="flex items-baseline justify-center gap-2 sm:gap-4 flex-wrap px-4">
        <span className={`${s.old} text-gray-500 line-through font-medium`}>${SEPARATE_TOTAL}</span>
        <span className={`${s.new} font-bold text-orange-400`}>${BUNDLE_PRICE}</span>
        <span className={`${s.save} text-orange-300 font-semibold`}>Save ${BUNDLE_SAVINGS} with the bundle</span>
      </div>
    );
  };

  const faqs = [
    { q: "How long until my rocket arrives?",       a: `Most orders ship within ${SHIPPING_DAYS}. Your rocket is printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states, so it ships domestically, not from overseas.` },
    { q: "How hard is the assembly?",               a: "The kits press-fit together. Most parts snap into place, and a small amount of super glue is recommended for a few joints. No painting required. Typical build time is 30 to 60 minutes." },
    { q: "What if a part is missing or arrives damaged?", a: "Every kit is quality-checked before it ships. If anything is wrong, email us and we will send replacement parts free of charge." },
    { q: "Who designs these rockets?",               a: "The designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D Prints licenses the designs and handles printing and fulfillment through our maker network." },
    { q: "Can I return it?",                         a: "Because each kit is printed to order we don't accept returns for change of mind. If anything is wrong with what you received we will make it right." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-3">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-3">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-sm text-orange-400 font-semibold mb-6 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          {/* Hero images — uploaded photos, object-cover fills frame */}
          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-6 w-full px-2">
            {[
              { src: SATURN_V_IMAGE, alt: "Saturn V printed model", label: "Saturn V · 56cm", shadow: "shadow-orange-900/20", hover: "hover:border-orange-500/40" },
              { src: SLS_IMAGE,      alt: "SLS printed model",      label: "SLS · 50cm",      shadow: "shadow-blue-900/20",   hover: "hover:border-blue-500/40"   },
            ].map(({ src, alt, label, shadow, hover }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
                <button
                  onClick={() => setLightboxImage(src)}
                  className={`rounded-2xl overflow-hidden border border-gray-700 shadow-2xl ${shadow} w-full aspect-[2/3] bg-black ${hover} transition-all`}
                >
                  <img src={src} alt={alt} className="w-full h-full object-contain" />
                </button>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600 mb-6 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>

          <div className="flex flex-col items-center gap-3">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5">
              Get the Bundle for ${BUNDLE_PRICE}
            </Btn>
            <BundlePriceDisplay size="base" />
          </div>
        </div>
      </section>

      {/* ── PRODUCT CARDS ── */}
      <section id="choose-setup" className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-3">Choose Your Setup</p>
          <h2 className="text-2xl font-bold text-center mb-8">Pick What's Right for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Saturn V — uses product DB image */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-52 flex items-center justify-center">
                <img src={productCardImages.saturn} alt="Saturn V" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">Saturn V</h3>
              <p className="text-orange-400 font-bold text-2xl mb-2">${SATURN_V_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>56cm tall · 1:200 scale · PLA</p>
                <p>Press-fit kit · 30–60 min build</p>
                <p>No painting needed</p>
                <p className="text-gray-300 mt-2">The rocket that took humanity to the Moon.</p>
              </div>
              <Btn type="saturn" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* SLS — uses product DB image */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-52 flex items-center justify-center">
                <img src={productCardImages.sls} alt="SLS" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-2xl mb-2">${SLS_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>50cm tall · 1:200 scale · PLA</p>
                <p>Press-fit kit · 30–60 min build</p>
                <p>No painting needed</p>
                <p className="text-gray-300 mt-2">The rocket taking humanity back to the Moon.</p>
              </div>
              <Btn type="sls" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* Bundle — uses product DB images */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 mb-4 h-52">
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={productCardImages.saturn} alt="Saturn V" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={productCardImages.sls} alt="SLS" className="w-full h-full object-contain" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">Bundle</h3>
              <div className="flex items-baseline gap-3 mb-1">
                <p className="text-gray-500 line-through">${SEPARATE_TOTAL}</p>
                <p className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-sm font-semibold mb-3">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-gray-400 text-sm flex-1">Both Moon rockets together. Apollo to Artemis.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get the Bundle
              </Btn>
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center mt-6 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>
        </div>
      </section>

      {/* ── EMAIL CAPTURE ── */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0f0f1a]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">For Space Nerds Only</p>
          <h2 className="text-2xl font-bold mb-3">Get 10% Off Your First Order</h2>
          <p className="text-gray-400 mb-6 leading-relaxed text-sm">
            Join the list and get early access to new rocket designs, exclusive drops, and a discount code right now.
          </p>
          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-sm transition-all hover:scale-105 disabled:opacity-70 whitespace-nowrap">
                {emailLoading ? "Saving..." : "Get My Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-green-400 font-semibold">You're in! Here's your discount code:</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-gray-900 border-2 border-orange-500/60 rounded-2xl px-8 py-4">
                  <p className="text-3xl font-bold tracking-widest text-orange-400 font-mono">{EMAIL_DISCOUNT_CODE}</p>
                </div>
                <button onClick={handleCopyCode}
                  className="px-6 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-semibold transition-all hover:scale-105">
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
              </div>
              <p className="text-gray-500 text-sm">Enter this code at checkout for 10% off.</p>
              <button onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline">
                Shop now and use your code
              </button>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8 items-center">
          <div className="w-36 h-36 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob, EX3D Prints" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-2">Why EX3D Prints Exists</p>
            <p className="text-gray-300 leading-relaxed text-sm mb-3">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I wanted high-quality models of the greatest rockets ever made, and everything I could find was either a cheap plastic toy or a $300 collector's piece.
            </p>
            <p className="text-gray-300 leading-relaxed text-sm mb-3">
              So I teamed up with <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span> and built a network of {MAKER_COUNT} independent makers across {MAKER_STATES} states to print his designs on demand. High-quality models, printed by real people, shipped fast.
            </p>
            <p className="text-gray-400 text-xs italic">Every order supports a maker. Every rocket is quality-checked before it ships.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-3">Before You Buy</p>
          <h2 className="text-2xl font-bold text-center mb-6">Questions, Answered</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-900/70 transition-colors"
                >
                  <span className="font-semibold text-white pr-4 text-sm">{faq.q}</span>
                  <span className={`text-orange-400 text-xl flex-shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-300 leading-relaxed text-sm border-t border-gray-800 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">Ready?</p>
        <h2 className="text-3xl font-bold mb-3">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-3 max-w-md mx-auto text-sm">
          Own both of the most iconic Moon rockets. Printed locally, shipped fast, quality guaranteed.
        </p>
        <p className="text-xs text-gray-500 mb-8">Ships in {SHIPPING_DAYS} · Free replacement parts if anything's wrong</p>
        <div className="flex flex-col items-center gap-5">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Bundle for ${BUNDLE_PRICE}
          </Btn>
          <BundlePriceDisplay size="large" />
        </div>
        <p className="text-gray-700 text-xs mt-12">© 2025 EX3D Prints · Jacob L. · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

            {/* ── LIGHTBOX ── */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightboxImage} alt="Enlarged view" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400">✕</button>
        </div>
      )}
    </div>
  );
}