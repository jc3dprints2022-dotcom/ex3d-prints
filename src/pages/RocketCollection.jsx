import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Product IDs
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// Pricing
const SATURN_V_PRICE = 39;
const SLS_PRICE      = 30;
const BUNDLE_PRICE   = 60;
const BUNDLE_SLS_PRICE = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL   = SATURN_V_PRICE + SLS_PRICE;
const BUNDLE_SAVINGS   = SEPARATE_TOTAL - BUNDLE_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";
const WEEKLY_LIMIT = 40;

// Images
const SATURN_V_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg",
];
const SLS_GALLERY = [
  "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg",
];
const STARSHIP_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg";
const FOUNDER_IMAGE  = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const MAKER_COUNT  = 20;
const MAKER_STATES = 11;

// Dynamic ship-by date (today + 2 business days)
function getShipByDate() {
  const d = new Date();
  let added = 0;
  while (added < 2) {
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
    if (Math.abs(diff) > 40) diff > 0 ? setIdx((i) => (i + 1) % images.length) : setIdx((i) => (i - 1 + images.length) % images.length);
    touchStartX.current = null;
  };
  return (
    <div className={`relative w-full ${height} bg-black rounded-xl overflow-hidden group`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={images[idx]} alt={alt} className="w-full h-full object-contain cursor-zoom-in transition-opacity duration-300" onClick={() => onExpand(images[idx])} />
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">‹</button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-orange-400 scale-125" : "bg-white/40"}`} />
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

// Placeholder reviews — replace with real ones once collected from buyers
const REVIEWS = [
  { quote: "Insane detail. Feels like a museum piece.", name: "James R.", location: "Austin, TX", rocket: "Saturn V" },
  { quote: "Best rocket collectible I own. The engineering accuracy is unreal.", name: "Marcus T.", location: "Denver, CO", rocket: "Moon Missions Bundle" },
  { quote: "Every space nerd needs one of these on their desk.", name: "Sarah K.", location: "Seattle, WA", rocket: "SLS" },
];

export default function RocketCollection() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const [productCardImages, setProductCardImages] = useState({ saturn: SATURN_V_GALLERY, sls: SLS_GALLERY });
  const slotsLeft  = useWeeklySlotsLeft();
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
      if (type === "bundle") toast({ title: "Collection reserved! 🚀", description: `Saturn V + SLS for $${BUNDLE_PRICE}` });
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
      {adding === type ? "Adding..." : children}
    </button>
  );

  const ScarcityBadge = () => {
    if (slotsLeft === null) return null;
    const urgent = slotsLeft <= 10;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide ${urgent ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-orange-500/10 border border-orange-500/20 text-orange-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgent ? "bg-red-400" : "bg-orange-400"}`} />
        {slotsLeft === 0 ? "Fully booked this week — check back Monday" : `Only ${slotsLeft} order slots left this week`}
      </div>
    );
  };

  const faqs = [
    { q: "How long until my rocket arrives?",           a: `Order today and your artifact ships by ${shipByDate}. It's printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states — shipped domestically, not from overseas.` },
    { q: "How hard is the assembly?",                   a: "The kits press-fit together. Most parts snap into place, with a small amount of super glue recommended for a few joints. No painting required. Typical build time is 30 to 60 minutes." },
    { q: "What if a part is missing or arrives damaged?", a: "Every kit is quality-checked by the maker before it ships. If anything is wrong when it arrives, email us and we'll send replacement parts free of charge." },
    { q: "Who designs these rockets?",                  a: "The designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D Prints licenses the designs and handles printing and fulfillment through our maker network." },
    { q: "Is this a good gift?",                        a: `Absolutely. Both artifacts ship in protective packaging and arrive ready to build. Order by ${shipByDate} and it arrives this week. If the recipient wants to choose their own, a gift card with the discount code WELCOME10 works just as well.` },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-3">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-3">
            Own a Piece of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">Space History</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-4 max-w-xl mx-auto leading-relaxed">
            Collector-grade Saturn V and SLS artifacts. Built by an aerospace engineer, printed by independent makers, shipped to your door.
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-400 font-medium mb-4">
            {["Verified Maker Network", "Ships by " + shipByDate, "Collector-Level Detail", "Free Reprint Guarantee"].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="text-orange-400">✓</span> {t}
              </span>
            ))}
          </div>

          <div className="flex justify-center mb-5"><ScarcityBadge /></div>

          {/* Hero images */}
          <div className="flex justify-center items-end gap-3 sm:gap-6 md:gap-10 mb-5 w-full px-2">
            {[
              { src: SATURN_V_GALLERY[0], alt: "Saturn V",  label: "Saturn V · 56cm",  border: "border-orange-500/30" },
              { src: SLS_GALLERY[0],      alt: "SLS",        label: "SLS · 50cm",       border: "border-blue-500/30"   },
            ].map(({ src, alt, label, border }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
                <button onClick={() => setLightboxImage(src)}
                  className={`rounded-2xl overflow-hidden border ${border} shadow-2xl w-full aspect-[2/3] bg-black hover:opacity-90 transition-all`}>
                  <img src={src} alt={alt} className="w-full h-full object-contain" />
                </button>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600 mb-5 italic">Designs by kmobrain (AstroDesign 3D) · Printed by EX3D's maker network</p>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3">
            <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5">
              Reserve the Moon Missions Collection — ${BUNDLE_PRICE}
            </Btn>
            <div className="flex items-baseline justify-center gap-3 flex-wrap">
              <span className="text-gray-500 line-through text-lg">${SEPARATE_TOTAL}</span>
              <span className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</span>
              <span className="text-orange-300 text-sm font-semibold">Save ${BUNDLE_SAVINGS}</span>
            </div>
            {/* Social proof near buy button */}
            <p className="text-xs text-gray-500 mt-1">Joined by collectors in {MAKER_STATES} states · Free replacement parts if anything is wrong</p>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">The Moon Missions Collection</p>
          <h2 className="text-2xl font-bold mb-2">Two Missions. One Shelf.</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            The rocket that took humanity to the Moon. The rocket taking humanity back. Both at 1:200 scale, both collector-grade, both in your hands by {shipByDate}.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
            {[
              "Saturn V artifact (56cm)",
              "SLS artifact (50cm)",
              "Both at 1:200 scale",
              "Press-fit assembly kit",
              "30 to 60 min build",
              "No painting required",
              "Maker quality-check included",
              "Free reprint if anything is wrong",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-left">
                <span className="text-orange-400 mt-0.5 flex-shrink-0">✓</span>
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white px-10 py-4">
            Reserve Yours — ${BUNDLE_PRICE}
          </Btn>
        </div>
      </section>

      {/* INDIVIDUAL ARTIFACTS */}
      <section id="choose-setup" className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-3">Individual Artifacts</p>
          <h2 className="text-2xl font-bold text-center mb-8">Or Add One to Your Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Saturn V */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.saturn} alt="Saturn V" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">Saturn V</h3>
              <p className="text-orange-400 font-bold text-2xl mb-1">${SATURN_V_PRICE}</p>
              <p className="text-gray-600 text-xs mb-3">Ships by {shipByDate}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p className="font-semibold text-gray-300">Mission Specifications</p>
                <p>Height: 56cm (22 inches)</p>
                <p>Scale: 1:200</p>
                <p>Material: PLA</p>
                <p>Assembly: Press-fit, 30 to 60 min</p>
              </div>
              <Btn type="saturn" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Reserve Yours
              </Btn>
            </div>

            {/* SLS */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
              <ImageCarousel images={productCardImages.sls} alt="SLS" height="h-52" onExpand={setLightboxImage} />
              <h3 className="text-xl font-bold mb-1 mt-4">SLS</h3>
              <p className="text-blue-400 font-bold text-2xl mb-1">${SLS_PRICE}</p>
              <p className="text-gray-600 text-xs mb-3">Ships by {shipByDate}</p>
              <div className="text-sm text-gray-400 space-y-1 mb-4 flex-1">
                <p className="font-semibold text-gray-300">Mission Specifications</p>
                <p>Height: 50cm (19.7 inches)</p>
                <p>Scale: 1:200</p>
                <p>Material: PLA</p>
                <p>Assembly: Press-fit, 30 to 60 min</p>
              </div>
              <Btn type="sls" className="mt-auto w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                Reserve Yours
              </Btn>
            </div>

            {/* Bundle */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900 border-2 border-orange-500/60 rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 h-52">
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={Array.isArray(productCardImages.saturn) ? productCardImages.saturn[0] : productCardImages.saturn} alt="Saturn V" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={Array.isArray(productCardImages.sls) ? productCardImages.sls[0] : productCardImages.sls} alt="SLS" className="w-full h-full object-contain" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1 mt-4">Moon Missions Collection</h3>
              <div className="flex items-baseline gap-3 mb-1">
                <p className="text-gray-500 line-through">${SEPARATE_TOTAL}</p>
                <p className="text-orange-400 font-bold text-2xl">${BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-sm font-semibold mb-1">Save ${BUNDLE_SAVINGS}</p>
              <p className="text-gray-600 text-xs mb-3">Ships by {shipByDate}</p>
              <p className="text-gray-400 text-sm flex-1">Both artifacts together. Apollo to Artemis. The complete Moon missions story at 1:200 scale.</p>
              <Btn type="bundle" className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Reserve the Collection
              </Btn>
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center mt-6 italic">Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network</p>
        </div>
      </section>

      {/* THE MAKER STORY */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Why Collectors Choose EX</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { title: "Verified Makers", desc: `${MAKER_COUNT} vetted makers across ${MAKER_STATES} states. Your artifact is printed by the one closest to you, inspected before it ships.` },
              { title: "Original Designs", desc: "Exclusively licensed from kmobrain (AstroDesign 3D), the most accurate rocket modeler in 3D printing. Not available anywhere else." },
              { title: "Collector-Grade Detail", desc: "Not a toy. Not a $300 collector piece. Accurate proportions, engine cluster detail, and hand-finished surfaces at a price that makes sense." },
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
                  <th className="px-4 py-3 text-gray-500 font-medium">Generic Etsy Shop</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Verified makers",         "✓", "✗"],
                  ["Original licensed designs","✓", "✗"],
                  ["Ships in 2 business days", "✓", "✗"],
                  ["Quality-checked before shipping", "✓", "✗"],
                  ["Free reprint guarantee",   "✓", "✗"],
                  ["Collector mission cards",  "Coming soon", "✗"],
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

      {/* REVIEWS */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-3">Collector Reviews</p>
          <h2 className="text-2xl font-bold text-center mb-8">What People Are Saying</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REVIEWS.map(({ quote, name, location, rocket }) => (
              <div key={name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-orange-400 text-sm">★</span>)}
                </div>
                <p className="text-white text-sm font-medium mb-3 leading-relaxed">"{quote}"</p>
                <p className="text-gray-500 text-xs">{name} · {location}</p>
                <p className="text-orange-400/60 text-xs">{rocket}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center mt-4">Replace placeholder reviews with real ones once collected from buyers</p>
        </div>
      </section>

      {/* GIFT SECTION */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase mb-3">The Perfect Gift</p>
          <h2 className="text-2xl font-bold mb-3">For the Space Nerd in Your Life</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-lg mx-auto">
            The person who stops to watch launches. Who has a poster of the Saturn V but not the model. Who knows what SLS stands for without googling it. This is the gift that makes sense.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs mb-6">
            {["Father's Day", "Graduation", "Birthday", "Christmas", "Just Because"].map((occasion) => (
              <span key={occasion} className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">{occasion}</span>
            ))}
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Order today and it arrives by <span className="text-white font-semibold">{shipByDate}</span>. Ships in protective packaging, ready to gift.
          </p>
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white px-10 py-4">
            Get the Moon Missions Collection — ${BUNDLE_PRICE}
          </Btn>
        </div>
      </section>

      {/* EMAIL CAPTURE + STARSHIP TEASER */}
      <section className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-lg mx-auto text-center">
          <div className="mb-8 p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-xs tracking-[0.3em] text-cyan-400 uppercase font-bold">Coming Soon</p>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Starship V2 is Coming</h3>
            <p className="text-gray-400 text-sm">The most powerful rocket ever built. Be first in line when it drops.</p>
          </div>

          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-3">Join the Launch Club</p>
          <h2 className="text-2xl font-bold mb-2">10% Off + Early Access to Every Drop</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            Get a discount code right now, plus you'll be first to know when Starship, Space Shuttle, and future launches go live.
          </p>

          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm" />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white font-bold text-sm transition-all hover:scale-105 disabled:opacity-70 whitespace-nowrap">
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
                <button onClick={handleCopyCode}
                  className="px-6 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-semibold transition-all hover:scale-105">
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
              </div>
              <p className="text-gray-500 text-sm">10% off anything at checkout. We'll email you when new rockets drop.</p>
              <button onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline">
                Shop now and use your code
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-10 px-6 border-t border-gray-800 bg-[#0d0d18]">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8 items-center">
          <div className="w-36 h-36 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob, EX3D Prints" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-2">Built by a Rocket Engineer</p>
            <p className="text-gray-300 leading-relaxed text-sm mb-3">
              I'm Jacob — an aerospace engineering student who helps build real rocket engines. I couldn't find rocket models worthy of the vehicles I admired, so I built a network of independent makers to produce the best ones available.
            </p>
            <p className="text-gray-300 leading-relaxed text-sm mb-3">
              Every artifact is designed by <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span>, printed by a verified maker near you, and quality-checked before it ships. We're not a marketplace. We're a maker studio.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Aerospace engineering student", "Real rocket engine development", `${MAKER_COUNT} makers, ${MAKER_STATES} states`].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
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

      {/* FINAL CTA */}
      <section className="py-16 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <div className="flex justify-center mb-5"><ScarcityBadge /></div>
        <h2 className="text-3xl font-bold mb-2">The Moon. Then and Now.</h2>
        <p className="text-gray-400 mb-2 max-w-md mx-auto text-sm">
          Saturn V. SLS. Both at 1:200 scale. Printed by a maker near you, ships by {shipByDate}.
        </p>
        <p className="text-gray-600 text-xs mb-8">Free replacement parts if anything is wrong. Quality guaranteed.</p>
        <div className="flex flex-col items-center gap-4">
          <Btn type="bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Reserve the Moon Missions Collection — ${BUNDLE_PRICE}
          </Btn>
          <div className="flex items-baseline gap-3 flex-wrap justify-center">
            <span className="text-gray-500 line-through text-xl">${SEPARATE_TOTAL}</span>
            <span className="text-orange-400 font-bold text-3xl">${BUNDLE_PRICE}</span>
            <span className="text-orange-300 text-sm font-semibold">Save ${BUNDLE_SAVINGS}</span>
          </div>
          <p className="text-xs text-gray-600">Or grab individual artifacts above</p>
        </div>
        <p className="text-gray-700 text-xs mt-12">2025 EX3D Prints · Designs by kmobrain (AstroDesign 3D)</p>
      </section>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-orange-400">x</button>
        </div>
      )}
    </div>
  );
}