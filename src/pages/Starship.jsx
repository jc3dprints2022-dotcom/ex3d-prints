import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Pricing
const STARSHIP_PRICE = 20;
const EMAIL_DISCOUNT_CODE = "WELCOME10";
const WEEKLY_LIMIT = 20;
const SHIPPING_DAYS = "2 days";
const MAKER_COUNT = 20;

const HERO_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg";
const SATURN_V_IMG = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_IMG = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";
const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

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
      .catch(() => setSlotsLeft(12));
  }, []);
  return slotsLeft;
}

const ScarcityBadge = ({ slotsLeft }) => {
  if (slotsLeft === null) return null;
  const urgent = slotsLeft <= 5;
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide ${urgent ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgent ? "bg-red-400" : "bg-cyan-400"}`} />
      {slotsLeft === 0 ? "Fully booked this week — check back Monday" : `Only ${slotsLeft} order slots left this week`}
    </div>
  );
};

export default function Starship() {
  const [adding, setAdding] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [starshipProductId, setStarshipProductId] = useState(null);
  const slotsLeft = useWeeklySlotsLeft();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Product.filter({ status: "active" })
      .then((products) => {
        const starship = products.find((p) => p.name?.toLowerCase().includes("starship"));
        if (starship) setStarshipProductId(starship.id);
      })
      .catch(console.error);
  }, []);

  const addToCart = async () => {
    setAdding(true);
    try {
      const user = await base44.auth.me().catch(() => null);

      if (user) {
        const existing = await base44.entities.Cart.filter({ user_id: user.id, product_id: starshipProductId || "starship" });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: STARSHIP_PRICE,
            total_price: STARSHIP_PRICE * existing[0].quantity,
            product_name: "Starship V2",
          });
        } else {
          await base44.entities.Cart.create({
            user_id: user.id,
            product_id: starshipProductId || "starship_placeholder",
            product_name: "Starship V2",
            quantity: 1,
            selected_material: "PLA",
            selected_color: "Shown Colors",
            unit_price: STARSHIP_PRICE,
            total_price: STARSHIP_PRICE,
            images: [HERO_IMAGE],
          });
        }
      } else {
        const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
        const idx = cart.findIndex((i) => i.product_id === (starshipProductId || "starship_placeholder"));
        if (idx >= 0) {
          cart[idx].unit_price = STARSHIP_PRICE;
          cart[idx].total_price = STARSHIP_PRICE * cart[idx].quantity;
          cart[idx].product_name = "Starship V2";
        } else {
          cart.push({
            id: `anon_starship_${Date.now()}`,
            product_id: starshipProductId || "starship_placeholder",
            product_name: "Starship V2",
            quantity: 1,
            selected_material: "PLA",
            selected_color: "Shown Colors",
            unit_price: STARSHIP_PRICE,
            total_price: STARSHIP_PRICE,
            images: [HERO_IMAGE],
          });
        }
        localStorage.setItem("anonymousCart", JSON.stringify(cart));
      }

      window.dispatchEvent(new Event("cartUpdated"));
      setTimeout(() => { window.location.href = "/Cart"; }, 400);
    } catch {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
    setAdding(false);
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

  const faqs = [
    { q: "How long until it arrives?",         a: `Most orders ship within ${SHIPPING_DAYS}. Printed by a maker near you, not shipped from overseas.` },
    { q: "How hard is assembly?",              a: "Parts press-fit together. A little super glue on a few sections makes it rock-solid. No painting required. About 30 to 60 minutes." },
    { q: "What if something arrives damaged?", a: "Email us. We send replacement parts free. No return shipping needed." },
    { q: "Who designed the Starship model?",   a: "The Starship V2 design is by kmobrain (AstroDesign 3D), recognized as one of the most dimensionally accurate rocket modelers in 3D printing. EX3D prints and fulfills his designs." },
    { q: "Can I return it?",                   a: "Because each kit is printed to order we do not accept returns for change of mind. If anything is wrong with what you received, we will make it right." },
  ];

  const collectionRockets = [
    { name: "Saturn V", label: "Apollo · 56cm · 1:200", color: "text-orange-400", border: "border-orange-500/30", img: SATURN_V_IMG },
    { name: "SLS",      label: "Artemis · 50cm · 1:200", color: "text-blue-400",  border: "border-blue-500/30",   img: SLS_IMG },
    { name: "Starship V2", label: "SpaceX · 26cm · 1:200", color: "text-cyan-400", border: "border-cyan-500/30",  img: HERO_IMAGE },
  ];

  return (
    <div className="min-h-screen bg-[#050a12] text-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Toaster />

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center px-5 text-center overflow-hidden pt-10 pb-10">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, #0c2035 0%, #050a12 65%)" }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle, rgba(34,211,238,0.9) 1px, transparent 1px)", backgroundSize: "55px 55px" }} />
        <div className="relative z-10 max-w-3xl mx-auto w-full">
          <p className="text-[10px] tracking-[0.45em] text-cyan-400/70 uppercase mb-4">EX3D Prints · Starship Collection</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] mb-4 tracking-tight">
            The Most Powerful<br />
            <span style={{ background: "linear-gradient(90deg, #22d3ee, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Rocket Ever Built.
            </span>
          </h1>
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs text-gray-500 mb-5 flex-wrap">
            <span className="flex items-center gap-1"><span className="text-cyan-400">✦</span> Ships in {SHIPPING_DAYS}</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400">✦</span> Printed locally in the US</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400">✦</span> Free replacement parts</span>
            <span className="flex items-center gap-1"><span className="text-cyan-400">✦</span> {MAKER_COUNT} vetted makers</span>
          </div>
          <div className="flex justify-center mb-6"><ScarcityBadge slotsLeft={slotsLeft} /></div>

          {/* Hero image */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setLightboxImage(HERO_IMAGE)}
              className="rounded-2xl overflow-hidden w-full max-w-xs h-[380px] sm:h-[480px] transition-transform hover:scale-[1.02]"
              style={{ border: "1px solid rgba(34,211,238,0.35)", boxShadow: "0 24px 80px rgba(34,211,238,0.12)" }}
            >
              <img src={HERO_IMAGE} alt="Starship V2" className="w-full h-full object-cover" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={addToCart}
              disabled={adding}
              className="text-xl px-14 py-6 font-black rounded-full text-white transition-all duration-200 hover:scale-105 disabled:opacity-60 shadow-xl"
              style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)", boxShadow: "0 8px 40px rgba(34,211,238,0.3)" }}
            >
              {adding ? "Adding..." : `Add to Cart — $${STARSHIP_PRICE}`}
            </button>
            <p className="text-gray-400 text-sm">Free replacement parts if anything is wrong.</p>
          </div>
          <p className="text-[10px] text-gray-700 italic mt-3">Design by kmobrain (AstroDesign 3D)</p>
        </div>
      </section>

      {/* WHAT YOU'RE GETTING */}
      <section className="py-10 px-5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-6">What You're Getting</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Scale", value: "1:200" },
              { label: "Height", value: "~26cm (10.2\")" },
              { label: "Material", value: "PLA — durable, matte finish" },
              { label: "Assembly", value: "Press-fit · ~30–60 min" },
              { label: "Print time", value: "~8–12 hours by your local maker" },
              { label: "Ships in", value: SHIPPING_DAYS },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-white font-semibold text-sm">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm text-center leading-relaxed">
            SpaceX's Starship is the most powerful launch vehicle ever built. This model captures the full stack — Super Heavy booster and Starship upper stage — at 1:200 scale with precision-printed detail. Perfect for any space enthusiast's desk.
          </p>
        </div>
      </section>

      {/* COMPLETE THE COLLECTION */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-cyan-400/70 uppercase text-center mb-2">Also Available</p>
          <h2 className="text-2xl font-black text-white text-center mb-6">Complete the Collection</h2>
          <div className="grid grid-cols-3 gap-3">
            {collectionRockets.map(({ name, label, color, border, img }) => (
              <div key={name} className={`rounded-2xl overflow-hidden border bg-white/[0.03] flex flex-col items-center p-3 ${border}`}>
                <div className="w-full h-36 sm:h-48 rounded-xl overflow-hidden mb-3 bg-black">
                  <img src={img} alt={name} className="w-full h-full object-contain" />
                </div>
                <p className={`font-black text-sm sm:text-base ${color}`}>{name}</p>
                <p className="text-gray-500 text-xs text-center mt-1">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-600 text-xs mt-4">Each sold separately · Bundle available at <a href="/rocketcollection" className="text-cyan-400 hover:underline">Rocket Collection</a></p>
        </div>
      </section>

      {/* EMAIL CAPTURE */}
      <section className="py-10 px-5 bg-white/[0.02]">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-[10px] tracking-[0.4em] text-cyan-400 uppercase mb-3">Space Nerds Only</p>
          <h2 className="text-2xl font-black mb-2">Get 10% Off + Early Access</h2>
          <p className="text-gray-500 text-sm mb-6">
            Join the list, get a discount code instantly, and be first to hear about new drops.
          </p>
          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                className="flex-1 px-4 py-3 rounded-full bg-black border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm" />
              <button type="submit" disabled={emailLoading}
                className="px-8 py-3 rounded-full text-white font-bold text-sm hover:scale-105 transition-all disabled:opacity-60 whitespace-nowrap"
                style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)" }}>
                {emailLoading ? "Saving..." : "Get My Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-green-400 font-semibold text-sm">You're in! Here's your code:</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-black border border-cyan-500/40 rounded-xl px-8 py-4">
                  <p className="text-3xl font-black tracking-widest text-cyan-400 font-mono">{EMAIL_DISCOUNT_CODE}</p>
                </div>
                <button onClick={handleCopyCode}
                  className="px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all">
                  {codeCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold underline">Order now</button>
            </div>
          )}
          <p className="text-[10px] text-gray-700 mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-10 px-5">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-8 items-center">
          <img src={FOUNDER_IMAGE} alt="Jacob" className="w-24 h-24 rounded-full object-cover flex-shrink-0 mx-auto sm:mx-0"
            style={{ border: "2px solid rgba(34,211,238,0.3)" }} />
          <div>
            <p className="text-[10px] tracking-widest text-cyan-400 uppercase mb-2">Why this exists</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              I'm Jacob, an aerospace engineering student who helps build real rocket engines. I couldn't find a high-quality Starship model that wasn't either a cheap toy or a $300 collector piece, so I partnered with <strong className="text-white">kmobrain (AstroDesign 3D)</strong> and built a network of {MAKER_COUNT} local makers to print his designs on demand. Quality models, made by real people, at a real price.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 px-5 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center">
                  <span className="font-semibold text-sm text-white pr-4">{faq.q}</span>
                  <span className={`text-cyan-400 text-xl flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
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
      <section className="py-20 px-5 text-center" style={{ background: "linear-gradient(to top, #041018, transparent)" }}>
        <div className="flex justify-center mb-5"><ScarcityBadge slotsLeft={slotsLeft} /></div>
        <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
          Own Starship.<br />
          <span style={{ background: "linear-gradient(90deg, #22d3ee, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ${STARSHIP_PRICE}. Ships in {SHIPPING_DAYS}.
          </span>
        </h2>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
          Printed by a maker near you, shipped fast. Free replacement parts if anything is wrong.
        </p>
        <button
          onClick={addToCart}
          disabled={adding}
          className="text-xl px-14 py-6 rounded-full font-black text-white transition-all hover:scale-105 disabled:opacity-60 shadow-xl"
          style={{ background: "linear-gradient(90deg, #0891b2, #38bdf8)", boxShadow: "0 8px 40px rgba(34,211,238,0.35)" }}
        >
          {adding ? "Adding..." : `Add to Cart — $${STARSHIP_PRICE}`}
        </button>
        <p className="text-gray-800 text-xs mt-14">2025 EX3D Prints · Design by kmobrain (AstroDesign 3D)</p>
      </section>

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white text-3xl hover:text-cyan-400">×</button>
        </div>
      )}
    </div>
  );
}