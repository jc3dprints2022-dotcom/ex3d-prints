import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, SlidersHorizontal, Star, Loader2, Building2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
  { value: "home_decor", label: "Home Decor" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "accessories", label: "Accessories" },
  { value: "toys_and_games", label: "Toys & Games" },
  { value: "collectibles", label: "Collectibles" },
  { value: "gadgets", label: "Gadgets" },
  { value: "art", label: "Art" },
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = ["White", "Black", "Gray", "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink"];

export default function BusinessMarketplace() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const observerTarget = useRef(null);

  const [filters, setFilters] = useState({
    category: null,
    materials: [],
    colors: [],
    priceRange: [0, 500],
    sortBy: "popular"
  });

  useEffect(() => {
    loadUser();
    loadProducts();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.list();
      const businessProducts = allProducts.filter(p => 
        p.status === 'active' && 
        p.marketplace_type === 'business' &&
        p.product_type === 'print'
      );
      setProducts(businessProducts);
    } catch (error) {
      console.error("Failed to load business products:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    let tempProducts = [...products];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      tempProducts = tempProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
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
      p.wholesale_price >= filters.priceRange[0] && p.wholesale_price <= filters.priceRange[1]
    );

    if (filters.sortBy === 'price_asc') tempProducts.sort((a, b) => a.wholesale_price - b.wholesale_price);
    else if (filters.sortBy === 'price_desc') tempProducts.sort((a, b) => b.wholesale_price - a.wholesale_price);
    else if (filters.sortBy === 'popular') tempProducts.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

    setFilteredProducts(tempProducts);
    setDisplayedProducts(tempProducts);
  }, [filters, products, searchQuery]);

  const handleMultiFilterToggle = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Business Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Business Marketplace</h1>
          </div>
          <p className="text-purple-100">Wholesale 3D printed products for retail stores</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search business products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-b sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            <Button
              variant={!filters.category ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, category: null }))}
            >
              All Categories
            </Button>
            {CATEGORIES.map(cat => (
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
          {/* Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 sticky top-[140px] space-y-6">
              <h3 className="font-semibold text-lg">Filters</h3>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-3 block">Wholesale Price</label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  max={500}
                  step={10}
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
                <div className="space-y-2">
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
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">{displayedProducts.length} products</p>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No business products available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayedProducts.map(product => (
                  <Link key={product.id} to={`${createPageUrl("BusinessProductDetail")}?id=${product.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-square">
                        <Badge className="absolute top-2 left-2 bg-purple-600 z-10">Business Exclusive</Badge>
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 truncate">{product.name}</h3>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <p>MOQ: {product.moq || 20} units</p>
                          <p>Lead Time: {product.lead_time_days || 'N/A'} days</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-purple-600">
                            ${product.wholesale_price?.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">wholesale</span>
                        </div>
                        {product.suggested_retail_price && (
                          <p className="text-xs text-gray-500 mt-1">
                            Suggested retail: ${product.suggested_retail_price.toFixed(2)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}