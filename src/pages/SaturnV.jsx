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
const SEPARATE_TOTAL = SATURN_V_PRICE + SLS_PRICE; // $69
const BUNDLE_SAVINGS = SEPARATE_TOTAL - BUNDLE_PRICE; // $9

const EMAIL_DISCOUNT_CODE = "WELCOME10";

const SATURN_V_HERO = "";
const SLS_HERO      = "";

const SATURN_V_GALLERY = [];
const SLS_GALLERY = [];

const CORE_STAGE_SCHEMATIC = "";
const SRB_SCHEMATIC        = "";

const SATURN_V_IMAGE = SATURN_V_HERO || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE      = SLS_HERO      || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS  = "2-4 days";
const MAKER_STATES   = 11;
const MAKER_COUNT    = 19;

export default function SaturnV() {
  const [adding, setAdding]           = useState(null);
  const [openFaq, setOpenFaq]         = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [email, setEmail]             = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
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
          await base44.entities.Cart.create({ user_id: user.id, product_id: SATURN_V_ID, product_name: "SATURN V", quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE, image_url: SATURN_V_IMAGE });
        }
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, { unit_price: slsPrice, total_price: slsPrice * existing[0].quantity, product_name: slsName });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SLS_ID, product_name: slsName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice, image_url: SLS_IMAGE });
        }
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
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      await base44.entities.User.create({ email: email.trim().toLowerCase() });
    } catch (err) {
      console.error("Failed to save email:", err);
    }
    setEmailSubmitted(true);
    setEmailLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(EMAIL_DISCOUNT_CODE).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    });
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

  const GalleryThumb = ({ src, alt }) => (
    <button
      onClick={() => setLightboxImage(src)}
      className="rounded-xl overflow-hidden border border-gray-800 w-28 h-28 sm:w-36 sm:h-36 bg-gray-900 flex items-center justify-center hover:border-orange-500/60 transition-all hover:scale-105"
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </button>
  );

  const faqs = [
    {
      q: "How long until my rocket arrives?",
      a: `Most orders ship within ${SHIPPING_DAYS}. Your rocket is printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states, so it ships domestically, not from overseas.`,
    },
    {
      q: "How hard is the assembly?",
      a: "The kits press-fit together. Most parts snap into place, and a small amount of super glue is recommended for a few joints. No painting required. Typical build time is 30 to 60 minutes.",
    },
    {
      q: "What if a part is missing or arrives damaged?",
      a: "Every kit is quality-checked before it ships. If anything is wrong, email us and we will send replacement parts free of charge.",
    },
    {
      q: "Who designs these rockets?",
      a: "The designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D Prints licenses the designs and handles printing and fulfillment through our maker network.",
    },
    {
      q: "Can I return it?",
      a: "Because each kit is printed to order we don't accept returns for change of mind. If anything is wrong with what you received we will make it right.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto pt-12 sm:pt-16">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-5">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            Precision-printed Saturn V and SLS model kits. Designed by aerospace nerds, printed by {MAKER_COUNT} makers across {MAKER_STATES} states.
          </p>
          <p className="text-sm text-orange-400 font-semibold mb-10 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-8 w-full px-2">
            {[
              { src: SATURN_V_IMAGE, alt: "Saturn V printed model", label: "Saturn V · 56cm", shadow: "shadow-orange-900/20", hover: "hover:border-orange-500/40" },
              { src: SLS_IMAGE,      alt: "SLS printed model",      label: "SLS · 50cm",      shadow: "shadow-blue-900/20",   hover: "hover:border-blue-500/40"   },
            ].map(({ src, alt, label, shadow, hover }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
                <button
                  onClick={() => setLightboxImage(src)}
                  className={`rounded-2xl overflow-hidden border border-gray-700 shadow-2xl ${shadow} w-full aspect-[2/3] flex items-center justify-center bg-black ${hover} transition-all`}
                >
                  <img src={src} alt={alt} className="w-full h-full object-contain" />
                </button>
                <p className="text-xs sm:text-sm text-gray-300 mt-3 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mb-10 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>

          <div className="flex flex-col items-center gap-6">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5">
              Get the Bundle for ${BUNDLE_PRICE}
            </Btn>
            <div className="pt-2 pb-4">
              <BundlePriceDisplay size="base" />
            </div>
          </div>
        </div>
      </section>

      {/* ── DETAIL GALLERY ── */}
      {(SATURN_V_GALLERY.filter(Boolean).length > 0 || SLS_GALLERY.filter(Boolean).length > 0) && (
        <section className="py-20 px-6 bg-[#0f0f1a] border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Every Detail</p>
            <h2 className="text-3xl font-bold text-center mb-12">Up Close</h2>
            {SATURN_V_GALLERY.filter(Boolean).length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold text-orange-400 mb-4 text-center">Saturn V</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {SATURN_V_GALLERY.filter(Boolean).map((src, i) => <GalleryThumb key={i} src={src} alt={`Saturn V detail ${i + 1}`} />)}
                </div>
              </div>
            )}
            {SLS_GALLERY.filter(Boolean).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-blue-400 mb-4 text-center">SLS</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {SLS_GALLERY.filter(Boolean).map((src, i) => <GalleryThumb key={i} src={src} alt={`SLS detail ${i + 1}`} />)}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 text-center mt-8">Click any image to enlarge</p>
          </div>
        </section>
      )}

      {/* ── PRODUCT CARDS ── */}
      <section id="choose-setup" className="py-20 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Choose Your Setup</p>
          <h2 className="text-3xl font-bold text-center mb-12">Pick What's Right for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Saturn V */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-56 flex items-center justify-center">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">Saturn V</h3>
              <p className="text-orange-400 font-bold text-2xl mb-3">${SATURN_V_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>56cm tall · 1:200 scale</p>
                <p>PLA · Press-fit kit</p>
                <p>30-60 min build · No painting needed</p>
                <p className="text-gray-300 mt-2">The rocket that took humanity to the Moon.</p>
              </div>
              <Btn type="saturn" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* SLS */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-56 flex items-center justify-center">
                <img src={SLS_IMAGE} alt="SLS" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-2xl mb-3">${SLS_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>50cm tall · 1:200 scale</p>
                <p>PLA · Press-fit kit</p>
                <p>30-60 min build · No painting needed</p>
                <p className="text-gray-300 mt-2">The rocket taking humanity back to the Moon.</p>
              </div>
              <Btn type="sls" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* Bundle */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 mb-4 h-56">
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={SLS_IMAGE} alt="SLS" className="w-full h-full object-contain" />
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
          <p className="text-xs text-gray-500 text-center mt-8 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>
        </div>
      </section>

      {/* ── SCHEMATICS ── */}
      {(CORE_STAGE_SCHEMATIC || SRB_SCHEMATIC) && (
        <section className="py-20 px-6 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Engineering</p>
            <h2 className="text-3xl font-bold text-center mb-4">Designed Part by Part</h2>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              Every section is modeled from reference data and labeled so you know exactly what you're building.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {CORE_STAGE_SCHEMATIC && (
                <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
                  <button onClick={() => setLightboxImage(CORE_STAGE_SCHEMATIC)} className="w-full hover:opacity-90 transition-opacity">
                    <img src={CORE_STAGE_SCHEMATIC} alt="SLS Core Stage schematic" className="w-full h-auto" />
                  </button>
                  <p className="text-gray-700 font-semibold mt-4">SLS Core Stage · Labeled diagram</p>
                </div>
              )}
              {SRB_SCHEMATIC && (
                <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
                  <button onClick={() => setLightboxImage(SRB_SCHEMATIC)} className="w-full hover:opacity-90 transition-opacity">
                    <img src={SRB_SCHEMATIC} alt="Solid Rocket Booster schematic" className="w-full h-auto" />
                  </button>
                  <p className="text-gray-700 font-semibold mt-4">Solid Rocket Booster · Labeled diagram</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── EMAIL CAPTURE ── */}
      <section className="py-20 px-6 border-t border-gray-800 bg-[#0f0f1a]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">For Space Nerds Only</p>
          <h2 className="text-3xl font-bold mb-4">Get 10% Off Your First Order</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Join the list and get early access to new rocket designs, exclusive drops, and a discount code right now.
          </p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-sm transition-all hover:scale-105 disabled:opacity-70 whitespace-nowrap"
              >
                {emailLoading ? "Saving..." : "Get My Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <p className="text-green-400 font-semibold">You're in! Here's your discount code:</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-gray-900 border-2 border-orange-500/60 rounded-2xl px-8 py-4">
                  <p className="text-3xl font-bold tracking-widest text-orange-400 font-mono">{EMAIL_DISCOUNT_CODE}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-6 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-semibold transition-all hover:scale-105"
                >
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
              </div>
              <p className="text-gray-500 text-sm">
                Enter this code at checkout for 10% off. Apply it to the Saturn V, SLS, or the bundle.
              </p>
              <button
                onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline"
              >
                Shop now and use your code
              </button>
            </div>
          )}

          <p className="text-xs text-gray-600 mt-6">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-20 px-6 border-t border-gray-800">
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
              So I teamed up with <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span> and built a network of {MAKER_COUNT} independent makers across {MAKER_STATES} states to print his designs on demand. High-quality models, printed by real people, shipped fast.
            </p>
            <p className="text-gray-400 text-sm italic">Every order supports a maker. Every rocket is quality-checked before it ships.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 border-t border-gray-800">
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
                  <span className="font-semibold text-white pr-4">{faq.q}</span>
                  <span className={`text-orange-400 text-2xl flex-shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
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

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-4 max-w-md mx-auto">
          Own both of the most iconic Moon rockets. Printed locally, shipped fast, quality guaranteed.
        </p>
        <p className="text-xs text-gray-500 mb-10">Ships in {SHIPPING_DAYS} · Free replacement parts if anything's wrong</p>
        <div className="flex flex-col items-center gap-8">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Bundle for ${BUNDLE_PRICE}
          </Btn>
          <BundlePriceDisplay size="large" />
        </div>
        <p className="text-gray-700 text-xs mt-16">© 2025 EX3D Prints · Jacob L. · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

      {/* ── LIGHTBOX ── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img src={lightboxImage} alt="Enlarged view" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400">✕</button>
        </div>
      )}
    </div>
  );
}