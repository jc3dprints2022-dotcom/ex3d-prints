import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ── PRODUCT IDs ───────────────────────────────────────────────────────────────
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";
// Starship ID is looked up dynamically by name at runtime (see useEffect below)

// ── PRICING ───────────────────────────────────────────────────────────────────
const SATURN_V_PRICE  = 39;
const SLS_PRICE       = 30;
const STARSHIP_PRICE  = 20;

// Moon Missions bundle: Saturn V + SLS
const MOON_BUNDLE_PRICE     = 60;
const MOON_BUNDLE_SEPARATE  = SATURN_V_PRICE + SLS_PRICE; // $69
const MOON_BUNDLE_SAVINGS   = MOON_BUNDLE_SEPARATE - MOON_BUNDLE_PRICE; // $9
const MOON_BUNDLE_SLS_PRICE = MOON_BUNDLE_PRICE - SATURN_V_PRICE; // $21

// Heavy-Lift Bundle: Saturn V + SLS + Starship V2
const GIANTS_BUNDLE_PRICE    = 75;
const GIANTS_BUNDLE_SEPARATE = SATURN_V_PRICE + SLS_PRICE + STARSHIP_PRICE; // $89
const GIANTS_BUNDLE_SAVINGS  = GIANTS_BUNDLE_SEPARATE - GIANTS_BUNDLE_PRICE; // $14
const GIANTS_SATURN_PRICE    = SATURN_V_PRICE; // $39
const GIANTS_SLS_PRICE       = 16;
const GIANTS_STARSHIP_PRICE  = GIANTS_BUNDLE_PRICE - GIANTS_SATURN_PRICE - GIANTS_SLS_PRICE; // $20

// ── DISCOUNT CODE ─────────────────────────────────────────────────────────────
const EMAIL_DISCOUNT_CODE = "WELCOME10";

// ── IMAGES ───────────────────────────────────────────────────────────────────
const SATURN_V_HERO = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_HERO      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";
const STARSHIP_HERO = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg";

const SATURN_V_GALLERY = [];
const SLS_GALLERY      = [];

const CORE_STAGE_SCHEMATIC = "";
const SRB_SCHEMATIC        = "";

const SATURN_V_IMAGE = SATURN_V_HERO || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE      = SLS_HERO      || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

// ── STATS ────────────────────────────────────────────────────────────────────
const SHIPPING_DAYS = "2-4 days per item";
const MAKER_COUNT   = 19;
const MAKER_STATES  = 11;

export default function SaturnV() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const [starshipId, setStarshipId]         = useState(null);
  const starshipImage = STARSHIP_HERO; // hardcoded, never overwritten by DB
  const { toast } = useToast();

  // Look up Starship product ID by name
  useEffect(() => {
    base44.entities.Product.filter({ status: "active" })
      .then((products) => {
        const starship = products.find((p) => p.name?.toLowerCase().includes("starship"));
        if (starship) {
          setStarshipId(starship.id);
        }
      })
      .catch(console.error);
  }, []);

  // ── ADD TO CART ─────────────────────────────────────────────────────────────
  // Logged-in: saved to DB. Guest: saved to localStorage so Cart page can show them.
  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      // Build the list of items for this button press
      const itemsToAdd = [];
      if (type === "saturn")   itemsToAdd.push({ product_id: SATURN_V_ID, product_name: "Saturn V",                              price: SATURN_V_PRICE,      image: SATURN_V_IMAGE });
      if (type === "sls")      itemsToAdd.push({ product_id: SLS_ID,      product_name: "SLS (Artemis)",                          price: SLS_PRICE,           image: SLS_IMAGE });
      if (type === "starship") itemsToAdd.push({ product_id: starshipId,  product_name: "Starship V2",                            price: STARSHIP_PRICE,      image: starshipImage });
      if (type === "moon_bundle") {
        itemsToAdd.push({ product_id: SATURN_V_ID, product_name: "Saturn V (Moon Missions Bundle)",  price: SATURN_V_PRICE,      image: SATURN_V_IMAGE });
        itemsToAdd.push({ product_id: SLS_ID,      product_name: "SLS (Moon Missions Bundle)",        price: MOON_BUNDLE_SLS_PRICE, image: SLS_IMAGE });
      }
      if (type === "giants_bundle") {
        itemsToAdd.push({ product_id: SATURN_V_ID, product_name: "Saturn V (Heavy-Lift Bundle)",     price: GIANTS_SATURN_PRICE,  image: SATURN_V_IMAGE });
        itemsToAdd.push({ product_id: SLS_ID,      product_name: "SLS (Heavy-Lift Bundle)",           price: GIANTS_SLS_PRICE,     image: SLS_IMAGE });
        itemsToAdd.push({ product_id: starshipId,  product_name: "Starship V2 (Heavy-Lift Bundle)",  price: GIANTS_STARSHIP_PRICE, image: starshipImage });
      }

      if (user) {
        // Logged-in: upsert each item into DB cart
        for (const item of itemsToAdd) {
          if (!item.product_id) continue;
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
              images: item.image ? [item.image] : [],
            });
          }
        }
      } else {
        // Guest: write to localStorage so Cart page displays items without login
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        for (const item of itemsToAdd) {
          if (!item.product_id) continue;
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
              images: item.image ? [item.image] : [],
            });
          }
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      }

      window.dispatchEvent(new Event("cartUpdated"));

      if (type === "moon_bundle")   toast({ title: "Moon Missions added!",    description: `Saturn V + SLS for $${MOON_BUNDLE_PRICE}` });
      if (type === "giants_bundle") toast({ title: "Heavy-Lift Bundle added!", description: `All three for $${GIANTS_BUNDLE_PRICE}` });

      const isBundle = type === "moon_bundle" || type === "giants_bundle";
      setTimeout(() => { window.location.href = "/Cart"; }, isBundle ? 600 : 0);
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

  const GalleryThumb = ({ src, alt }) => (
    <button
      onClick={() => setLightboxImage(src)}
      className="rounded-xl overflow-hidden border border-gray-800 w-28 h-28 sm:w-36 sm:h-36 bg-gray-900 flex items-center justify-center hover:border-orange-500/60 transition-all hover:scale-105"
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </button>
  );

  const faqs = [
    { q: "How long until my rocket arrives?",  a: `Most orders ship within ${SHIPPING_DAYS}. Your rocket is printed by a maker near you across our network of ${MAKER_COUNT} makers in ${MAKER_STATES} states, shipped domestically, not from overseas.` },
    { q: "How hard is the assembly?",          a: "The kits press-fit together. Most parts snap into place, and a small amount of super glue is recommended for a few joints. No painting required. Typical build time is 30 to 60 minutes." },
    { q: "What if a part arrives damaged?",    a: "Every kit is quality-checked before it ships. If anything is wrong, email us and we will send replacement parts free of charge." },
    { q: "Who designs these rockets?",         a: "The designs are by kmobrain (AstroDesign 3D), one of the most accurate rocket modelers in 3D printing. EX3D Prints licenses the designs and handles printing and fulfillment through our maker network." },
    { q: "Can I return it?",                   a: "Because each kit is printed to order we don't accept returns for change of mind. If anything is wrong with what you received we will make it right." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Toaster />

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-10 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a2e_0%,_#0a0a0f_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-4">EX3D Prints · Rocket Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4">
            The Most Iconic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Rockets Ever Made.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-3 max-w-2xl mx-auto leading-relaxed">
            Precision-printed Saturn V, SLS, and Starship V2 model kits. Designed by aerospace nerds, printed by {MAKER_COUNT} makers across {MAKER_STATES} states.
          </p>
          <p className="text-sm text-orange-400 font-semibold mb-8 tracking-wide">
            Ships in {SHIPPING_DAYS} · Printed locally · Quality guaranteed
          </p>

          {/* Three hero rockets — object-cover so images FILL the frame */}
          <div className="flex justify-center items-end gap-2 sm:gap-4 md:gap-6 mb-6 w-full px-2">
            {[
              { src: SATURN_V_IMAGE, alt: "Saturn V",    label: "Saturn V · 56cm",  shadow: "shadow-orange-900/20", border: "hover:border-orange-500/40" },
              { src: SLS_IMAGE,      alt: "SLS",          label: "SLS · 50cm",       shadow: "shadow-blue-900/20",   border: "hover:border-blue-500/40"   },
              { src: starshipImage,  alt: "Starship V2",  label: "Starship V2",      shadow: "shadow-cyan-900/20",   border: "hover:border-cyan-500/40"   },
            ].map(({ src, alt, label, shadow, border }) => (
              <div key={label} className="flex flex-col items-center min-w-0 flex-1 max-w-[160px] sm:max-w-[200px] md:max-w-[260px]">
                <button
                  onClick={() => setLightboxImage(src)}
                  className={`rounded-2xl overflow-hidden border border-gray-700 shadow-2xl ${shadow} w-full h-[220px] sm:h-[320px] md:h-[420px] ${border} transition-all`}
                >
                  {/* object-cover: image fills the frame, cropped to fit */}
                  <img src={src} alt={alt} className="w-full h-full object-cover" />
                </button>
                <p className="text-xs sm:text-sm text-gray-300 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3">
            <Btn type="giants_bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-lg px-12 py-5">
              Get the Heavy-Lift Bundle for ${GIANTS_BUNDLE_PRICE}
            </Btn>
            <div className="flex items-baseline justify-center gap-2 sm:gap-4 flex-wrap px-4">
              <span className="text-gray-500 line-through text-base">${GIANTS_BUNDLE_SEPARATE}</span>
              <span className="text-2xl font-bold text-orange-400">${GIANTS_BUNDLE_PRICE}</span>
              <span className="text-xs text-orange-300 font-semibold">Save ${GIANTS_BUNDLE_SAVINGS}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── DETAIL GALLERY ── */}
      {(SATURN_V_GALLERY.filter(Boolean).length > 0 || SLS_GALLERY.filter(Boolean).length > 0) && (
        <section className="py-16 px-6 bg-[#0f0f1a] border-t border-gray-800">
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
          </div>
        </section>
      )}

      {/* ── PRODUCT CARDS ── */}
      <section id="choose-setup" className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Choose Your Setup</p>
          <h2 className="text-3xl font-bold text-center mb-10">Pick What's Right for You</h2>

          {/* Individual rockets — object-contain here so full rocket shows in card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[
              { type: "saturn",   image: SATURN_V_IMAGE, name: "Saturn V",    price: SATURN_V_PRICE,  color: "text-orange-400", spec: "56cm · 1:200", desc: "The rocket that took humanity to the Moon." },
              { type: "sls",      image: SLS_IMAGE,      name: "SLS",          price: SLS_PRICE,       color: "text-blue-400",   spec: "50cm · 1:200", desc: "Taking humanity back to the Moon." },
              { type: "starship", image: starshipImage,  name: "Starship V2",  price: STARSHIP_PRICE,  color: "text-cyan-400",   spec: "26cm · 1:200", desc: "The most powerful rocket ever built." },
            ].map(({ type, image, name, price, color, spec, desc }) => (
              <div key={type} className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col">
                <div className="rounded-xl overflow-hidden mb-4 bg-black h-52 flex items-center justify-center flex-shrink-0">
                  <img src={image} alt={name} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-lg font-bold mb-1">{name}</h3>
                <p className={`${color} font-bold text-xl mb-2`}>${price}</p>
                <p className="text-xs text-gray-500 mb-1">{spec} · PLA · Press-fit kit</p>
                <p className="text-sm text-gray-400 flex-1 mb-4">{desc}</p>
                <Btn type={type} className="mt-auto w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm">
                  Add to Cart
                </Btn>
              </div>
            ))}
          </div>

          {/* Two bundles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Moon Missions */}
            <div className="bg-gray-900/80 border border-orange-500/40 rounded-2xl p-5 flex flex-col">
              <div className="flex gap-2 mb-4 h-36 flex-shrink-0">
                {[SATURN_V_IMAGE, SLS_IMAGE].map((src, i) => (
                  <div key={i} className="flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <img src={src} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
              <h3 className="text-base font-bold mb-1">Moon Missions Bundle</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-gray-500 line-through text-sm">${MOON_BUNDLE_SEPARATE}</p>
                <p className="text-orange-400 font-bold text-xl">${MOON_BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-xs font-semibold mb-2">Save ${MOON_BUNDLE_SAVINGS}</p>
              <p className="text-gray-400 text-sm flex-1 mb-4">Saturn V plus SLS. Apollo to Artemis. Both Moon rockets at 1:200 scale.</p>
              <Btn type="moon_bundle" className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm">
                Get Moon Missions for ${MOON_BUNDLE_PRICE}
              </Btn>
            </div>

            {/* Heavy-Lift Bundle — object-cover so images fill each slot */}
            <div className="bg-gradient-to-b from-orange-900/30 to-gray-900/80 border-2 border-orange-500/70 rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Best Value</div>
              <div className="flex gap-2 mb-4 h-36 flex-shrink-0">
                {[SATURN_V_IMAGE, SLS_IMAGE, starshipImage].map((src, i) => (
                  <div key={i} className="flex-1 rounded-xl overflow-hidden bg-black">
                    {/* object-cover: each slot is fully filled */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <h3 className="text-base font-bold mb-1">Heavy-Lift Bundle</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-gray-500 line-through text-sm">${GIANTS_BUNDLE_SEPARATE}</p>
                <p className="text-orange-400 font-bold text-xl">${GIANTS_BUNDLE_PRICE}</p>
              </div>
              <p className="text-orange-300 text-xs font-semibold mb-2">Save ${GIANTS_BUNDLE_SAVINGS}</p>
              <p className="text-gray-400 text-sm flex-1 mb-4">Saturn V, SLS, and Starship V2. The three most powerful rockets ever built, all at 1:200 scale.</p>
              <Btn type="giants_bundle" className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-sm font-bold">
                Get the Heavy-Lift Bundle for ${GIANTS_BUNDLE_PRICE}
              </Btn>
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center mt-5 italic">
            Designs by kmobrain (AstroDesign 3D) · Printed and shipped by EX3D's maker network
          </p>
        </div>
      </section>

      {/* ── SCHEMATICS ── */}
      {(CORE_STAGE_SCHEMATIC || SRB_SCHEMATIC) && (
        <section className="py-16 px-6 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.4em] text-orange-400 uppercase text-center mb-4">Engineering</p>
            <h2 className="text-3xl font-bold text-center mb-4">Designed Part by Part</h2>
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
      <section className="py-16 px-6 border-t border-gray-800 bg-[#0f0f1a]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">For Space Nerds Only</p>
          <h2 className="text-3xl font-bold mb-4">Get 10% Off Your First Order</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Join the list for early access to new rocket drops and a discount code right now.
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
                {emailLoading ? "Saving..." : "Get My Code"}
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
              <p className="text-gray-500 text-sm">10% off anything at checkout. Apply it to any rocket or bundle.</p>
              <button
                onClick={() => document.getElementById("choose-setup")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-block text-orange-400 hover:text-orange-300 text-sm font-semibold underline"
              >
                Shop now
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-10 items-center">
          <div className="w-44 h-44 flex-shrink-0 rounded-full border-2 border-orange-500/40 overflow-hidden mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob, EX3D Prints" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-orange-400 uppercase mb-3">Why EX3D Prints Exists</p>
            <p className="text-gray-300 leading-relaxed text-base mb-4">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I wanted high-quality models of the greatest rockets ever made, and everything I could find was either a cheap plastic toy or a $300 collector's piece.
            </p>
            <p className="text-gray-300 leading-relaxed text-base">
              So I teamed up with <span className="text-white font-semibold">kmobrain (AstroDesign 3D)</span> and built a network of {MAKER_COUNT} independent makers across {MAKER_STATES} states to print his designs on demand. High-quality models, printed by real people, shipped fast.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-teal-400 uppercase text-center mb-4">Before You Buy</p>
          <h2 className="text-3xl font-bold text-center mb-10">Questions, Answered</h2>
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
      <section className="py-20 px-6 text-center bg-gradient-to-t from-[#1a0a00] to-transparent border-t border-gray-800">
        <p className="text-xs tracking-[0.4em] text-orange-400 uppercase mb-4">Ready?</p>
        <h2 className="text-4xl font-bold mb-4">The Heavy-Lift Bundle.</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Saturn V, SLS, and Starship V2. All at 1:200 scale. Printed by a maker near you and shipped in {SHIPPING_DAYS}.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Btn type="giants_bundle" className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-yellow-400 text-white text-xl px-14 py-6 shadow-xl shadow-orange-900/50">
            Get the Heavy-Lift Bundle for ${GIANTS_BUNDLE_PRICE}
          </Btn>
          <div className="flex items-baseline justify-center gap-3 flex-wrap">
            <span className="text-gray-500 line-through">${GIANTS_BUNDLE_SEPARATE}</span>
            <span className="text-3xl font-bold text-orange-400">${GIANTS_BUNDLE_PRICE}</span>
            <span className="text-sm text-orange-300 font-semibold">Save ${GIANTS_BUNDLE_SAVINGS}</span>
          </div>
        </div>
        <p className="text-gray-700 text-xs mt-12">
          2025 EX3D Prints · Jacob L. · Designs by kmobrain (AstroDesign 3D)
        </p>
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