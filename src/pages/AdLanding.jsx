import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Zap, Star, Users, ArrowRight, Package,
  CheckCircle, ShoppingCart, Menu, X
} from "lucide-react";

// ─── Page Config (edit here to change copy/structure without rewriting code) ───
const CONFIG = {
  hero: {
    headlines: [
      "Fast, Affordable 3D Printed Items",
      "Unique 3D Printed Gifts, Made Fast",
      "Shop Better 3D Printed Products",
      "3D Printed Items Worth Owning",
    ],
    activeHeadlineIndex: 0,
    subheadline: "Real makers. Fast delivery. Products you can actually buy now.",
    primaryCTA: "Shop Featured Prints",
    secondaryCTA: "Browse Marketplace",
  },
  trustBar: [
    { icon: ShieldCheck, text: "Secure Checkout" },
    { icon: Users, text: "Made by Vetted Makers" },
    { icon: Zap, text: "Fast Fulfillment" },
    { icon: CheckCircle, text: "Quality Guaranteed" },
  ],
  categories: [
    { label: "Gifts", value: "misc" },
    { label: "Desk", value: "desk" },
    { label: "Home Decor", value: "home_decor" },
    { label: "Toys & Games", value: "toys_and_games" },
    { label: "Art", value: "art" },
    { label: "Gadgets", value: "gadgets" },
    { label: "Seasonal", value: "christmas" },
  ],
  whyBuy: [
    {
      icon: Users,
      title: "Made by Real Makers",
      desc: "Every order is produced by a real person with a real printer — not a factory.",
    },
    {
      icon: Zap,
      title: "Fast Turnaround",
      desc: "Designed for people who want great prints without long waits.",
    },
    {
      icon: ShieldCheck,
      title: "Guaranteed Results",
      desc: "We stand behind the final product. If something's wrong, we'll make it right.",
    },
    {
      icon: Star,
      title: "Better Prices",
      desc: "Local fulfillment keeps costs lower — and we pass those savings to you.",
    },
  ],
  marketplaceCTA: {
    headline: "Explore the Full Marketplace",
    sub: "Browse more ready-to-buy 3D printed products across categories.",
    cta: "Shop All Products",
  },
  mode: "featured", // "featured" | "marketplace"
};

// ─── UTM helpers ──────────────────────────────────────────────────────────────
function getUtmParams() {
  const p = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const params = {};
  utmKeys.forEach(k => { if (p.get(k)) params[k] = p.get(k); });
  return params;
}
function appendUtm(url) {
  const utm = getUtmParams();
  if (!Object.keys(utm).length) return url;
  const u = new URL(url, window.location.origin);
  Object.entries(utm).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname + u.search;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function trackEvent(name, props = {}) {
  try { base44.analytics.track({ eventName: name, properties: props }); } catch (_) {}
}

export default function AdLanding() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const featuredRef = useRef(null);
  const headline = CONFIG.hero.headlines[CONFIG.hero.activeHeadlineIndex];

  useEffect(() => {
    loadFeaturedProducts();
    trackScrollDepth();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const all = await base44.entities.Product.filter({ status: "active", marketplace_type: "consumer" });
      // Prefer boosted, then sort by sales + rating
      const scored = all
        .filter(p => p.images?.length > 0)
        .sort((a, b) => {
          const boost = (b.is_boosted ? 100 : 0) - (a.is_boosted ? 100 : 0);
          if (boost !== 0) return boost;
          const scoreA = (a.sales_count || 0) * 2 + (a.rating || 0) * 5 + (a.view_count || 0) * 0.1;
          const scoreB = (b.sales_count || 0) * 2 + (b.rating || 0) * 5 + (b.view_count || 0) * 0.1;
          return scoreB - scoreA;
        });
      setProducts(scored.slice(0, 8));
    } catch (_) {}
    setLoading(false);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory).slice(0, 8)
    : products;

  const trackScrollDepth = () => {
    const marks = [25, 50, 75, 100];
    let fired = new Set();
    const handler = () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      marks.forEach(m => {
        if (pct >= m && !fired.has(m)) { fired.add(m); trackEvent("ad_landing_scroll_depth", { depth: m }); }
      });
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  };

  const scrollToFeatured = () => {
    trackEvent("ad_landing_hero_cta_click");
    featuredRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const marketplaceUrl = () => appendUtm(createPageUrl("Marketplace"));
  const productUrl = (p) => appendUtm(`/ProductDetail?id=${p.id}`);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={createPageUrl("Home")}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png"
              alt="EX3D Prints"
              className="h-9 w-auto"
            />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to={marketplaceUrl()} className="text-gray-600 hover:text-teal-600 transition-colors">Marketplace</Link>
            <Link to={appendUtm(createPageUrl("CustomPrintRequest"))} className="text-gray-600 hover:text-teal-600 transition-colors">Custom Orders</Link>
            <Link
              to={marketplaceUrl()}
              onClick={() => trackEvent("ad_landing_nav_cta_click")}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-full text-sm transition-colors"
            >
              Shop Now
            </Link>
          </nav>
          {/* Mobile */}
          <button className="md:hidden p-2" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2 text-sm font-medium">
            <Link to={marketplaceUrl()} className="block py-2 text-gray-700" onClick={() => setNavOpen(false)}>Marketplace</Link>
            <Link to={appendUtm(createPageUrl("CustomPrintRequest"))} className="block py-2 text-gray-700" onClick={() => setNavOpen(false)}>Custom Orders</Link>
          </div>
        )}
      </header>

      {/* ── Trust Bar ── */}
      <div className="bg-teal-600 text-white text-xs py-2">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-6 gap-y-1">
          {CONFIG.trustBar.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 font-medium">
              <Icon className="w-3.5 h-3.5" /> {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-gray-50 to-white pt-10 pb-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 mb-4 text-xs font-semibold uppercase tracking-wide">
              Popular right now
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              {headline}
            </h1>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              {CONFIG.hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base rounded-full shadow-lg"
                onClick={scrollToFeatured}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {CONFIG.hero.primaryCTA}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 text-gray-700 px-8 py-3 text-base rounded-full"
                asChild
              >
                <Link to={marketplaceUrl()} onClick={() => trackEvent("ad_landing_hero_secondary_cta")}>
                  {CONFIG.hero.secondaryCTA} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
          {/* Product image collage */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((p, i) => (
              <Link key={p.id} to={productUrl(p)} onClick={() => trackEvent("ad_landing_hero_collage_click", { product_id: p.id })}>
                <div className={`overflow-hidden rounded-2xl shadow-md ${i === 0 ? "row-span-1" : ""} aspect-square`}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              </Link>
            ))}
            {products.length === 0 && [1,2,3,4].map(i => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Chips ── */}
      <section className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!selectedCategory ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-400"}`}
          >
            All
          </button>
          {CONFIG.categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setSelectedCategory(cat.value === selectedCategory ? null : cat.value); trackEvent("ad_landing_category_chip_click", { category: cat.value }); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedCategory === cat.value ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-400"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section ref={featuredRef} className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-1">Popular right now</p>
            <h2 className="text-2xl font-bold text-gray-900">Featured Prints</h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(filteredProducts.length > 0 ? filteredProducts : products).map(product => (
                <FeaturedProductCard
                  key={product.id}
                  product={product}
                  href={productUrl(product)}
                  onClick={() => trackEvent("ad_landing_product_click", { product_id: product.id, product_name: product.name })}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                variant="outline"
                className="border-teal-600 text-teal-600 hover:bg-teal-50 px-10 py-3 rounded-full text-base font-semibold"
                asChild
              >
                <Link to={marketplaceUrl()} onClick={() => trackEvent("ad_landing_below_grid_cta")}>
                  See All Products <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ── Why Buy ── */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Why EX3D Prints?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {CONFIG.whyBuy.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marketplace CTA Strip ── */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-700 py-14 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">{CONFIG.marketplaceCTA.headline}</h2>
          <p className="text-teal-100 mb-8 text-lg">{CONFIG.marketplaceCTA.sub}</p>
          <Button
            size="lg"
            className="bg-white text-teal-700 hover:bg-teal-50 px-10 py-3 rounded-full text-base font-bold shadow-lg"
            asChild
          >
            <Link to={marketplaceUrl()} onClick={() => trackEvent("ad_landing_marketplace_cta_click")}>
              {CONFIG.marketplaceCTA.cta} <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Trusted by our community</p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: ShieldCheck, label: "Secure checkout" },
              { icon: Users, label: "Vetted makers only" },
              { icon: Package, label: "Real printed products" },
              { icon: CheckCircle, label: "Quality-focused fulfillment" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png"
              alt="EX3D Prints"
              className="h-8 w-auto opacity-80 mb-2"
            />
            <p className="text-xs text-gray-500">Real makers. Better prices. Guaranteed results.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-5 text-sm">
            <Link to={marketplaceUrl()} className="hover:text-white transition-colors">Marketplace</Link>
            <Link to={appendUtm(createPageUrl("CustomPrintRequest"))} className="hover:text-white transition-colors">Custom Orders</Link>
            <Link to={appendUtm(createPageUrl("Contact"))} className="hover:text-white transition-colors">Support</Link>
            <Link to={appendUtm(createPageUrl("FAQ"))} className="hover:text-white transition-colors">FAQ</Link>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-800 text-xs text-center text-gray-600">
          © 2025 EX3D Prints. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeaturedProductCard({ product, href, onClick }) {
  const price = product.variants?.length > 0 && product.variants[0]?.options?.length > 0
    ? Math.min(...product.variants.flatMap(v => v.options?.map(o => o.price || v.base_price || product.price) || [product.price]))
    : product.price;

  return (
    <Link to={href} onClick={onClick} className="group block">
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="aspect-square overflow-hidden bg-gray-50">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">{product.name}</h3>
          {product.short_description && (
            <p className="text-xs text-gray-400 mb-2 line-clamp-1">{product.short_description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-teal-700 font-bold text-sm">
              {price ? `From $${price.toFixed(2)}` : "View Price"}
            </span>
            {product.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                <Star className="w-3 h-3 fill-yellow-400" /> {product.rating.toFixed(1)}
              </span>
            )}
          </div>
          <Button size="sm" className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-xs py-1">
            View Product
          </Button>
        </div>
      </div>
    </Link>
  );
}