import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState(new Set());

  /* ============================
     SMART SEARCH (MAX MODE)
     ============================ */

  const SYNONYMS = {
    phone: ["iphone", "android", "mobile"],
    stand: ["mount", "holder", "dock"],
    case: ["cover", "shell"],
    camera: ["gopro", "dslr"],
    tool: ["utility", "device"],
  };

  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const tokenize = (str) => normalize(str).split(" ").filter(Boolean);

  // Levenshtein distance for typo tolerance
  const levenshtein = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const expandToken = (token) => {
    const expansions = new Set([token]);

    // plural normalization
    if (token.endsWith("s")) expansions.add(token.slice(0, -1));
    else expansions.add(`${token}s`);

    // synonyms
    Object.entries(SYNONYMS).forEach(([key, values]) => {
      if (key === token || values.includes(token)) {
        expansions.add(key);
        values.forEach(v => expansions.add(v));
      }
    });

    return [...expansions];
  };

  const smartQueryTransform = (query) => {
    if (!query) return "";

    const tokens = tokenize(query);
    const expanded = new Set();

    tokens.forEach(token => {
      expandToken(token).forEach(t => expanded.add(t));
    });

    return [...expanded].join(" ");
  };

  /* ============================
     DATA LOADING
     ============================ */

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      products.forEach((product, index) => {
        const img = new Image();
        img.src = product.images[0];
        img.onload = () => {
          setPreloadedImages(prev => new Set(prev).add(index));
        };
      });
    }
  }, [products]);

  useEffect(() => {
    if (products.length > 1 && preloadedImages.size > 0) {
      const interval = setInterval(() => {
        const nextIndex = (currentImageIndex + 1) % products.length;
        if (preloadedImages.has(nextIndex)) {
          setNextImageIndex(nextIndex);
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentImageIndex(nextIndex);
            setIsTransitioning(false);
          }, 300);
        }
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [products, currentImageIndex, preloadedImages]);

  const loadProducts = async () => {
    try {
      const featured = await base44.entities.HomepageFeatured.filter({ is_active: true });
      if (featured.length) {
        featured.sort((a, b) => a.display_order - b.display_order);
        const data = await Promise.all(
          featured.map(f => base44.entities.Product.get(f.product_id).catch(() => null))
        );
        setProducts(data.filter(p => p?.images?.length));
        return;
      }

      const all = await base44.entities.Product.filter({ status: "active" });
      setProducts(all.filter(p => p.images?.length).slice(0, 10));
    } catch (e) {
      console.error(e);
    }
  };

  /* ============================
     SEARCH HANDLER
     ============================ */

  const handleSearch = () => {
    const smartQuery = smartQueryTransform(searchQuery);

    window.location.href = smartQuery
      ? `${createPageUrl("Marketplace")}?search=${encodeURIComponent(smartQuery)}`
      : createPageUrl("Marketplace");
  };

  /* ============================
     RENDER
     ============================ */

  return (
    <section className="relative py-20 bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Fast, Affordable <span className="text-teal-400">3D Printing</span>
        </h1>

        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search models, designs, categories…"
                className="pl-12 h-14 text-lg"
              />
            </div>
            <Button onClick={handleSearch} size="lg" className="h-14 px-8 bg-teal-500">
              Search
            </Button>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link to={createPageUrl("Marketplace")}>
              <ShoppingBag className="mr-2" /> Shop Prints
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={createPageUrl("CustomPrintRequest")}>
              <Upload className="mr-2" /> Upload Files
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
