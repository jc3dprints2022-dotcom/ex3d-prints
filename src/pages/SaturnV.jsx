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

// ============================================
// IMAGES, UPLOAD TO BASE44 AND PASTE URLS HERE
// ============================================
// Workflow: upload each photo to base44 file storage, then copy the URL
// and paste it into the matching constant below.

// HERO IMAGES (full assembled rocket shots, portrait orientation)
// Recommended: Image 15 (Saturn V full) and Image 4 or 5 (SLS full)
const SATURN_V_HERO = ""; // TODO: paste URL for Image 15 (full Saturn V with SATURN V label stand)
const SLS_HERO = ""; // TODO: paste URL for Image 4 or 5 (full SLS with SLS BLOCK 1 label stand)

// SATURN V DETAIL GALLERY (close-ups)
const SATURN_V_GALLERY = [
  // TODO: paste URLs. Recommended images in order:
  // "", // Image 10 (F-1 engines close-up)
  // "", // Image 14 (USA branding and base)
  // "", // Image 13 (upper stages close-up)
  // "", // Image 11 (launch escape tower close-up)
];

// SLS DETAIL GALLERY (close-ups)
const SLS_GALLERY = [
  // TODO: paste URLs. Recommended images in order:
  // "", // Image 2 (RS-25 engines and boosters close-up)
  // "", // Image 1 (SLS BLOCK 1 label and base)
  // "", // Image 3 (Orion capsule nose cone)
];

// SCHEMATICS (engineering drawings with labeled parts)
const CORE_STAGE_SCHEMATIC = ""; // TODO: paste URL for schematics_cs.webp
const SRB_SCHEMATIC = ""; // TODO: paste URL for schematics_srb.webp

// LEGACY FALLBACK IMAGES (used if HERO URLs are empty)
// These are the old AstroDesign-branded images. Safe to delete these constants
// and their fallback references once you've uploaded the new photos.
const SATURN_V_LEGACY = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_LEGACY = "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

// Resolved images (uses new photo if provided, falls back to legacy)
const SATURN_V_IMAGE = SATURN_V_HERO || SATURN_V_LEGACY;
const SLS_IMAGE = SLS_HERO || SLS_LEGACY;

// FOUNDER PHOTO
// TODO: upload the workshop/rockets photo (IMG_20251026_103852) and paste URL
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

// STATS
const SHIPPING_DAYS = "2-4 days";
const MAKER_STATES = 11;
const MAKER_COUNT = 19;

export default function SaturnV() {
  const [adding, setAdding] = useState(null); // 'saturn' | 'sls' | 'bundle'
  const [openFaq, setOpenFaq] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
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
        const slsName = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: SLS_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, { unit_price: slsPrice, total_price: slsPrice * existing[0].quantity, product_name: slsName });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: SLS_ID, product_name: slsName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice });
        }
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") {
        toast({ title: "Bundle added! 🚀", description: `Saturn V plus SLS for $${BUNDLE_PRICE} total` });
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

  const BundlePriceDisplay = ({ size = "base" }) => {
    const sizes = {
      base: { old: "text-lg sm:text-xl", new: "text-2xl sm:text-3xl", save: "text-xs sm:text-sm" },
      large: { old: "text-xl sm:text-2xl", new: "text-4xl sm:text-5xl", save: "text-sm sm:text-base" },
    };
    const s = sizes[size];
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
      a: `Most orders ship within ${SHIPPING_DAYS} of being placed. Because we print on a distributed maker network, your rocket is made by a maker near you, not shipped from overseas, so you get it faster and for less.`,
    },
    {
      q: "How hard is the assembly?",
      a: "The kits are designed to press-fit together. Most parts snap into place, and a small amount of super glue or plastic cement is recommended for a few joints to make the final build rock-solid. No painting or sanding required. Typical build time is 30 to 60 minutes.",
    },
    {
      q: "What if a part is missing or arrives damaged?",
      a: "Every kit is quality-checked by the maker before it ships. If anything is wrong when it arrives, email us and we will send replacement parts free of charge. No returns to deal with.",
    },
    {
      q: "Who designs these rockets?",
      a: "The rocket designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers working in 3D printing today. EX3D Prints is the exclusive print-and-fulfillment partner. We license the designs and work with a network of independent makers to produce them on demand.",
    },
    {
      q: "Can I return it if I don't like it?",
      a: "Because each kit is printed to order, we don't accept returns for change of mind. But if there's anything wrong with what you received, wrong part, damaged in shipping, print defect, we will make it right.", // TODO: Confirm your actual return policy
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto pt-12 sm:pt-16">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-5">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5 text-white">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            Precision-printed Saturn V and SLS model kits. Designed by aerospace nerds, printed by makers near you.
          </p>
          <p className="text-sm text-orange-400 font-semibold mb-10 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          {/* Hero rocket photos, responsive, fills available width on mobile */}
          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-8 w-full px-2">
            <div className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
              <button
                onClick={() => setLightboxImage(SATURN_V_IMAGE)}
                className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-orange-900/20 w-full aspect-[2/3] flex items-center justify-center bg-black hover:border-orange-500/40 transition-all"
              >
                <img src={SATURN_V_IMAGE} alt="Saturn V printed model" className="w-full h-full object-contain" />
              </button>
              <p className="text-xs sm:text-sm text-gray-300 mt-3 font-medium">Saturn V · 56cm</p>
            </div>
            <div className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
              <button
                onClick={() => setLightboxImage(SLS_IMAGE)}
                className="rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-blue-900/20 w-full aspect-[2/3] flex items-center justify-center bg-black hover:border-blue-500/40 transition-all"
              >
                <img src={SLS_IMAGE} alt="SLS printed model" className="w-full h-full object-contain" />
              </button>
              <p className="text-xs sm:text-sm text-gray-300 mt-3 font-medium">SLS · 50cm</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-10 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>

          <div className="flex flex-col items-center gap-6">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5 shadow-orange-900/40">
              Get the Bundle for $60
            </Btn>
            <div className="pt-2 pb-4">
              <BundlePriceDisplay size="base" />
            </div>
          </div>
        </div>
      </section>

      {/* DETAIL GALLERY (only renders if gallery URLs are provided) */}
      {(SATURN_V_GALLERY.filter(Boolean).length > 0 || SLS_GALLERY.filter(Boolean).length > 0) && (
        <section className="py-20 px-6 bg-[#0f0f1a] border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Every Detail</p>
            <h2 className="text-3xl font-bold text-center mb-12">Up Close</h2>

            {SATURN_V_GALLERY.filter(Boolean).length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold text-orange-400 mb-4 text-center">Saturn V</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {SATURN_V_GALLERY.filter(Boolean).map((src, i) => (
                    <GalleryThumb key={`sat-${i}`} src={src} alt={`Saturn V detail ${i + 1}`} />
                  ))}
                </div>
              </div>
            )}

            {SLS_GALLERY.filter(Boolean).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-blue-400 mb-4 text-center">SLS</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  {SLS_GALLERY.filter(Boolean).map((src, i) => (
                    <GalleryThumb key={`sls-${i}`} src={src} alt={`SLS detail ${i + 1}`} />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center mt-8">Click any image to enlarge</p>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 bg-[#0f0f1a] border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">How It Works</p>
          <h2 className="text-3xl font-bold text-center mb-4">Printed locally. Shipped fast.</h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-6 leading-relaxed">
            Instead of mass-producing in a warehouse and shipping overseas, we route your order to an independent 3D printing maker near you. Faster shipping, lower cost, and you're supporting real makers.
          </p>
          <p className="text-center text-orange-400 font-semibold text-sm mb-14 tracking-wide">
            {MAKER_COUNT} makers across {MAKER_STATES} states, and growing
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "1", title: "You order", desc: "Pick the Saturn V, SLS, or both as a bundle." },
              { n: "2", title: "A local maker prints it", desc: `Your order is routed to one of our ${MAKER_COUNT} vetted makers across ${MAKER_STATES} states. Whoever's closest prints it on demand.` },
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

      {/* CHOOSE YOUR SETUP */}
      <section id="choose-setup" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Choose Your Setup</p>
          <h2 className="text-3xl font-bold text-center mb-12">Pick What's Right for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-56 flex items-center justify-center">
                <img src={SATURN_V_IMAGE} alt="Saturn V" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">Saturn V</h3>
              <p className="text-orange-400 font-bold text-lg mb-3">${SATURN_V_PRICE}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 56cm precision-printed model kit of the rocket that took humanity to the Moon. 1:200 scale.</p>
              <Btn type="saturn" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="rounded-xl overflow-hidden mb-4 bg-black h-56 flex items-center justify-center">
                <img src={SLS_IMAGE} alt="SLS" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold mb-1">SLS</h3>
              <p className="text-blue-400 font-bold text-lg mb-3">${SLS_PRICE}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">A 50cm precision-printed model kit inspired by the rocket taking humanity back to the Moon. 1:200 scale.</p>
              <Btn type="sls" className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

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
                <p className="text-gray-500 line-through text-base">${SEPARATE_TOTAL}</p>
                <p className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-sm font-semibold mb-3">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">Both Saturn V and SLS together. The full Moon-rocket lineup from Apollo to Artemis.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get the Bundle
              </Btn>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-8 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* SCHEMATICS (only renders if schematic URLs are provided) */}
      {(CORE_STAGE_SCHEMATIC || SRB_SCHEMATIC) && (
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Engineering</p>
            <h2 className="text-3xl font-bold text-center mb-4">Designed Part by Part</h2>
            <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              These aren't approximations. Every section of every rocket is modeled from reference data, printed to spec, and labeled so you know exactly what you're building.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {CORE_STAGE_SCHEMATIC && (
                <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
                  <button
                    onClick={() => setLightboxImage(CORE_STAGE_SCHEMATIC)}
                    className="w-full hover:opacity-90 transition-opacity"
                  >
                    <img src={CORE_STAGE_SCHEMATIC} alt="SLS Core Stage schematic" className="w-full h-auto" />
                  </button>
                  <p className="text-gray-700 font-semibold mt-4">SLS Core Stage</p>
                  <p className="text-gray-500 text-sm">Labeled construction diagram</p>
                </div>
              )}
              {SRB_SCHEMATIC && (
                <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
                  <button
                    onClick={() => setLightboxImage(SRB_SCHEMATIC)}
                    className="w-full hover:opacity-90 transition-opacity"
                  >
                    <img src={SRB_SCHEMATIC} alt="SLS Solid Rocket Booster schematic" className="w-full h-auto" />
                  </button>
                  <p className="text-gray-700 font-semibold mt-4">Solid Rocket Booster</p>
                  <p className="text-gray-500 text-sm">Labeled construction diagram</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* SPECS */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Specifications</p>
          <h2 className="text-3xl font-bold text-center mb-12">Built to Spec</h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-orange-400 uppercase tracking-widest mb-2 font-semibold">Saturn V Height</p>
              <p className="text-white font-bold text-2xl">56cm</p>
              <p className="text-gray-500 text-sm mt-1">22 inches</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-blue-400 uppercase tracking-widest mb-2 font-semibold">SLS Height</p>
              <p className="text-white font-bold text-2xl">50cm</p>
              <p className="text-gray-500 text-sm mt-1">19.7 inches</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-4">Both Models</p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                ["Scale", "1:200"],
                ["Material", "PLA (eco-friendly bioplastic)"],
                ["Assembly", "Press-fit kit, light glue recommended for a few joints"],
                ["Build time", "About 30 to 60 minutes"],
                ["Tools needed", "None (optional: super glue or plastic cement)"],
                ["Finish", "Painted sections as shown, no painting required"],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* STORY */}
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
              So I teamed up with <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span>, one of the best rocket modelers working in 3D printing today, and built a network of {MAKER_COUNT} independent makers across {MAKER_STATES} states to print his designs on demand. You get high-quality models, printed by real people, shipped fast, at a price that doesn't require a second mortgage.
            </p>
            <p className="text-gray-400 leading-relaxed text-sm italic">
              Every order supports a maker. Every rocket is quality-checked before it ships.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-800 max-w-4xl mx-auto" />

      {/* FAQ */}
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

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-4 max-w-md mx-auto">
          Own both of the most iconic Moon rockets. Printed locally, shipped fast, quality guaranteed.
        </p>
        <p className="text-xs text-gray-500 mb-10">
          Ships in {SHIPPING_DAYS} · Free replacement parts if anything's wrong
        </p>
        <div className="flex flex-col items-center gap-8 mb-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Bundle for ${BUNDLE_PRICE}
          </Btn>
          <div className="pt-2">
            <BundlePriceDisplay size="large" />
          </div>
        </div>
        <p className="text-gray-700 text-xs mt-16">© 2025 EX3D Prints · Jacob L. · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

      {/* LIGHTBOX for image zoom */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}