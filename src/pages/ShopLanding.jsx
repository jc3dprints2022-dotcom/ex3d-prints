import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Zap, Users, Star, ArrowRight, Package, CheckCircle } from "lucide-react";

// ─── Page Config (edit here to change copy, products, CTAs) ───────────────────
const PAGE_CONFIG = {
  // A/B test: swap headline index (0–3) via ?variant=0 url param
  headlines: [
    "Fast, Affordable 3D Printed Items",
    "Unique 3D Printed Gifts, Made Fast",
    "Shop Better 3D Printed Products",
    "3D Printed Items Worth Owning",
  ],
  subheadline: "Local Makers. Better Prices. Guaranteed Results.",
  heroCTA: "Shop Featured Prints",
  secondaryCTA: "Browse Marketplace",
  guaranteeBar: [
    { icon: Users, text: "Made by Real Makers" },
    { icon: Zap, text: "Fast Fulfillment" },
    { icon: ShieldCheck, text: "Secure Checkout" },
    { icon: CheckCircle, text: "Quality Guaranteed" },
  ],
  categories: [
    { label: "Gifts", value: "misc" },
    { label: "Home Decor", value: "home_decor" },
    { label: "Desk", value: "desk" },
    { label: "Toys & Games", value: "toys_and_games" },
    { label: "Art", value: "art" },
    { label: "Seasonal", value: "christmas" },
  ],
  whyUs: [
    {
      icon: Users,
      title: "Made by Real Makers",
      body: "Your order is produced by real people with real printers — not a generic factory.",
    },
    {
      icon: Zap,
      title: "Fast Turnaround",
      body: "Great prints without long waits. Most orders ship within days.",
    },
    {
      icon: Package,
      title: "Better Prices",
      body: "Local fulfillment keeps costs and shipping lower than big print farms.",
    },
    {
      icon: ShieldCheck,
      title: "Guaranteed Results",
      body: "We stand behind every order. If it's not right, we make it right.",
    },
  ],
  marketplaceCTA: {
    headline: "Explore the Full Marketplace",
    body: "Browse more ready-to-buy 3D printed products across every category.",
    cta: "Shop All Products",
  },
  // mode: "featured" | "marketplace"
  defaultMode: "featured",
};

// UTM passthrough helper
function buildUrl(base, extra = {}) {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  utmKeys.forEach((k) => {
    if (params.get(k)) extra[k] = params.get(k);
  });
  const merged = new URLSearchParams(extra);
  const qs = merged.toString();
  return qs ? `${base}?${qs}` : base;
}

function track(event, props = {}) {
  try {
    base44.analytics.track({ eventName: event, properties: props });
  } catch (_) {}
}

export default function ShopLanding() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const featuredRef = useRef(null);

  // Determine headline variant from URL param
  const urlParams = new URLSearchParams(window.location.search);
  const variantIdx = parseInt(urlParams.get("variant") || "0", 10);
  const mode = urlParams.get("mode") || PAGE_CONFIG.defaultMode;
  const headlineIdx = variantIdx >= 0 && variantIdx < PAGE_CONFIG.headlines.length ? variantIdx : 0;

  useEffect(() => {
    loadFeatured();
    trackScrollDepth();
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [activeCategory]);

  const loadFeatured = async () => {
    setLoading(true);
    try {
      const filter = { status: "active" };
      if (activeCategory) filter.category = activeCategory;
      const products = await base44.entities.Product.filter(filter, "-sales_count", 8);
      setFeaturedProducts(products.filter((p) => p.images?.length > 0).slice(0, mode === "marketplace" ? 4 : 8));
    } catch (_) {
      setFeaturedProducts([]);
    }
    setLoading(false);
  };

  const trackScrollDepth = () => {
    const checkpoints = [25, 50, 75, 90];
    const triggered = new Set();
    const onScroll = () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      checkpoints.forEach((cp) => {
        if (pct >= cp && !triggered.has(cp)) {
          triggered.add(cp);
          track("landing_scroll_depth", { depth: cp });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  };

  const scrollToFeatured = () => {
    track("hero_cta_click");
    featuredRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const productUrl = (p) => buildUrl(`/ProductDetail?id=${p.id}`);
  const marketplaceUrl = (cat) => buildUrl("/Marketplace", cat ? { category: cat } : {});

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Sticky Mini Nav ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png"
              alt="EX3D Prints"
              className="h-9 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to={marketplaceUrl()}
              className="text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              to="/CustomPrintRequest"
              className="text-sm font-medium text-gray-700 hover:text-teal-600 transition-colors hidden sm:block"
            >
              Custom Orders
            </Link>
            <Link to={marketplaceUrl()}>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white hidden sm:flex">
                Shop Now
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Guarantee Bar ───────────────────────────────────── */}
      <div className="bg-teal-600 text-white py-2">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
          {PAGE_CONFIG.guaranteeBar.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Icon className="w-3.5 h-3.5" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-50 to-white py-14 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="bg-teal-100 text-teal-800 mb-4 text-xs font-semibold uppercase tracking-wide">
            Real Products. Real Makers.
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {PAGE_CONFIG.headlines[headlineIdx]}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto">
            {PAGE_CONFIG.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={scrollToFeatured}
              className="bg-teal-600 hover:bg-teal-700 text-white text-base px-8 py-3 h-auto rounded-full shadow-lg"
            >
              {PAGE_CONFIG.heroCTA}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link to={marketplaceUrl()} onClick={() => track("hero_marketplace_click")}>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 text-base px-8 py-3 h-auto rounded-full w-full sm:w-auto"
              >
                {PAGE_CONFIG.secondaryCTA}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Category Chips ──────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {PAGE_CONFIG.categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setActiveCategory(cat.value === activeCategory ? null : cat.value);
                track("category_chip_click", { category: cat.label });
              }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured Products ───────────────────────────────── */}
      <section ref={featuredRef} className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Popular Right Now
          </span>
          <h2 className="text-xl font-bold text-gray-900">Featured Prints</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-square" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No products found. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <LandingProductCard
                key={product.id}
                product={product}
                href={productUrl(product)}
                onTrack={() => track("featured_product_click", { product_id: product.id, product_name: product.name })}
              />
            ))}
          </div>
        )}

        {/* Browse More CTA below grid */}
        <div className="text-center mt-10">
          <Link to={marketplaceUrl(activeCategory)} onClick={() => track("browse_more_click")}>
            <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50 px-8 py-3 h-auto rounded-full text-base">
              Browse More Products
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Why Buy Section ─────────────────────────────────── */}
      <section className="bg-slate-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Why EX3D Prints?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PAGE_CONFIG.whyUs.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-xl p-5 shadow-sm text-center">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marketplace CTA Strip ───────────────────────────── */}
      <section className="bg-teal-600 py-14 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{PAGE_CONFIG.marketplaceCTA.headline}</h2>
          <p className="text-teal-100 mb-6 text-base">{PAGE_CONFIG.marketplaceCTA.body}</p>
          <Link to={marketplaceUrl()} onClick={() => track("marketplace_cta_click")}>
            <Button className="bg-white text-teal-700 hover:bg-teal-50 px-10 py-3 h-auto rounded-full text-base font-semibold shadow-lg">
              {PAGE_CONFIG.marketplaceCTA.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Trust Section ───────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-8">Trusted by Makers &amp; Buyers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 border rounded-xl">
            <ShieldCheck className="w-7 h-7 text-teal-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Secure Checkout</p>
            <p className="text-sm text-gray-500 mt-1">Stripe-powered payments. Your info is safe.</p>
          </div>
          <div className="p-5 border rounded-xl">
            <Users className="w-7 h-7 text-teal-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Vetted Makers</p>
            <p className="text-sm text-gray-500 mt-1">Every maker is reviewed before they can sell.</p>
          </div>
          <div className="p-5 border rounded-xl">
            <Star className="w-7 h-7 text-teal-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Quality Focused</p>
            <p className="text-sm text-gray-500 mt-1">We stand behind every order we fulfill.</p>
          </div>
        </div>
      </section>

      {/* ── Minimal Footer ──────────────────────────────────── */}
      <footer className="bg-slate-800 text-gray-300 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png"
              alt="EX3D Prints"
              className="h-8 w-auto opacity-90 mb-1"
            />
            <p className="text-xs text-gray-400">Real makers. Real products. Made fast.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to={marketplaceUrl()} className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/CustomPrintRequest" className="hover:text-white transition-colors">Custom Orders</Link>
            <Link to="/Contact" className="hover:text-white transition-colors">Support</Link>
            <Link to="/FAQ" className="hover:text-white transition-colors">FAQ</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ── Landing Product Card ─────────────────────────────────────────────────────
function LandingProductCard({ product, href, onTrack }) {
  return (
    <a
      href={href}
      onClick={onTrack}
      className="group block rounded-xl overflow-hidden border bg-white hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">3D Printed</p>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{product.name}</h3>
        {product.short_description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1">{product.short_description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-teal-700 font-bold text-sm">
            {product.price ? `From $${product.price.toFixed(2)}` : "View Price"}
          </span>
          <span className="text-xs bg-teal-600 text-white px-2.5 py-1 rounded-full group-hover:bg-teal-700 transition-colors">
            Buy Now
          </span>
        </div>
      </div>
    </a>
  );
}