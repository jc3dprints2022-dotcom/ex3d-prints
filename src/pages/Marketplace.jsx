import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Upload, SlidersHorizontal, Star, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import ProductCard from "../components/marketplace/ProductCard";

const CATEGORIES = [
  { value: "kit_cards", label: "Kit Cards" },
  { value: "rocket_models", label: "Rocket Models" },
  { value: "halloween", label: "Halloween" },
  { value: "dorm_essentials", label: "Dorm Essentials"},
  { value: "desk", label: "Desk"},
  { value: "art", label: "Art"},
  { value: "gadgets", label: "Gadgets"},
  { value: "toys_and_games", label: "Toys & Games"},
  { value: "thanksgiving", label: "Thanksgiving"},
  { value: "christmas", label: "Christmas"},
  { value: "valentines_day", label: "Valentine's Day"},
  { value: "misc", label: "Misc" }
];
const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];

const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Copper", "Purple", "Pink", "Silk Rainbow", "Marble",
];

const PRICE_RANGES = [
  { value: "0-10", label: "Under $10", min: 0, max: 10 },
  { value: "10-25", label: "$10 - $25", min: 10, max: 25 },
  { value: "25-50", label: "$25 - $50", min: 25, max: 50 },
  { value: "50-100", label: "$50 - $100", min: 50, max: 100 },
  { value: "100+", label: "$100+", min: 100, max: 99999 }
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" }
];

export default function Marketplace() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const observerTarget = useRef(null);
  
  const [filters, setFilters] = useState({
    category: null,
    materials: [], 
    colors: [], 
    priceRange: [0, 100],
    rating: 0,
    sortBy: "popular",
    availability: []
  });

  useEffect(() => {
    loadUser();
    loadProducts();
  }, [searchQuery]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const categoryParam = urlParams.get('category');
    
    if (searchParam) setSearchQuery(searchParam);
    if (categoryParam) setFilters(prev => ({ ...prev, category: categoryParam }));
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const searchWithAlgolia = async () => {
    if (!searchQuery.trim()) {
      return loadProducts();
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('searchProducts', {
        query: searchQuery,
        filters: {
          category: filters.category || undefined,
          materials: filters.materials.length > 0 ? filters.materials : undefined,
          colors: filters.colors.length > 0 ? filters.colors : undefined,
          minPrice: filters.priceRange[0],
          maxPrice: filters.priceRange[1]
        },
        page: 0,
        hitsPerPage: 100
      });

      if (data.success) {
        setProducts(data.products);
      } else {
        loadProducts();
      }
    } catch (error) {
      console.error('Algolia search failed, using fallback:', error);
      loadProducts();
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    if (searchQuery.trim()) {
      return searchWithAlgolia();
    }

    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.list();
      // Only show active products in marketplace
      const activeProducts = allProducts.filter(p => p.status === 'active');
      setProducts(activeProducts);
      
      // Calculate which categories have products
      const categoriesWithProducts = new Set(activeProducts.map(p => p.category));
      const filtered = CATEGORIES.filter(cat => categoriesWithProducts.has(cat.value));
      setAvailableCategories(filtered);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    let tempProducts = [...products];

    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      tempProducts = tempProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }
    
    if (filters.category) {
      tempProducts = tempProducts.filter(p => p.category === filters.category);
    }

    if (filters.materials.length > 0) {
      tempProducts = tempProducts.filter(p => 
        p.materials && p.materials.some(mat => filters.materials.includes(mat))
      );
    }

    if (filters.colors.length > 0) {
      tempProducts = tempProducts.filter(p => 
        p.colors && p.colors.some(color => filters.colors.includes(color))
      );
    }

    tempProducts = tempProducts.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    if (filters.rating > 0) {
      tempProducts = tempProducts.filter(p => (p.rating || 0) >= filters.rating);
    }
    
    const boostedProducts = tempProducts.filter(p => {
      if (!p.is_boosted) return false;
      const now = new Date();
      const endDate = p.boost_end_date ? new Date(p.boost_end_date) : null;
      return endDate && endDate > now;
    });
    
    const nonBoostedProducts = tempProducts.filter(p => {
      if (!p.is_boosted) return true;
      const now = new Date();
      const endDate = p.boost_end_date ? new Date(p.boost_end_date) : null;
      return !endDate || endDate <= now;
    });
    
    const sortProducts = (products) => {
      const sorted = [...products];
      if (filters.sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      else if (filters.sortBy === 'price_asc') sorted.sort((a, b) => a.price - b.price);
      else if (filters.sortBy === 'price_desc') sorted.sort((a, b) => b.price - a.price);
      else if (filters.sortBy === 'popular') sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      return sorted;
    };
    
    tempProducts = [...sortProducts(boostedProducts), ...sortProducts(nonBoostedProducts)];
    
    setFilteredProducts(tempProducts);
    // Show all products when category is selected
    setDisplayedProducts(tempProducts);
    setPage(1);
    setHasMore(false);
  }, [filters, products, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            const nextPage = page + 1;
            const startIdx = nextPage * 20;
            const endIdx = startIdx + 20;
            const moreProducts = filteredProducts.slice(startIdx, endIdx);
            
            if (moreProducts.length > 0) {
              setDisplayedProducts(prev => [...prev, ...moreProducts]);
              setPage(nextPage);
              setHasMore(filteredProducts.length > endIdx);
            } else {
              setHasMore(false);
            }
            setLoadingMore(false);
          }, 100);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, filteredProducts]);

  const handleMultiFilterToggle = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      materials: [],
      colors: [],
      priceRange: [0, 100],
      rating: 0,
      sortBy: "popular",
      availability: []
    });
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Button asChild variant="default" size="sm" className="bg-red-600 hover:bg-red-700">
              <Link to={createPageUrl("CustomPrintRequest")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Custom Files
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-b sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            <Button
              variant={!filters.category ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, category: null }))}
            >
              All
            </Button>
            {availableCategories.map(cat => (
              <Button
                key={cat.value}
                variant={filters.category === cat.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, category: cat.value }))}
                className="whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 sticky top-[140px] space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-3 block">Price Range</label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="text-sm font-medium mb-2 block">Materials</label>
                <div className="space-y-2">
                  {MATERIALS.map(mat => (
                    <label key={mat} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.materials.includes(mat)}
                        onCheckedChange={() => handleMultiFilterToggle('materials', mat)}
                      />
                      <span className="text-sm">{mat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="text-sm font-medium mb-2 block">Colors</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {COLORS.map(color => (
                    <label key={color} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.colors.includes(color)}
                        onCheckedChange={() => handleMultiFilterToggle('colors', color)}
                      />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium mb-2 block">Min Rating</label>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.rating === rating}
                        onCheckedChange={() => setFilters(prev => ({ ...prev, rating: prev.rating === rating ? 0 : rating }))}
                      />
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{rating}+ Stars</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">{displayedProducts.length} of {filteredProducts.length} products</p>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="border rounded px-3 py-1 text-sm"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {hasMore && (
                  <div ref={observerTarget} className="flex justify-center py-8">
                    {loadingMore && <Loader2 className="w-8 h-8 animate-spin text-teal-600" />}
                  </div>
                )}

                {!hasMore && displayedProducts.length > 0 && (
                  <p className="text-center text-gray-500 py-8">You've reached the end!</p>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed right-0 top-0 bottom-0 w-64 bg-white overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filters</h3>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">Clear Filters</Button>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-3 block">Price Range</label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="text-sm font-medium mb-2 block">Materials</label>
                <div className="space-y-2">
                  {MATERIALS.map(mat => (
                    <label key={mat} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.materials.includes(mat)}
                        onCheckedChange={() => handleMultiFilterToggle('materials', mat)}
                      />
                      <span className="text-sm">{mat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="text-sm font-medium mb-2 block">Colors</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {COLORS.map(color => (
                    <label key={color} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.colors.includes(color)}
                        onCheckedChange={() => handleMultiFilterToggle('colors', color)}
                      />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium mb-2 block">Min Rating</label>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.rating === rating}
                        onCheckedChange={() => setFilters(prev => ({ ...prev, rating: prev.rating === rating ? 0 : rating }))}
                      />
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{rating}+ Stars</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Toggle Button */}
      <Button
        className="lg:hidden fixed bottom-4 right-4 rounded-full shadow-lg z-40"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <SlidersHorizontal className="w-5 h-5" />
      </Button>
    </div>
  );
}