import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Product IDs
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// Pricing
const SATURN_V_PRICE  = 39;
const SLS_PRICE       = 30;
const STARSHIP_PRICE  = 20;

const GIANTS_BUNDLE_PRICE    = 75;
const GIANTS_BUNDLE_SEPARATE = SATURN_V_PRICE + SLS_PRICE + STARSHIP_PRICE; // $89
const GIANTS_BUNDLE_SAVINGS  = GIANTS_BUNDLE_SEPARATE - GIANTS_BUNDLE_PRICE; // $14
const GIANTS_SATURN_PRICE    = SATURN_V_PRICE;
const GIANTS_SLS_PRICE       = 16;
const GIANTS_STARSHIP_PRICE  = GIANTS_BUNDLE_PRICE - GIANTS_SATURN_PRICE - GIANTS_SLS_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";
const WEEKLY_LIMIT = 40;

// Images - add more URLs to individual gallery arrays for swipe
const SATURN_V_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg",
  // "https://...",
];

const SLS_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg",
  // "https://...",
];

const STARSHIP_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg",
  // "https://...",
];

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS = "2 days";
const MAKER_COUNT   = 20;
const MAKER_STATES  = 11;

// Swipeable carousel - used only on individual product cards
function ImageCarousel({ images, alt, height = "h-64", onExpand }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);

  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? setIdx((i) => (i + 1) % images.length) : setIdx((i) => (i - 1 + images.length) % images.length);
    touchStartX.current = null;
  };

  return (
    <div className={`relative w-full ${height} bg-black rounded-xl overflow-hidden group`}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={images[idx]} alt={alt}
        className="w-full h-full object-contain cursor-zoom-in transition-opacity duration-300"
        onClick={() => onExpand(images[idx])} />
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">‹</button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-orange-400 scale-125" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useWeeklySlotsLeft() {
  const [slotsLeft, setSlotsLeft] = useState(null);
  useEffect(() => {
    const getWeekStart = () => {
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      monday.setHours(0, 0, 0, 0);
      return monday;
    };
    base44.entities.Order.filter({})
      .then((orders) => {
        const weekStart = getWeekStart();
        const count = orders.filter((o) => o.created_date && new Date(o.created_date) >= weekStart).length;
        setSlotsLeft(Math.max(0, WEEKLY_LIMIT - count));
      })
      .catch(() => setSlotsLeft(33));
  }, []);
  return slotsLeft;
}

export default function SaturnV() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const [starshipId, setStarshipId]         = useState(null);
  const [productCardImages, setProductCardImages] = useState({
    saturn:   SATURN_V_GALLERY,
    sls:      SLS_GALLERY,
    starship: STARSHIP_GALLERY,
  });
  const slotsLeft = useWeeklySlotsLeft();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Product.filter({ status: "active" })
      .then((products) => {
        const starship = products.find((p) => p.name?.toLowerCase().includes("starship"));
        const saturn   = products.find((p) => p.id === SATURN_V_ID);
        const sls      = products.find((p) => p.id === SLS_ID);
        if (starship) setStarshipId(starship.id);
        setProductCardImages({
          saturn:   saturn?.images?.length   ? saturn.images   : SATURN_V_GALLERY,
          sls:      sls?.images?.length      ? sls.images      : SLS_GALLERY,
          starship: starship?.images?.length ? starship.images : STARSHIP_GALLERY,
        });
      })
      .catch(console.error);
  }, []);

  const firstImg = (arr) => Array.isArray(arr) ? arr[0] : arr;

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);
      const saturnImg   = firstImg(productCardImages.saturn);
      const slsImg      = firstImg(productCardImages.sls);
      const starshipImg = firstImg(productCardImages.starship);

      const itemsToAdd = [];
      if (type === "saturn")        itemsToAdd.push({ product_id: SATURN_V_ID, product_name: "Saturn V",                        price: SATURN_V_PRICE,       image: saturnImg });
      if (type === "sls")           itemsToAdd.push({ product_id: SLS_ID,      product_name: "SLS (Artemis)",                   price: SLS_PRICE,            image: slsImg });
      if (type === "starship")      itemsToAdd.push({ product_id: starshipId,  product_name: "Starship V2",                     price: STARSHIP_PRICE,       image: starshipImg });
      if (type === "giants_bundle") {
        itemsToAdd.push({ product_id: SATURN_V_ID, product_name: "Saturn V (Heavy-Lift Bundle)",    price: GIANTS_SATURN_PRICE,   image: saturnImg });
        itemsToAdd.push({ product_id: SLS_ID,      product_name: "SLS (Heavy-Lift Bundle)",          price: GIANTS_SLS_PRICE,      image: slsImg });
        itemsToAdd.push({ product_id: starshipId,  product_name: "Starship V2 (Heavy-Lift Bundle)", price: GIANTS_STARSHIP_PRICE, image: starshipImg });
      }

      if (user) {
        for (const item of itemsToAdd) {
          if (!item.product_id) continue;
          const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: item.product_id });
          if (existing.length > 0) await base44.entities.Cart.update(existing[0].id, { unit_price: item.price, total_price: item.price * existing[0].quantity, product_name: item.product_name });
          else await base44.entities.Cart.create({ user_id: user.id, product_id: item.product_id, product_name: item.product_name, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: item.price, total_price: item.price, images: item.image ? [item.image] : [] });
        }
      } else {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        for (const item of itemsToAdd) {
          if (!item.product_id) continue;
          const idx = cart.findIndex((i) => i.product_id === item.product_id);
          if (idx >= 0) { cart[idx].unit_price = item.price; cart[idx].total_price = item.price * cart[idx].quantity; cart[idx].product_name = item.product_name; }
          else cart.push({ id: `anon_${item.product_id}_${Date.now()}`, product_id: item.product_id, product_name: item.product_name, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: item.price, total_price: item.price, images: item.image ? [item.image] : [] });
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "giants_bundle") toast({ title: "Bundle added! 🚀", description: `All three rockets for $${GIANTS_BUNDLE_PRICE}` });
      setTimeout(() => { window.location.href = "/Cart"; }, type === "giants_bundle" ? 500 : 0);
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

  const BundleBtn = ({ size = "base" }) => (
    <button onClick={() => addToCart("giants_bundle")} disabled={adding !== null}
      className={`font-black rounded-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-yellow-400 text-white transition-all duration-200 hover:scale-105 disabled:opacity-60 shadow-xl shadow-orange-900/40 ${size === "lg" ? "text-xl px-14 py-6" : "text-base px-8 py-4"}`}>
      {adding === "giants_bundle" ? "Adding..." : `Get the Bundle — $${GIANTS_BUNDLE_PRICE}`}
    </button>
  );

  const SingleBtn = ({ type, children }) => (
    <button onClick={() => addToCart(type)} disabled={adding !== null}
      className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all disabled:opacity-50">
      {adding === type ? "Adding..." : children}
    </button>
  );

  const ScarcityBadge = () => {
    if (slotsLeft === null) return null;
    const urgent = slotsLeft <= 10;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide ${urgent ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgent ? "bg-red-400" : "bg-orange-400"}`} />
        {slotsLeft === 0 ? "Fully booked this week, check back Monday" : `Only ${slotsLeft} order slots left this week`}
      </div>
    );
  };

  const faqs = [
    { q: "How long until it arrives?",         a: `Most orders ship within ${SHIPPING_DAYS}. Printed by a maker near you, not shipped from overseas.` },
    { q: "How hard is assembly?",              a: "Parts press-fit together. A little super glue on a few sections makes it rock-solid. No painting. About 30 to 60 minutes." },
    { q: "What if something arrives damaged?", a: "Email us. We send replacement parts free. No return shipping needed." },
    { q: "Who designed these?",                a: "kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D prints and fulfills his designs." },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Toaster />

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center px-5 text-center overflow-hidden pt-10 pb-16">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, #1e1035 0%, #080810 65%)" }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "55px 55px" }} />
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-[10px] tracking-[0.45em] text-orange-400/70 uppercase mb-4">EX3D Prints · Heavy-Lift Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] mb-4 tracking-tight">
            Own The Most Iconic<br />
            <span style={{ background: "linear-gradient(90deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Rockets Ever Built.
            </span>
          </h1>
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs text-gray-500 mb-5 flex-wrap">
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Ships in {SHIPPING_DAYS}</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Printed locally in the US</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> Free replacement parts</span>
            <span className="flex items-center gap-1"><span className="text-orange-400">✦</span> {MAKER_COUNT} vetted makers</span>
          </div>
          <div className="flex justify-center mb-6"><ScarcityBadge /></div>
          <p className="text-[10px] tracking-[0.3em] text-orange-400 uppercase mb-2">Best Value · The Heavy-Lift Bundle</p>

          {/* Hero - static images, no carousel */}
          <div className="flex justify-center items-end gap-2 sm:gap-4 md:gap-6 mb-8 w-full">
            {[
              { src: firstImg(SATURN_V_GALLERY), alt: "Saturn V",   label: "Saturn V · 56cm",  shadow: "#fb923c18", border: "rgba(251,146,60,0.3)" },
              { src: firstImg(SLS_GALLERY),      alt: "SLS",         label: "SLS · 50cm",       shadow: "#60a5fa18", border: "rgba(96,165,250,0.3)"  },
              { src: firstImg(STARSHIP_GALLERY), alt: "Starship V2", label: "Starship V2",       shadow: "#22d3ee18", border: "rgba(34,211,238,0.3)"  },
            ].map(({ src, alt, label, shadow, border }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[160px] sm:max-w-[200px] md:max-w-[260px]">
                <button onClick={() => setLightboxImage(src)}
                  className="rounded-2xl overflow-hidden w-full h-[220px] sm:h-[320px] md:h-[420px] transition-transform hover:scale-[1.02]"
                  style={{ border: `1px solid ${border}`, boxShadow: `0 24px 60px ${shadow}` }}>
                  <img src={src} alt={alt} className="w-full h-full object-cover" />
                </button>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 mb-4">
            <BundleBtn size="lg" />
            <p className="text-sm">
              <span className="text-gray-500 line-through mr-2">${GIANTS_BUNDLE_SEPARATE}</span>
              <span className="text-orange-400 font-bold">Save ${GIANTS_BUNDLE_SAVINGS}</span>
            </p>
            <p className="text-gray-300 text-sm font-semibold mt-1">or buy each separately below</p>
          </div>
          <p className="text-[10px] text-gray-700 italic">Designs by kmobrain (AstroDesign 3D)</p>
        </div>
      </section>

      {/* INDIVIDUAL ROCKETS - swipeable carousels */}
      <section id="individual" className="py-12 px-5 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-6">Buy Each Separately</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { type: "saturn",   images: productCardImages.saturn,   name: "Saturn V",   price: SATURN_V_PRICE,  color: "text-orange-400", spec: "56cm · 1:200", desc: "The rocket that took humanity to the Moon." },
              { type: "sls",      images: productCardImages.sls,       name: "SLS",         price: SLS_PRICE,       color: "text-blue-400",   spec: "50cm · 1:200", desc: "NASA's next Moon rocket, Artemis program." },
              { type: "starship", images: productCardImages.starship,  name: "Starship V2", price: STARSHIP_PRICE,  color: "text-cyan-400",   spec: "26cm · 1:200", desc: "The most powerful rocket ever built." },
            ].map(({ type, images, name, price, color, spec, desc }) => (
              <div key={type} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col">
                <ImageCarousel images={images} alt={name} height="h-44" onExpand={setLightboxImage} />
                <h3 className="font-bold text-sm mb-0.5 mt-3">{name}</h3>
                <p className={`${color} font-black text-lg mb-1`}>${price}</p>
                <p className="text-xs text-gray-600 mb-1">{spec} · PLA · Press-fit</p>
                <p className="text-xs text-gray-500 flex-1 mb-3">{desc}</p>
                <SingleBtn type={type}>Add to Cart</SingleBtn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THREE ROCKET BUNDLE - mirrors RocketCollection bundle layout */}
      <section className="py-12 px-5 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-orange-400/70 uppercase text-center mb-2">Best Value</p>
          <h2 className="text-2xl font-black text-white text-center mb-6">The Heavy-Lift Bundle</h2>
          <div className="bg-gradient-to-b from-orange-900/20 to-white/[0.02] border-2 border-orange-500/40 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-5 py-1 rounded-full">Save ${GIANTS_BUNDLE_SAVINGS}</div>

            {/* Three static images side by side */}
            <div className="flex gap-3 mb-6 h-48">
              {[
                { src: firstImg(productCardImages.saturn),   alt: "Saturn V",   border: "rgba(251,146,60,0.25)" },
                { src: firstImg(productCardImages.sls),      alt: "SLS",         border: "rgba(96,165,250,0.25)"  },
                { src: firstImg(productCardImages.starship), alt: "Starship V2", border: "rgba(34,211,238,0.25)"  },
              ].map(({ src, alt, border }) => (
                <div key={alt} className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center"
                  style={{ border: `1px solid ${border}` }}>
                  <img src={src} alt={alt} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-black mb-1">Saturn V + SLS + Starship V2</h3>
                <p className="text-gray-400 text-sm mb-2">All three heavy-lift rockets, printed and shipped together.</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-gray-500 line-through text-lg">${GIANTS_BUNDLE_SEPARATE}</span>
                  <span className="text-orange-400 font-black text-3xl">${GIANTS_BUNDLE_PRICE}</span>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Saturn V · 56cm</span>
                  <span>SLS · 50cm</span>
                  <span>Starship V2 · 26cm</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <BundleBtn size="base" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE + SPACE SHUTTLE TEASER */}
      <section className="py-14 px-5 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-lg mx-auto text-center">
          <div className="mb-8 p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[10px] tracking-[0.3em] text-amber-400 uppercase font-bold">Coming Next</p>
            </div>
            <h3 className="text-lg font-black text-white mb-1">Space Shuttle</h3>
            <p className="text-gray-500 text-sm">America's most iconic winged spacecraft. Be the first to know when it launches.</p>
          </div>

          <p className="text-[10px] tracking-[0.4em] text-orange-400 uppercase mb-3">Space Nerds Only</p>
          <h2 className="text-2xl font-black mb-2">Get 10% Off + Early Access</h2>
          <p className="text-gray-500 text-sm mb-6">
            Join the list, get a discount code instantly, and be first to know when the Space Shuttle drops.
          </p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-black border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-sm" />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm hover:scale-105 transition-all disabled:opacity-60 whitespace-nowrap">
                {emailLoading ? "Saving..." : "Get My Code"}
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
              <p className="text-gray-600 text-xs">10% off any rocket or bundle. We'll notify you when Space Shuttle goes live.</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-orange-400 hover:text-orange-300 text-sm font-semibold underline">Shop now</button>
            </div>
          )}
          <p className="text-[10px] text-gray-700 mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-14 px-5 border-t border-white/5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <img src={FOUNDER_IMAGE} alt="Jacob" className="w-24 h-24 rounded-full object-cover flex-shrink-0 mx-auto sm:mx-0" style={{ border: "2px solid rgba(251,146,60,0.3)" }} />
          <div>
            <p className="text-[10px] tracking-widest text-orange-400 uppercase mb-2">Why this exists</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I couldn't find a high-quality model of a Saturn V that wasn't either a cheap toy or a $300 collector piece, so I partnered with <strong className="text-white">kmobrain (AstroDesign 3D)</strong> and built a network of {MAKER_COUNT} local makers to print his designs on demand. Quality models, made by real people, at a real price.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-5 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">Questions</h2>
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

      {/* FINAL CTA */}
      <section className="py-20 px-5 text-center border-t border-white/5" style={{ background: "linear-gradient(to top, #1a0800, transparent)" }}>
        <div className="flex justify-center mb-5"><ScarcityBadge /></div>
        <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
          Three Rockets.<br />
          <span style={{ background: "linear-gradient(90deg, #fb923c, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            One Bundle. ${GIANTS_BUNDLE_PRICE}.
          </span>
        </h2>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
          Saturn V, SLS, and Starship V2. Printed by a maker near you, shipped in {SHIPPING_DAYS}.
        </p>
        <div className="flex flex-col items-center gap-3">
          <BundleBtn size="lg" />
          <p className="text-sm text-gray-600">
            <span className="line-through mr-2">${GIANTS_BUNDLE_SEPARATE}</span>
            <span className="text-orange-400 font-bold">Save ${GIANTS_BUNDLE_SAVINGS}</span>
          </p>
        </div>
        <p className="text-gray-800 text-xs mt-14">2025 EX3D Prints · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

      {/* STICKY MOBILE CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden px-4 pb-4 pt-3"
        style={{ background: "linear-gradient(to top, #080810 60%, transparent)" }}>
        <button onClick={() => addToCart("giants_bundle")} disabled={adding !== null}
          className="w-full py-4 rounded-full font-black text-base text-white transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, #f97316, #fbbf24)", boxShadow: "0 8px 32px rgba(249,115,22,0.4)" }}>
          {adding === "giants_bundle" ? "Adding..." : `Bundle — $${GIANTS_BUNDLE_PRICE} · Save $${GIANTS_BUNDLE_SAVINGS}`}
        </button>
      </div>

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400">x</button>
        </div>
      )}
    </div>
  );
}