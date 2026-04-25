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
const STARSHIP_PRICE  = 20;

const GIANTS_BUNDLE_PRICE    = 75;
const GIANTS_BUNDLE_SEPARATE = SATURN_V_PRICE + SLS_PRICE + STARSHIP_PRICE;
const GIANTS_BUNDLE_SAVINGS  = GIANTS_BUNDLE_SEPARATE - GIANTS_BUNDLE_PRICE;

const EMAIL_DISCOUNT_CODE = "WELCOME10";

// ── IMAGES ───────────────────────────────────────────────────────────────────
const SATURN_V_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_IMAGE      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";
const STARSHIP_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/f6e9232fa_7.jpg";

export default function SaturnV() {
  const [adding, setAdding] = useState(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const { toast } = useToast();

  // ── ADD TO CART ───────────────────────────────────────────────────────────────
  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      const items = [];

      if (type === "bundle") {
        items.push(
          { product_id: SATURN_V_ID, name: "Saturn V", price: SATURN_V_PRICE, image: SATURN_V_IMAGE },
          { product_id: SLS_ID, name: "SLS", price: SLS_PRICE, image: SLS_IMAGE }
        );
      }

      if (type === "saturn") items.push({ product_id: SATURN_V_ID, name: "Saturn V", price: SATURN_V_PRICE, image: SATURN_V_IMAGE });
      if (type === "sls") items.push({ product_id: SLS_ID, name: "SLS", price: SLS_PRICE, image: SLS_IMAGE });

      if (user) {
        for (const item of items) {
          await base44.entities.Cart.create({
            user_id: user.id,
            product_id: item.product_id,
            product_name: item.name,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price,
            images: [item.image],
          });
        }
      }

      toast({ title: "Added to cart 🚀" });
      window.location.href = "/Cart";

    } catch {
      toast({ title: "Failed to add", variant: "destructive" });
    }
    setAdding(null);
  };

  // ── EMAIL ───────────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await base44.entities.User.create({ email });
    } catch {}
    setEmailSubmitted(true);
    setEmailLoading(false);
  };

  // ── BUTTONS ───────────────────────────────────────────────────────────────
  const BundleBtn = () => (
    <button
      onClick={() => addToCart("bundle")}
      disabled={adding !== null}
      className="font-black rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white px-10 py-4"
    >
      {adding === "bundle" ? "Adding…" : "Get the Bundle"}
    </button>
  );

  const SingleBtn = ({ type }) => (
    <button
      onClick={() => addToCart(type)}
      className="w-full py-2 rounded-full bg-white/10 text-white"
    >
      Add to Cart
    </button>
  );

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <Toaster />

      {/* HERO */}
      <section className="text-center py-16 px-5">
        <p className="text-xs text-orange-400 uppercase">Best Value</p>
        <p className="text-sm text-gray-500 mb-4">Heavy-Lift Bundle</p>

        <h1 className="text-5xl font-black mb-4">
          The Most Iconic Rocket Ever Built
        </h1>

        <p className="text-gray-400 mb-6">
          High-detail model kits. Assembly required (30–60 min).
        </p>

        <div className="flex justify-center gap-4 mb-8">
          <img src={SATURN_V_IMAGE} className="h-64 object-contain" />
          <img src={SLS_IMAGE} className="h-64 object-contain" />
          <img src={STARSHIP_IMAGE} className="h-64 object-contain" />
        </div>

        <BundleBtn />

        <p className="text-sm text-gray-500 mt-3">
          <span className="line-through mr-2">${GIANTS_BUNDLE_SEPARATE}</span>
          <span className="text-orange-400">Save ${GIANTS_BUNDLE_SAVINGS}</span>
        </p>
      </section>

      {/* INDIVIDUAL */}
      <section className="py-12 px-5 border-t border-white/10">
        <p className="text-lg text-white text-center mb-6">
          Prefer just one? Get any rocket individually.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { type: "saturn", name: "Saturn V", price: SATURN_V_PRICE, img: SATURN_V_IMAGE },
            { type: "sls", name: "SLS", price: SLS_PRICE, img: SLS_IMAGE },
            { type: "starship", name: "Starship", price: STARSHIP_PRICE, img: STARSHIP_IMAGE },
          ].map((p) => (
            <div key={p.type} className="border border-white/10 p-4 rounded-xl">
              <img src={p.img} className="h-40 mx-auto mb-3 object-contain" />
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-gray-400 mb-3">${p.price}</p>
              <SingleBtn type={p.type} />
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL */}
      <section className="py-16 text-center border-t border-white/10">
        <h2 className="text-2xl font-black mb-2">Get 10% Off</h2>

        {!emailSubmitted ? (
          <form onSubmit={handleEmailSubmit} className="flex justify-center gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 bg-black border border-white/20"
              placeholder="Email"
            />
            <button className="bg-orange-500 px-4 py-2">
              {emailLoading ? "..." : "Get Code"}
            </button>
          </form>
        ) : (
          <p className="text-orange-400 text-xl">{EMAIL_DISCOUNT_CODE}</p>
        )}
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-20 border-t border-white/10">
        <h2 className="text-4xl font-black mb-4">
          Three Rockets. One Bundle.
        </h2>

        <BundleBtn />
      </section>
    </div>
  );
}