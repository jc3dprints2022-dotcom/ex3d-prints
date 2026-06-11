import React, { useState, useEffect, useRef } from "react";
import CarouselVideoSlide from "@/components/shared/CarouselVideoSlide";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useListingAnalytics } from "@/hooks/useListingAnalytics";

const STARSHIP_PRICE             = 20;
const SATURN_V_PRICE             = 39;
const SLS_PRICE                  = 30;
const GIANTS_COLLECTION_PRICE    = 75;
const GIANTS_COLLECTION_SEPARATE = SATURN_V_PRICE + SLS_PRICE + STARSHIP_PRICE;
const GIANTS_COLLECTION_SAVINGS  = GIANTS_COLLECTION_SEPARATE - GIANTS_COLLECTION_PRICE;
const GIANTS_SATURN_PRICE        = SATURN_V_PRICE;
const GIANTS_SLS_PRICE           = 16;
const GIANTS_STARSHIP_PRICE      = GIANTS_COLLECTION_PRICE - GIANTS_SATURN_PRICE - GIANTS_SLS_PRICE;

const SATURN_V_ID  = "693b06e655e441e07049d328";
const SLS_ID       = "69dbf08433850e148542d876";
const WEEKLY_LIMIT = 20;
const PAGE_SOURCE  = "starship_landing";

const FALLBACK_STARSHIP = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg";
const FALLBACK_SATURN   = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const FALLBACK_SLS      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";

const PRESS = [
  { name: "Fabbaloo",      url: "https://www.fabbaloo.com/news/ex3d-prints-launches-distributed-3d-printing-network-connecting-buyers-makers-and-designers" },
  { name: "Voxel Matters", url: "https://www.voxelmatters.com/ex3d-prints-your-neighbors-printer-as-a-node-in-a-global-manufacturing-network/" },
  { name: "Prism News",    url: "https://www.prismnews.com/hobbies/3d-printing/arizona-startup-ex3d-prints-launches-distributed-3d" },
  { name: "Prescott News", url: "https://prescottenews.com/2026/01/10/the-spirit-of-innovation-enterprise-club-at-erau-hosted-its-first-business-pitch-competition-in-november/" },
];

// Added location + date to reduce "fake review" suspicion
const REVIEWS = [
  { initial: "J", name: "John",     location: "Georgia",    text: "I ordered the Starship and I am extremely pleased with it. The model is very detailed and beautifully printed in color. The pieces were well packed and easy to assemble. All communications have been good and the order was delivered quickly. I have built and collected rocket models for years and this Starship now has a prominent place in my display. I look forward to more space/rocket models from EX3D Prints." },
  { initial: "B", name: "Bill",     location: "Texas",        text: "I have built them all. I am stunned by the precise fit. Better than any model I've ever built in my 65 years of building plastic kits." },
  { initial: "J", name: "Jess",     location: "Colorado",   text: "The product looks very clean and nice. Communication was quick and helpful, and the customer service was absolutely wonderful. A very lovely product!" },
  { initial: "R", name: "Rob",      location: "Texas",      text: "Communication was fantastic, the quality is top-notch, and I have been having a blast with it!" },
  { initial: "S", name: "Samantha", location: "California", text: "Love it! Great quality, shipped and arrived quick. Definitely recommend." },
];

// Scannable benefit bullets
const BENEFITS = [
  "Snaps together in 15 minutes",
  "10\" tall display model",
  "Printed in the USA",
  "Ships in 2-4 days",
  "Designed by AstroDesign 3D",
];


function useWeeklySlotsLeft() {
  const [slotsLeft, setSlotsLeft] = useState(null);
  useEffect(() => {
    const now = new Date(); const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    base44.entities.Order.filter({ created_date: { $gte: mon.toISOString() } })
      .then(orders => setSlotsLeft(Math.max(0, WEEKLY_LIMIT - orders.length)))
      .catch(() => setSlotsLeft(WEEKLY_LIMIT));
  }, []);
  return slotsLeft;
}


const isVideo = url => {
  if (!url) return false;
  const l = url.toLowerCase().split("?")[0];
  return l.endsWith(".mp4") || l.endsWith(".webm") || l.endsWith(".mov") || l.endsWith(".ogg");
};

function ReviewCarousel({ reviews }) {
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef(null);
  const touchX  = useRef(null);
  const touchY  = useRef(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onStart = e => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; };
    const onMove  = e => {
      if (touchX.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - touchX.current);
      const dy = Math.abs(e.touches[0].clientY - touchY.current);
      if (dx > dy && dx > 4) e.preventDefault();
    };
    const onEnd = e => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 36) setIdx(prev => (prev + (dx < 0 ? 1 : -1) + reviews.length) % reviews.length);
      touchX.current = null; touchY.current = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, [reviews.length]);

  const prev = () => setIdx(i => (i - 1 + reviews.length) % reviews.length);
  const next = () => setIdx(i => (i + 1) % reviews.length);

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Slide track */}
      <div ref={wrapRef} className="overflow-hidden rounded-xl">
        <div style={{
          display: "flex",
          transform: `translateX(-${idx * 100}%)`,
          transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "transform",
        }}>
          {reviews.map(({ initial, name, location, text }) => (
            <div key={name} style={{ flex: "0 0 100%", width: "100%" }}>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xs font-black flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">{name}, {location}</p>
                    <span className="text-cyan-400 text-xs">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">"{text}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prev}
          className="w-8 h-8 rounded-full flex items-center justify-center text-cyan-400 border border-white/10 bg-white/[0.03] hover:bg-white/10 transition-all text-sm">
          &#8592;
        </button>

        <div className="flex gap-1.5">
          {reviews.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-200 ${i === idx ? "w-4 h-1.5 bg-cyan-400" : "w-1.5 h-1.5 bg-white/20"}`} />
          ))}
        </div>

        <button onClick={next}
          className="w-8 h-8 rounded-full flex items-center justify-center text-cyan-400 border border-white/10 bg-white/[0.03] hover:bg-white/10 transition-all text-sm">
          &#8594;
        </button>
      </div>

      <p className="text-center text-gray-700 text-xs">Swipe or use arrows</p>
    </div>
  );
}

function SwipeCarousel({ images, onLightbox }) {
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef(null);
  const touchX  = useRef(null);
  const touchY  = useRef(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onStart = e => { touchX.current = e.touches[0].clientX; touchY.current = e.touches[0].clientY; };
    const onMove  = e => {
      if (touchX.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - touchX.current);
      const dy = Math.abs(e.touches[0].clientY - touchY.current);
      if (dx > dy && dx > 4) e.preventDefault();
    };
    const onEnd = e => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 36) setIdx(prev => (prev + (dx < 0 ? 1 : -1) + images.length) % images.length);
      touchX.current = null; touchY.current = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div className="flex flex-col gap-2 select-none">
      <div ref={wrapRef} className="w-full rounded-2xl overflow-hidden"
        style={{ background: "#040d14", border: "1px solid rgba(34,211,238,0.2)", height: "clamp(360px, 120vw, 540px)" }}>
        <div style={{
          display: "flex", width: "100%", height: "100%",
          transform: `translateX(-${idx * 100}%)`,
          transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          willChange: "transform",
        }}>
          {images.map((src, i) => (
            <div key={i} style={{ flex: "0 0 100%", width: "100%", height: "100%" }}>
              {isVideo(src) ? (
                <CarouselVideoSlide src={src} active={i === idx} />
              ) : (
                <div className="w-full h-full cursor-zoom-in" onClick={() => onLightbox(src)}>
                  <img src={src} alt={`Starship V2 photo ${i + 1}`} className="w-full h-full object-contain p-3" draggable={false} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-200 ${i === idx ? "w-4 h-1.5 bg-cyan-400" : "w-1.5 h-1.5 bg-white/20"}`} />
          ))}
        </div>
      )}
    </div>
  );
}


export default function Starship() {
  const [adding, setAdding]         = useState(null);
  const [lightbox, setLightbox]     = useState(null);
  const [showSticky, setShowSticky] = useState(false);
  const [starshipId, setStarshipId] = useState(null);
  const [bannerCopied, setBannerCopied] = useState(false);

  const [heroImage, setHeroImage]           = useState(FALLBACK_STARSHIP);
  const [carouselImages, setCarouselImages] = useState([]);
  const [bundleImages, setBundleImages]     = useState({ saturn: FALLBACK_SATURN, sls: FALLBACK_SLS });

  const heroCTARef = useRef(null);
  const slotsLeft  = useWeeklySlotsLeft();
  const { toast }  = useToast();

  const { trackAddToCart, trackCheckoutStarted } = useListingAnalytics({
    id: "starship_landing", name: "Starship V2", title: "Starship V2",
    category: "rocket_models", price: STARSHIP_PRICE,
    designer_name: "AstroDesign 3D", tags: ["starship", "rocket", "spacex", "space"],
  });

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0 });
    if (heroCTARef.current) obs.observe(heroCTARef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Capture affiliate ref from URL path (e.g. /StarshipLaunch/AFFILIATE_ID) or ?ref= param
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    // If the last path segment isn't the page name itself, it's an affiliate ID
    const knownPages = ['StarshipLaunch', 'Starship', 'SaturnV', 'SLS', 'HeavyLiftCollection', 'MoonMissionsCollection'];
    if (lastPart && !knownPages.includes(lastPart)) {
      localStorage.setItem('affiliateRef', lastPart);
    }
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) localStorage.setItem('affiliateRef', refParam);

    // Record affiliate click
    const capturedRef = lastPart && !knownPages.includes(lastPart) ? lastPart : refParam;
    if (capturedRef) {
      base44.entities.AffiliateClick.create({
        affiliate_id: capturedRef,
        referrer_url: document.referrer || '',
        session_id: localStorage.getItem('session_id') || '',
      }).catch(() => {});
    }

    base44.entities.Product.list()
      .then(products => {
        const starship = products.find(p => p.name?.toLowerCase().includes("starship"));
        const saturn   = products.find(p => p.id === SATURN_V_ID);
        const sls      = products.find(p => p.id === SLS_ID);
        if (starship) {
          setStarshipId(starship.id);
          const imgs = starship.images ?? [];
          setHeroImage(imgs[0] ?? FALLBACK_STARSHIP);
          setCarouselImages(imgs.slice(1));
        } else { setHeroImage(FALLBACK_STARSHIP); }
        setBundleImages({
          saturn: saturn?.images?.[0] ?? FALLBACK_SATURN,
          sls:    sls?.images?.[0]    ?? FALLBACK_SLS,
        });
      })
      .catch(() => { setHeroImage(FALLBACK_STARSHIP); setBundleImages({ saturn: FALLBACK_SATURN, sls: FALLBACK_SLS }); });
  }, []);

  const trackEvent = (name, data = {}) => {
    try { base44.entities.PageEvent?.create({ event: name, source: PAGE_SOURCE, timestamp: new Date().toISOString(), ...data }).catch(() => {}); } catch {}
  };

  const addToCart = async (type = "starship") => {
    setAdding(type);
    trackEvent("add_to_cart", { type });
    const isCollection = type === "heavy_lift_collection";
    trackAddToCart({ item_type: type, order_value: isCollection ? GIANTS_COLLECTION_PRICE : STARSHIP_PRICE, is_collection: isCollection });
    if (isCollection) trackCheckoutStarted({ order_value: GIANTS_COLLECTION_PRICE, item_type: "heavy_lift_collection" });
    try {
      const items = [];
      if (type === "starship") items.push({ product_id: starshipId, product_name: "Starship V2", price: STARSHIP_PRICE, image: heroImage });
      if (isCollection) {
        items.push({ product_id: SATURN_V_ID, product_name: "Saturn V (Heavy-Lift Collection)",    price: GIANTS_SATURN_PRICE,   image: bundleImages.saturn });
        items.push({ product_id: SLS_ID,      product_name: "SLS (Heavy-Lift Collection)",          price: GIANTS_SLS_PRICE,      image: bundleImages.sls });
        items.push({ product_id: starshipId,  product_name: "Starship V2 (Heavy-Lift Collection)", price: GIANTS_STARSHIP_PRICE, image: heroImage });
      }

      const user = await base44.auth.me().catch(() => null);

      if (user) {
        // Fetch user's existing cart and write all items in parallel
        const userCart = await base44.entities.Cart.filter({ user_id: user.id }).catch(() => []);
        await Promise.all(items.filter(it => it.product_id).map(it => {
          const ex = userCart.find(c => c.product_id === it.product_id);
          if (ex) return base44.entities.Cart.update(ex.id, { unit_price: it.price, total_price: it.price * ex.quantity, product_name: it.product_name });
          return base44.entities.Cart.create({ user_id: user.id, product_id: it.product_id, product_name: it.product_name, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: it.price, total_price: it.price, images: [it.image], source: PAGE_SOURCE });
        }));
      } else {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        for (const it of items) {
          if (!it.product_id) continue;
          const i = cart.findIndex(c => c.product_id === it.product_id);
          if (i >= 0) { cart[i].unit_price = it.price; cart[i].total_price = it.price * cart[i].quantity; cart[i].product_name = it.product_name; }
          else cart.push({ id: `anon_${it.product_id}_${Date.now()}`, product_id: it.product_id, product_name: it.product_name, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: it.price, total_price: it.price, images: [it.image], source: PAGE_SOURCE });
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      }
      window.dispatchEvent(new Event("cartUpdated"));
      // Navigate immediately — no toast delay
      window.location.href = "/Checkout";
    } catch { toast({ title: "Failed to add to cart", variant: "destructive" }); }
    setAdding(null);
  };

  const urgent = slotsLeft !== null && slotsLeft <= 5;

  return (
    <div className="min-h-screen bg-[#050a12] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Toaster />

      {/* STICKY MOBILE CTA */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:hidden"
          style={{ background: "rgba(5,10,18,0.97)", borderTop: "1px solid rgba(34,211,238,0.2)" }}>
          {slotsLeft !== null && slotsLeft < WEEKLY_LIMIT && (
            <p className={`text-center text-xs font-semibold mb-2 ${urgent ? "text-red-400" : "text-amber-300"}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle animate-pulse ${urgent ? "bg-red-400" : "bg-amber-400"}`} />
              {slotsLeft === 0 ? "Fully booked this week" : `Only ${slotsLeft} slots left this week`}
            </p>
          )}
          <button onClick={() => addToCart("starship")} disabled={adding !== null}
            className="w-full py-4 rounded-full font-black text-base text-white disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)" }}>
            {adding === "starship" ? "Adding..." : "Order Now · $20"}
          </button>
        </div>
      )}

      {/* LOGO */}
      <div className="w-full px-5 py-3 flex items-center justify-end border-b border-white/5 bg-[#050a12]">
        <img src="https://media.base44.com/images/public/68f40a023bb378f79ed78369/EX3DLogo.png" alt="EX3D Prints"
          className="h-6 object-contain" onError={e => { e.currentTarget.style.display = "none"; }} />
      </div>

      {/* LAUNCH BANNER — tap to copy */}
      <div className="w-full py-2 px-4 text-center text-xs font-bold tracking-wide cursor-pointer select-none"
        style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)", color: "white" }}
        onClick={() => { navigator.clipboard?.writeText("LAUNCH15"); setBannerCopied(true); setTimeout(() => setBannerCopied(false), 2000); }}>
        {bannerCopied ? "Copied!" : <>Launch Special: Use <span className="bg-white/20 px-1.5 py-0.5 rounded font-black mx-1">LAUNCH15</span> for 15% off. Tap to copy.</>}
      </div>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="max-w-sm mx-auto px-5 pt-6 pb-8">

        {/* 1. HERO IMAGE — first thing users see */}
        <div className="w-full rounded-2xl overflow-hidden mb-5 cursor-zoom-in"
          style={{
            border: "1px solid rgba(34,211,238,0.3)",
            boxShadow: "0 0 50px rgba(34,211,238,0.08), 0 16px 48px rgba(0,0,0,0.6)",
            background: "#040d14",
            height: "clamp(300px, 48vw, 450px)",
          }}
          onClick={() => heroImage && setLightbox(heroImage)}>
          {heroImage ? (
            <img src={heroImage} alt="Starship V2 3D printed rocket model kit"
              className="w-full h-full object-contain p-2" fetchpriority="high" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
            </div>
          )}
        </div>

        {/* 2. HEADLINE — object-first, desire before information */}
        <h1 className="text-3xl font-black text-center leading-tight mb-1">
          Own a Starship{" "}
          <span style={{ background: "linear-gradient(90deg, #22d3ee, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            for $20
          </span>
        </h1>
        <p className="text-center text-gray-400 text-sm mb-5 leading-relaxed">
          Detailed 10" snap-fit Starship V2 model kit. Assembles in 15 minutes. Some glue needed.
        </p>

        {/* 3. PRICE + SCARCITY */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-4xl"
              style={{ background: "linear-gradient(90deg, #22d3ee, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              $20
            </span>
          </div>
          {slotsLeft !== null && slotsLeft < WEEKLY_LIMIT && (
            <span className={`text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${urgent ? "text-red-400" : "text-amber-300"}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${urgent ? "bg-red-400" : "bg-amber-400"}`} />
              {slotsLeft === 0 ? "Sold out" : `${slotsLeft} left`}
            </span>
          )}
        </div>

        {/* 4. CTA — before benefits, not after */}
        <div ref={heroCTARef}>
          <button onClick={() => addToCart("starship")} disabled={adding !== null}
            className="w-full py-4 rounded-full font-black text-lg text-white disabled:opacity-60 transition-all hover:scale-[1.02] mb-3"
            style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)", boxShadow: "0 6px 28px rgba(34,211,238,0.28)" }}>
            {adding === "starship" ? "Adding..." : "Order Now"}
          </button>
        </div>

        {/* 5. TRUST STRIP — validates purchase right after CTA */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="text-cyan-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span>5.0</span>
          </span>
          <span className="text-white/10">|</span>
          <span className="text-xs text-gray-400">Ships in 2-4 days</span>
          <span className="text-white/10">|</span>
          <span className="text-xs text-gray-400">30-day guarantee</span>
        </div>

        {/* 6. PRESS LOGOS — trust before scrolling deeper */}
        <div className="mb-6">
          <p className="text-center text-gray-600 text-[10px] uppercase tracking-[0.3em] mb-2">Featured in</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESS.map(({ name, url }) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 border border-white/10 rounded-full px-3 py-1 bg-white/[0.03] hover:text-white hover:border-white/20 transition-all">
                {name}
              </a>
            ))}
          </div>
        </div>

        {/* 7. BENEFITS — scannable, short */}
        <div className="space-y-2 mb-5">
          {BENEFITS.map(b => (
            <p key={b} className="text-sm text-gray-300 flex items-center gap-2">
              <span className="text-cyan-400 flex-shrink-0 font-bold">✓</span> {b}
            </p>
          ))}
        </div>

        {/* 8. GUARANTEE */}
        <div className="flex items-start gap-3 bg-green-950/30 border border-green-500/20 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-green-300 text-xs font-bold mb-0.5">30-Day Free Reprint Guarantee</p>
            <p className="text-green-400/70 text-[11px] leading-relaxed">If anything is wrong with your print, we reship a replacement part free.</p>
          </div>
        </div>
      </section>

      {/* ── CAROUSEL ─────────────────────────────────────────────── */}
      {carouselImages.length > 0 && (
        <section className="border-t border-white/5 py-8 px-5">
          <div className="max-w-sm mx-auto">
            <SwipeCarousel images={carouselImages} onLightbox={setLightbox} />
            <p className="text-center text-gray-700 text-xs mt-3">Swipe for more photos</p>
          </div>
        </section>
      )}

      {/* ── REVIEWS ──────────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-8 px-5 bg-white/[0.02]">
        <div className="max-w-sm mx-auto">
          <p className="text-xs tracking-[0.35em] text-cyan-400/70 uppercase text-center mb-6">What Customers Say</p>
          <ReviewCarousel reviews={REVIEWS} />
        </div>
      </section>

      {/* ── FOUNDER STORY ────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-8 px-5">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-500/40 flex-shrink-0">
              <img src="https://media.base44.com/images/public/68f40a023bb378f79ed78369/7e8123d76_IMG_20251026_1038521.jpg"
                alt="Jacob, founder of EX3D Prints" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Jacob</p>
              <p className="text-gray-500 text-xs">Founder, EX3D Prints</p>
            </div>
          </div>
          {/* Compressed — cold traffic won't read an autobiography */}
          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            Aerospace engineering student, space obsessive, and the person who built this. I partnered with AstroDesign 3D, the best rocket modeler in 3D printing, so every order puts a genuinely great design on your shelf and a royalty in his pocket. Your order is printed by a verified maker near you, which means it ships faster and costs less than anything coming from overseas.
          </p>
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4">
            {/* Removed "15+ Orders shipped" — low numbers signal immaturity to cold traffic */}
            {[
              { num: "10+", label: "States reached"  },
              { num: "20",  label: "Verified makers"  },
              { num: "4",   label: "Press features"   },
              { num: "5★", label: "Avg review"       },
            ].map(({ num, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-cyan-400 font-black text-lg leading-none">{num}</span>
                <span className="text-gray-600 text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="border-t border-white/5 py-8 px-5 bg-white/[0.02]">
        <div className="max-w-sm mx-auto space-y-5">
          {[
            { q: "How hard is assembly?",         a: "Parts snap together with a press-fit design. Super glue on a few sections makes it rock solid. No painting. About 15 minutes total." },
            { q: "What if something is damaged?", a: "Email ex3dprint@gmail.com. We reprint and reship at no cost, no return shipping needed." },
            { q: "Who designed this?",            a: "AstroDesign 3D (KMO Brain), one of the most respected and accurate rocket modelers in 3D printing. EX3D prints and fulfills his licensed designs." },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="text-white font-bold text-sm mb-1">{q}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COLLECTION UPSELL ────────────────────────────────────── */}
      <section className="border-t border-white/5 py-10 px-5">
        <div className="max-w-sm mx-auto">
          <p className="text-xs tracking-[0.35em] text-cyan-400/70 uppercase text-center mb-2">Want all three?</p>
          <h2 className="text-xl font-black text-center mb-6">The Heavy-Lift Collection</h2>

          <p className="text-gray-700 text-[10px] text-center mb-3">Tap any image to enlarge</p>
          <div className="flex gap-2 mb-5 justify-center">
            {[
              { src: bundleImages.saturn, alt: "Saturn V",   label: 'Saturn V 22"',  border: "rgba(251,146,60,0.3)" },
              { src: bundleImages.sls,    alt: "SLS",         label: 'SLS 20"',        border: "rgba(96,165,250,0.3)"  },
              { src: heroImage,           alt: "Starship V2", label: 'Starship 10"',   border: "rgba(34,211,238,0.3)"  },
            ].map(({ src, alt, label, border }) => (
              <div key={alt} className="flex flex-col items-center gap-1" style={{ width: "30%" }}>
                <div className="w-full rounded-xl overflow-hidden bg-[#040d14] cursor-zoom-in"
                  style={{ aspectRatio: "2/3", border: `1px solid ${border}` }}
                  onClick={() => src && setLightbox(src)}>
                  {src ? (
                    <img src={src} alt={alt} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-[10px]">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border-2 border-cyan-500/30 rounded-2xl p-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
              Save ${GIANTS_COLLECTION_SAVINGS}
            </div>
            <p className="text-white font-black text-base text-center mb-1">Saturn V + SLS + Starship V2</p>
            <p className="text-gray-500 text-xs text-center mb-3">All three rockets, printed and shipped together.</p>
            <div className="flex items-baseline justify-center gap-3 mb-4">
              <span className="text-gray-500 line-through">${GIANTS_COLLECTION_SEPARATE}</span>
              <span className="font-black text-3xl text-cyan-400">${GIANTS_COLLECTION_PRICE}</span>
            </div>
            <button onClick={() => addToCart("heavy_lift_collection")} disabled={adding !== null}
              className="w-full py-4 rounded-full font-black text-base text-white disabled:opacity-60 transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)" }}>
              {adding === "heavy_lift_collection" ? "Adding..." : "Get The Collection"}
            </button>
            <p className="text-green-400 text-xs text-center mt-3">&#10003; 30-day free reprint guarantee</p>
          </div>
        </div>
      </section>

      <footer className="py-6 px-5 border-t border-white/5 text-center">
        <p className="text-gray-800 text-xs">2025 EX3D Prints · Design by AstroDesign 3D</p>
      </footer>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }}
            style={{ position: "fixed", top: 16, right: 16, zIndex: 60 }}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl"
            aria-label="Close">
            &#x2715;
          </button>
          {isVideo(lightbox) ? (
            <video src={lightbox} className="max-w-full max-h-full rounded-lg" controls autoPlay muted loop playsInline
              onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightbox} alt="Enlarged view" className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
}