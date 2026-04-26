import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Product IDs
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// Pricing
const SATURN_V_PRICE   = 39;
const SLS_PRICE        = 30;
const BUNDLE_PRICE     = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL   = SATURN_V_PRICE + SLS_PRICE;
const BUNDLE_SAVINGS   = SEPARATE_TOTAL - BUNDLE_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";
const WEEKLY_LIMIT        = 40;

// Images
const SATURN_V_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg",
];
const SLS_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg",
];

const MAKER_COUNT  = 20;
const MAKER_STATES = 11;

// Ship-by date: today + 3 business days
function getShipByDate() {
  const d = new Date();
  let added = 0;
  while (added < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Swipeable image carousel
function ImageCarousel({ images, alt, height = "h-64", onExpand }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);
  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0
      ? setIdx((i) => (i + 1) % images.length)
      : setIdx((i) => (i - 1 + images.length) % images.length);
    touchStartX.current = null;
  };
  return (
    <div
      className={`relative w-full ${height} bg-black rounded-xl overflow-hidden group`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={images[idx]}
        alt={alt}
        className="w-full h-full object-contain cursor-zoom-in transition-opacity duration-300"
        onClick={() => onExpand(images[idx])}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &#8249;
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &#8250;
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                aria-label={`Go to image ${i + 1}`}
                className={`rounded-full transition-all ${i === idx ? "bg-orange-400 w-4 h-2" : "bg-white/40 w-2 h-2"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Payment methods strip
function PaymentMethods() {
  const methods = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "PayPal", "Shop Pay"];
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
      {methods.map((m) => (
        <span key={m} className="text-[10px] text-gray-500 border border-white/10 rounded px-2 py-0.5 bg-white/[0.02]">
          {m}
        </span>
      ))}
    </div>
  );
}

// Live weekly slots hook
function useWeeklySlotsLeft() {
  const [slotsLeft, setSlotsLeft] = useState(null);
  const [statesReached, setStatesReached] = useState(MAKER_STATES);

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
        const weekOrders = orders.filter(
          (o) => o.created_date && new Date(o.created_date) >= weekStart
        );
        setSlotsLeft(Math.max(0, WEEKLY_LIMIT - weekOrders.length));

        // Count unique states from shipping addresses this week
        const states = new Set(
          weekOrders
            .map((o) => o.shipping_address?.state)
            .filter(Boolean)
        );
        if (states.size > 0) setStatesReached(states.size);
      })
      .catch(() => setSlotsLeft(33));
  }, []);

  return { slotsLeft, statesReached };
}

const REVIEWS = [
  { quote: "Incredible detail.", name: "James R.", location: "Austin, TX", rocket: "Saturn V" },
  { quote: "Best rocket collectible I own.", name: "Marcus T.", location: "Denver, CO", rocket: "Moon Missions Collection" },
  { quote: "Every space fan needs one of these.", name: "Sarah K.", location: "Seattle, WA", rocket: "SLS" },
];

export default function RocketCollection() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const [productCardImages, setProductCardImages] = useState({
    saturn: SATURN_V_GALLERY,
    sls: SLS_GALLERY,
  });
  const { slotsLeft, statesReached } = useWeeklySlotsLeft();
  const shipByDate = getShipByDate();
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
      const saturnImg = Array.isArray(productCardImages.saturn) ? productCardImages.saturn[0] : productCardImages.saturn;
      const slsImg    = Array.isArray(productCardImages.sls)    ? productCardImages.sls[0]    : productCardImages.sls;

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
        const idx = cart.findIndex((i) => i.product_id === productId);
        if (idx >= 0) {
          cart[idx].unit_price = price;
          cart[idx].total_price = price * cart[idx].quantity;
          cart[idx].product_name = productName;
        } else {
          cart.push({
            id: `anon_${productId}_${Date.now()}`, product_id: productId, product_name: productName,
            quantity: 1, selected_material: "PLA", selected_color: "Shown Colors",
            unit_price: price, total_price: price, images: [imageUrl],
          });
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      };

      if (type === "saturn" || type === "bundle") {
        const name = type === "bundle" ? "Saturn V (Moon Missions Collection)" : "Saturn V";
        if (user) await upsertDB(SATURN_V_ID, name, SATURN_V_PRICE, saturnImg);
        else pushLocal(SATURN_V_ID, name, SATURN_V_PRICE, saturnImg);
      }
      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Moon Missions Collection)" : "SLS (Artemis)";
        if (user) await upsertDB(SLS_ID, slsName, slsPrice, slsImg);
        else pushLocal(SLS_ID, slsName, slsPrice, slsImg);
      }

      window.dispatchEvent(new Event("cartUpdated"));
      if (type === "bundle") toast({ title: "Added to Cart! 🚀", description: `Saturn V + SLS for $${BUNDLE_PRICE}` });
      setTimeout(() => { window.location.href = "/Cart"; }, type === "bundle" ? 600 : 0);
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(null);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" }); return;
    }
    setEmailLoading(true);
    try { await base44.entities.User.create({ email: email.trim().toLowerCase() }); } catch {}
    setEmailSubmitted(true);
    setEmailLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(EMAIL_DISCOUNT_CODE).then(() => {
      setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2500);
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

  const ScarcityBadge = () => {
    if (slotsLeft === null) return null;
    const urgent = slotsLeft <= 10;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide ${urgent ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${urgent ? "bg-red-400" : "bg-orange-400"}`} />
        {slotsLeft === 0 ? "Fully booked this week, back Monday" : `Only ${slotsLeft} weekly slots left`}
      </div>
    );
  };

  const faqs = [
    { q: "How long until my rocket arrives?",            a: `Order today and it ships by ${shipByDate}. Your model is printed by a maker near you, across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states. Shipped domestically, not from overseas.` },
    { q: "How hard is the assembly?",                    a: "The kits press-fit together. Most parts snap into place, with a small amount of super glue recommended for a few sections. No painting required. Typical build time is 30 to 60 minutes." },
    { q: "What if a part is missing or arrives damaged?",a: "Every kit is quality-checked by the maker before it ships. If anything is wrong when it arrives, email us and we will send replacement parts free of charge." },
    { q: "Who designs these rockets?",                   a: "The designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D Prints licenses the designs and handles printing and fulfillment through our maker network." },
    { q: "Can I return it?",                             a: "Because each kit is printed to order we do not accept returns for change of mind. If anything is wrong with what you received, we will make it right." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* LOGO TOP RIGHT */}
      <div className="relative z-50 w-full px-5 py-3 flex items-center justify-end border-b border-gray-800/50 bg-[#0a0a0f]">
        <img
          src="https://media.base44.com/images/public/68f40a023bb378f79ed78369/EX3DLogo.png"
          alt="EX3D Prints"
          className="h-7 object-contain"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-3">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-3">
            Own a Piece of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Space History
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-4 max-w-xl mx-auto leading-relaxed">
            Collector-grade Saturn V and SLS models. Built by an aerospace engineer, printed by independent makers, shipped to your door.
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-400 font-medium mb-4">
            {["Verified Maker Network", "Ships in 2-4 days", "Collector-Level Detail", "Free Reprint Guarantee"].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="text-orange-400">&#10003;</span> {t}
              </span>
            ))}
          </div>

          <div className="flex justify-center mb-5"><ScarcityBadge /></div>

          {/* Hero images with fetchpriority for LCP */}
          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-5 w-full px-2">
            {[
              { src: SATURN_V_GALLERY[0], alt: "Saturn V model kit",  label: "Saturn V · 22 inches", border: "border-orange-500/30" },
              { src: SLS_GALLERY[0],      alt: "SLS model kit",        label: "SLS · 19 inches",      border: "border-blue-500/30"   },
            ].map(({ src, alt, label, border }, i) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
                <button
                  onClick={() => setLightboxImage(src)}
                  className={`rounded-2xl overflow-hidden border ${border} shadow-2xl w-full aspect-[2/3] bg-black hover:opacity-90 transition-all`}
                >
                  <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-contain"
                    {...(i === 0 ? { fetchpriority: "high" } : { loading: "lazy" })}
                  />
                </button>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          

          
        </div>
      </section>


      {/* WHAT'S INCLUDED */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">The Moon Missions Collection</p>
          <h2 className="text-2xl font-bold mb-2">Two Missions. One Shelf.</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            The rocket that took humanity to the Moon. The rocket taking humanity back. Both at 1:200 scale, quality-checked before they ship, in your hands by {shipByDate}.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
            {[
              "Saturn V (22 inches)",
              "SLS (19 inches)",
              "Both at 1:200 scale",
              "Press-fit assembly kit",
              "30 to 60 min build",
              "No painting required",
              "Maker quality-check included",
              "Free reprint if anything is wrong",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-left">
                <span className="text-orange-400 mt-0.5 flex-shrink-0">&#10003;</span>
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCT CARDS */}
      <section id="choose-setup" className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Start Your Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Saturn V */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.saturn} alt="Saturn V model kit" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">Saturn V</h3>
              <p className="text-orange-400 font-bold text-2xl mb-1">${SATURN_V_PRICE}</p>
              <p className="text-gray-500 text-xs mb-3">Ships by {shipByDate}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p className="font-semibold text-gray-300">Specifications</p>
                <p>Height: 22 inches (56cm)</p>
                <p>Scale: 1:200</p>
                <p>Material: PLA</p>
                <p>Press-fit kit, 30 to 60 min build</p>
              </div>
              <Btn type="saturn" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Get Yours
              </Btn>
            </div>

            {/* SLS */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.sls} alt="SLS model kit" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">SLS</h3>
              <p className="text-blue-400 font-bold text-2xl mb-1">${SLS_PRICE}</p>
              <p className="text-gray-500 text-xs mb-3">Ships by {shipByDate}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p className="font-semibold text-gray-300">Specifications</p>
                <p>Height: 19 inches (50cm)</p>
                <p>Scale: 1:200</p>
                <p>Material: PLA</p>
                <p>Press-fit kit, 30 to 60 min build</p>
              </div>
              <Btn type="sls" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Get Yours
              </Btn>
            </div>

            {/* Bundle */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                Best Value
              </div>
              <div className="flex gap-2 h-52">
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={Array.isArray(productCardImages.saturn) ? productCardImages.saturn[0] : productCardImages.saturn}
                    alt="Saturn V"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={Array.isArray(productCardImages.sls) ? productCardImages.sls[0] : productCardImages.sls}
                    alt="SLS"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1 mt-4">Moon Missions Collection</h3>
              <div className="flex items-baseline gap-3 mb-1">
                <p className="text-gray-500 line-through">${SEPARATE_TOTAL}</p>
                <p className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-sm font-semibold mb-1">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-gray-500 text-xs mb-3">Ships by {shipByDate}</p>
              <p className="text-gray-400 text-sm flex-1">Both Moon rockets together. Apollo to Artemis. The full story at 1:200 scale.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get the Collection
              </Btn>
            </div>
          </div>
          
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-3">Collector Reviews</p>
          <h2 className="text-2xl font-bold text-center mb-8">What People Are Saying</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REVIEWS.map(({ quote, name, location, rocket }) => (
              <div key={name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-orange-400 text-sm">&#9733;</span>)}
                </div>
                <p className="text-white text-sm font-medium mb-3 leading-relaxed">"{quote}"</p>
                <p className="text-gray-400 text-xs">{name} · {location}</p>
                <p className="text-orange-400/70 text-xs">{rocket}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

{/* SHIPPED TO SPACE FANS */}
      <section className="py-6 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-orange-400 font-bold text-base mb-1">
                Shipped to space fans in {statesReached} states this week
              </p>
              <p className="text-gray-400 text-sm">
                {MAKER_COUNT} verified makers. Printed near you. Ships by {shipByDate}.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-300 text-xs font-bold whitespace-nowrap">
                {slotsLeft !== null ? `${slotsLeft} slots left` : "Limited weekly slots"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY EX3D */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Why Collectors Choose EX3D</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { title: "Verified Makers", desc: `${MAKER_COUNT} vetted makers across ${MAKER_STATES} states. Your model is printed by the one closest to you, inspected before it ships.` },
              { title: "Original Designs", desc: "Exclusively licensed from kmobrain (AstroDesign 3D). Not available anywhere else." },
              { title: "Collector-Grade Detail", desc: "Not a toy. Not a $300 collector piece. Accurate proportions, engine cluster detail, quality at a fair price." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-center">
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="rounded-xl overflow-hidden border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium"></th>
                  <th className="px-4 py-3 text-orange-400 font-bold">EX3D Prints</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Generic Etsy Shop</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Verified makers",               "Yes", "No"],
                  ["Original licensed designs",      "Yes", "No"],
                  ["Ships in 2 to 4 days",          "Yes", "No"],
                  ["Quality-checked before shipping","Yes", "No"],
                  ["Free reprint guarantee",         "Yes", "No"],
                  ["Collector mission cards",        "Coming soon", "No"],
                ].map(([label, ex, etsy]) => (
                  <tr key={label} className="border-b border-gray-800/50 bg-gray-900/20">
                    <td className="px-4 py-3 text-gray-300">{label}</td>
                    <td className="px-4 py-3 text-center text-green-400 font-semibold">{ex}</td>
                    <td className="px-4 py-3 text-center text-red-400">{etsy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE + STARSHIP TEASER */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-lg mx-auto text-center">

          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">Join the Launch Club</p>
          <h2 className="text-2xl font-bold mb-2">10% Off + First Access to Every Drop</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            Get a discount code right now, and be first to know when Starship, Space Shuttle, and future launches go live.
          </p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              />
              <button
                type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-sm transition-all hover:scale-105 disabled:opacity-70 whitespace-nowrap"
              >
                {emailLoading ? "Saving..." : "Join the Club"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-green-400 font-semibold">You're in! Here's your code:</p>
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
              <p className="text-gray-500 text-sm">10% off anything at checkout. We will email you when new rockets drop.</p>
              <button
                onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline"
              >
                Shop now and use your code
              </button>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8 items-center">
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-2">Built by a Rocket Engineer</p>
            <p className="text-gray-300 leading-relaxed text-sm mb-3">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I couldn't find rocket models worthy of the vehicles I admired, so I built a network of independent makers to produce the best ones available.
            </p>
            <p className="text-gray-300 leading-relaxed text-sm">
              Every model is designed by <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span>, printed by a verified maker near you, and quality-checked before it ships.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-2xl mx-auto">
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
                  <div className="px-5 pb-4 text-gray-300 text-sm leading-relaxed border-t border-gray-800 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <div className="flex justify-center mb-5"><ScarcityBadge /></div>
        <h2 className="text-3xl font-bold mb-2">The Moon. Then and Now.</h2>
        <p className="text-gray-400 mb-2 max-w-md mx-auto text-sm">
          Saturn V and SLS. Both at 1:200 scale. Printed by a maker near you, ships by {shipByDate}.
        </p>
        <p className="text-gray-600 text-xs mb-8">Free replacement parts if anything is wrong. Quality guaranteed.</p>
        <div className="flex flex-col items-center gap-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Moon Missions Collection ${BUNDLE_PRICE}
          </Btn>
          <div className="flex items-baseline gap-3 flex-wrap justify-center">
            <span className="text-gray-500 line-through text-xl">${SEPARATE_TOTAL}</span>
            <span className="text-orange-400 font-bold text-3xl">${BUNDLE_PRICE}</span>
            <span className="text-orange-300 text-sm font-semibold">Save ${BUNDLE_SAVINGS}</span>
          </div>
          <PaymentMethods />
          
        </div>
        
      </section>

      {/* LIGHTBOX */}
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
            &#x2715;
          </button>
        </div>
      )}
    </div>
  );
}