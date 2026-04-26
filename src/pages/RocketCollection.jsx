import React, { useState, useEffect, useRef } from "react";
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
const WEEKLY_LIMIT = 40;

// ── IMAGES — add more URLs to each array for the swipe gallery ────────────────
const SATURN_V_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg",
  // Add additional Saturn V photo URLs here:
  // "https://...",
];

const SLS_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg",
  // Add additional SLS photo URLs here:
  // "https://...",
];

const STARSHIP_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg",
  // Add additional Starship photo URLs here:
  // "https://...",
];

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS = "2-4 days";
const MAKER_COUNT   = 19;
const MAKER_STATES  = 11;

// ── Payment method icons (Stripe Link accepts all of these) ───────────────────
const PAYMENT_METHODS = [
  { label: "Link", icon: "⚡" },
  { label: "Visa", icon: null, svg: true },
  { label: "Mastercard", icon: null, svg: true },
  { label: "Amex", icon: null, svg: true },
  { label: "Apple Pay", icon: "🍎" },
  { label: "Google Pay", icon: "G" },
];

// ── Swipeable image carousel ──────────────────────────────────────────────────
function ImageCarousel({ images, alt, height = "h-64", onExpand }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);

  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? setIdx((i) => (i + 1) % images.length) : setIdx((i) => (i - 1 + images.length) % images.length);
    touchStartX.current = null;
  };

  return (
    <div className={`relative w-full ${height} bg-black rounded-xl overflow-hidden group`}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img
        src={images[idx]} alt={alt}
        className="w-full h-full object-contain cursor-zoom-in transition-opacity duration-300"
        onClick={() => onExpand(images[idx])}
      />
      {images.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">‹</button>
          <button onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">›</button>
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

// ── Weekly scarcity counter ───────────────────────────────────────────────────
function useWeeklySlotsLeft() {
  const [slotsLeft, setSlotsLeft] = useState(null);

  useEffect(() => {
    const getWeekStart = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    };

    base44.entities.Order.filter({})
      .then((orders) => {
        const weekStart = getWeekStart();
        const weekOrders = orders.filter(
          (o) => o.created_date && new Date(o.created_date) >= weekStart
        );
        setSlotsLeft(Math.max(0, WEEKLY_LIMIT - weekOrders.length));
      })
      .catch(() => setSlotsLeft(33)); // fallback
  }, []);

  return slotsLeft;
}

export default function RocketCollection() {
  const [adding, setAdding]               = useState(null);
  const [openFaq, setOpenFaq]             = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [email, setEmail]                 = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]   = useState(false);
  const [codeCopied, setCodeCopied]       = useState(false);
  const [productCardImages, setProductCardImages] = useState({
    saturn: SATURN_V_GALLERY,
    sls:    SLS_GALLERY,
  });
  const slotsLeft = useWeeklySlotsLeft();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Product.filter({ status: "active" })
      .then((products) => {
        const saturn = products.find((p) => p.id === SATURN_V_ID);
        const sls    = products.find((p) => p.id === SLS_ID);
        setProductCardImages({
          saturn: saturn?.images?.length ? saturn.images : SATURN_V_GALLERY,
          sls:    sls?.images?.length    ? sls.images    : SLS_GALLERY,
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
          await base44.entities.Cart.update(existing[0].id, { unit_price: price, total_price: price * existing[0].quantity, product_name: productName });
        } else {
          await base44.entities.Cart.create({ user_id: user.id, product_id: productId, product_name: productName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: price, total_price: price, images: [imageUrl] });
        }
      };

      const pushLocal = (productId, productName, price, imageUrl) => {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        const idx = cart.findIndex((i) => i.product_id === productId);
        if (idx >= 0) { cart[idx].unit_price = price; cart[idx].total_price = price * cart[idx].quantity; cart[idx].product_name = productName; }
        else cart.push({ id: `anon_${productId}_${Date.now()}`, product_id: productId, product_name: productName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: price, total_price: price, images: [imageUrl] });
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      };

      const saturnImg = Array.isArray(productCardImages.saturn) ? productCardImages.saturn[0] : productCardImages.saturn;
      const slsImg    = Array.isArray(productCardImages.sls)    ? productCardImages.sls[0]    : productCardImages.sls;

      if (type === "saturn" || type === "bundle") {
        const name = type === "bundle" ? "Saturn V (Bundle)" : "Saturn V";
        if (user) await upsertDB(SATURN_V_ID, name, SATURN_V_PRICE, saturnImg);
        else pushLocal(SATURN_V_ID, name, SATURN_V_PRICE, saturnImg);
      }
      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        if (user) await upsertDB(SLS_ID, slsName, slsPrice, slsImg);
        else pushLocal(SLS_ID, slsName, slsPrice, slsImg);
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Bundle added! 🚀", description: `Saturn V + SLS for $${BUNDLE_PRICE}` });
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
    <button onClick={() => addToCart(type)} disabled={adding !== null}
      className={`font-bold rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-70 shadow-lg ${className}`}>
      {adding === type ? "Adding…" : children}
    </button>
  );

  const faqs = [
    { q: "How long until my rocket arrives?",           a: `Most orders ship within ${SHIPPING_DAYS}. Printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states — not shipped from overseas.` },
    { q: "How hard is the assembly?",                   a: "Parts press-fit together. A little super glue on a few joints makes it rock-solid. No painting. About 30–60 minutes." },
    { q: "What if something arrives damaged?",          a: "Email us and we'll send replacement parts free. No return shipping needed." },
    { q: "Who designs these rockets?",                  a: "kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D licenses his designs and handles printing and fulfillment." },
    { q: "What payment methods do you accept?",         a: "We use Stripe Link at checkout — which accepts Visa, Mastercard, Amex, Apple Pay, Google Pay, and more. All major cards work." },
    { q: "Can I return it?",                            a: "Printed to order, so no change-of-mind returns. If anything is wrong with what you received, we make it right." },
  ];

  const ScarcityBadge = () => {
    if (slotsLeft === null) return null;
    const urgent = slotsLeft <= 10;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide ${urgent ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${urgent ? "bg-red-400 animate-pulse" : "bg-orange-400 animate-pulse"}`} />
        {slotsLeft === 0 ? "Fully booked this week — check back Monday" : `Only ${slotsLeft} order slots left this week`}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-3">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-3">
            Own the Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Built
            </span>
          </h1>
          <p className="text-sm text-orange-400 font-semibold mb-4 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          <div className="flex justify-center mb-6">
            <ScarcityBadge />
          </div>

          {/* Hero images with swipe gallery */}
          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-6 w-full px-2">
            {[
              { images: SATURN_V_GALLERY, alt: "Saturn V", label: "Saturn V · 56cm", border: "border-orange-500/30" },
              { images: SLS_GALLERY,      alt: "SLS",       label: "SLS · 50cm",     border: "border-blue-500/30"   },
            ].map(({ images, alt, label, border }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px]">
                <div className={`w-full border ${border} rounded-2xl overflow-hidden h-[280px] sm:h-[360px]`}>
                  <ImageCarousel images={images} alt={alt} height="h-full" onExpand={setLightboxImage} />
                </div>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600 mb-6 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>

          <div className="flex flex-col items-center gap-3">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5">
              Get the Bundle for ${BUNDLE_PRICE}
            </Btn>
            <div className="flex items-baseline justify-center gap-3">
              <span className="text-gray-500 line-through text-lg">${SEPARATE_TOTAL}</span>
              <span className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</span>
              <span className="text-orange-300 text-sm font-semibold">Save ${BUNDLE_SAVINGS}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CARDS ── */}
      <section id="choose-setup" className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-3">Choose Your Setup</p>
          <h2 className="text-2xl font-bold text-center mb-8">Pick What's Right for You</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Saturn V */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.saturn} alt="Saturn V" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">Saturn V</h3>
              <p className="text-orange-400 font-bold text-2xl mb-2">${SATURN_V_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>56cm tall · 1:200 scale · PLA</p>
                <p>Press-fit kit · 30–60 min build</p>
                <p className="text-gray-300 mt-2">The rocket that took humanity to the Moon.</p>
              </div>
              <Btn type="saturn" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* SLS */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.sls} alt="SLS" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">SLS</h3>
              <p className="text-blue-400 font-bold text-2xl mb-2">${SLS_PRICE}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p>50cm tall · 1:200 scale · PLA</p>
                <p>Press-fit kit · 30–60 min build</p>
                <p className="text-gray-300 mt-2">The rocket taking humanity back to the Moon.</p>
              </div>
              <Btn type="sls" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Add to Cart
              </Btn>
            </div>

            {/* Bundle */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 h-52 mb-0">
                <div className="flex-1 rounded-xl overflow-hidden bg-black">
                  <ImageCarousel images={productCardImages.saturn} alt="Saturn V" height="h-full" onExpand={setLightboxImage} />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black">
                  <ImageCarousel images={productCardImages.sls} alt="SLS" height="h-full" onExpand={setLightboxImage} />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1 mt-4">Bundle</h3>
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

          {/* Payment methods */}
          <div className="flex flex-col items-center gap-2 mt-8">
            <p className="text-xs text-gray-600 uppercase tracking-widest">Secure checkout via Stripe Link</p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "Link"].map((m) => (
                <span key={m} className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 text-xs font-medium">{m}</span>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center mt-6 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>
        </div>
      </section>

      {/* ── STARSHIP TEASER / EMAIL CAPTURE ── */}
      <section className="py-12 px-6 border-t border-gray-800 bg-[#0f0f1a]">
        <div className="max-w-lg mx-auto text-center">
          {/* Starship teaser banner */}
          <div className="mb-8 p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase font-bold">Coming Soon</p>
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <ImageCarousel images={STARSHIP_GALLERY} alt="Starship" height="h-32" onExpand={setLightboxImage} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Starship V2 is Coming</h3>
            <p className="text-gray-400 text-sm">The most powerful rocket ever built. Be first in line when it drops.</p>
          </div>

          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">For Space Nerds Only</p>
          <h2 className="text-2xl font-bold mb-2">Get 10% Off + Early Access</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            Join the list and get a discount code instantly — plus you'll be the first to know when Starship and future drops go live.
          </p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-sm transition-all hover:scale-105 disabled:opacity-70 whitespace-nowrap">
                {emailLoading ? "Saving…" : "Get My Code"}
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
              <p className="text-gray-500 text-sm">10% off at checkout. We'll email you when Starship is live.</p>
              <button onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline">
                Shop now and use your code ↑
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
              I'm Jacob — aerospace engineering student, I help build real rocket engines. I couldn't find a high-quality model of a Saturn V that wasn't either a cheap toy or a $300 collector's piece, so I partnered with <strong className="text-white">kmobrain (AstroDesign 3D)</strong> and built a network of {MAKER_COUNT} local makers to print his designs on demand.
            </p>
            <p className="text-gray-400 text-xs italic">Every order supports a maker. Every rocket is quality-checked before it ships.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Questions, Answered</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-900/70 transition-colors">
                  <span className="font-semibold text-white pr-4 text-sm">{faq.q}</span>
                  <span className={`text-orange-400 text-xl flex-shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-300 text-sm leading-relaxed border-t border-gray-800 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <div className="flex justify-center mb-5"><ScarcityBadge /></div>
        <h2 className="text-3xl font-bold mb-3">Bring Apollo and Artemis Together</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
          Own both of the most iconic Moon rockets. Printed locally, shipped in {SHIPPING_DAYS}, quality guaranteed.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Bundle for ${BUNDLE_PRICE}
          </Btn>
          <div className="flex items-baseline gap-3">
            <span className="text-gray-500 line-through text-xl">${SEPARATE_TOTAL}</span>
            <span className="text-orange-400 font-bold text-3xl">${BUNDLE_PRICE}</span>
            <span className="text-orange-300 text-sm font-semibold">Save ${BUNDLE_SAVINGS}</span>
          </div>
        </div>
        <p className="text-gray-700 text-xs mt-12">© 2025 EX3D Prints · Designs by kmobrain (AstroDesign 3D)</p>
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