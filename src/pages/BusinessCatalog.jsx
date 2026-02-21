import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2, SlidersHorizontal } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const INDUSTRIES = [
  "Retail & E-commerce",
  "Healthcare & Medical",
  "Manufacturing & Industrial",
  "Technology & Electronics",
  "Hospitality & Events"
];

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
const PRICE_RANGES = [
  { label: "Under $5", min: 0, max: 5 },
  { label: "$5 - $15", min: 5, max: 15 },
  { label: "$15 - $30", min: 15, max: 30 },
  { label: "$30 - $50", min: 30, max: 50 },
  { label: "$50+", min: 50, max: 10000 }
];
const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" }
];

export default function BusinessCatalog() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [filters, setFilters] = useState({
    materials: [],
    colors: [],
    priceRange: null,
    sortBy: "popular"
  });

  useEffect(() => {
    loadProducts();
    
    // Get URL parameters for pre-selected filters
    const urlParams = new URLSearchParams(window.location.search);
    const industry = urlParams.get('industry');
    const quantity = urlParams.get('quantity');
    const budget = urlParams.get('budget');
    
    if (industry) setSelectedIndustry(industry);
    if (quantity) setSelectedQuantity(quantity);
    if (budget) setSelectedBudget(budget);
  }, []);

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
      setFilteredProducts(businessProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
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

    if (selectedCategory) {
      tempProducts = tempProducts.filter(p => p.category === selectedCategory);
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

    // Calculate target price per unit based on budget and quantity
    let targetPriceMin = null;
    let targetPriceMax = null;
    
    if (selectedBudget && selectedQuantity) {
      const budgetParts = selectedBudget.split('-');
      const quantityParts = selectedQuantity.split('-');
      
      const budgetMin = parseInt(budgetParts[0]) || 0;
      const budgetMax = budgetParts[1] === '+' ? parseInt(budgetParts[0]) * 2 : parseInt(budgetParts[1]);
      
      const quantityMin = parseInt(quantityParts[0]) || 30;
      const quantityMax = quantityParts[1] === '+' ? parseInt(quantityParts[0]) * 2 : parseInt(quantityParts[1]);
      
      // Calculate average price per unit from budget/quantity
      const avgQuantity = (quantityMin + quantityMax) / 2;
      const avgBudget = (budgetMin + budgetMax) / 2;
      const targetPrice = avgBudget / avgQuantity;
      
      // Show products 30% below to 50% above target price
      targetPriceMin = targetPrice * 0.7;
      targetPriceMax = targetPrice * 1.5;
    } else if (filters.priceRange) {
      targetPriceMin = filters.priceRange.min;
      targetPriceMax = filters.priceRange.max;
    }
    
    if (targetPriceMin !== null && targetPriceMax !== null) {
      tempProducts = tempProducts.filter(p =>
        p.wholesale_price >= targetPriceMin && p.wholesale_price <= targetPriceMax
      );
    }

    // Sort
    if (filters.sortBy === 'price_asc') {
      tempProducts.sort((a, b) => (a.wholesale_price || 0) - (b.wholesale_price || 0));
    } else if (filters.sortBy === 'price_desc') {
      tempProducts.sort((a, b) => (b.wholesale_price || 0) - (a.wholesale_price || 0));
    } else if (filters.sortBy === 'newest') {
      tempProducts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else {
      tempProducts.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    setFilteredProducts(tempProducts);
  }, [filters, products, searchQuery, selectedCategory, selectedBudget, selectedQuantity]);

  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const current = prev[type] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Link to={createPageUrl("BusinessMarketplace")} className="text-slate-300 hover:text-white mb-4 inline-block">
            ← Back to Business Home
          </Link>
          <h1 className="text-3xl font-bold mb-2">Manufacturing Catalog</h1>
          <p className="text-slate-300">Browse our full range of business production capabilities</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Active Filters Display */}
            {(selectedIndustry || selectedQuantity || selectedBudget) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Your selections:</span>
                {selectedIndustry && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedIndustry(null)}>
                    {selectedIndustry} ✕
                  </Badge>
                )}
                {selectedQuantity && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedQuantity(null)}>
                    {selectedQuantity} units ✕
                  </Badge>
                )}
                {selectedBudget && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedBudget(null)}>
                    ${selectedBudget} ✕
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedIndustry(null);
                    setSelectedQuantity(null);
                    setSelectedBudget(null);
                  }}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Industry & Category Navigation */}
      <div className="bg-white border-b sticky top-[73px] z-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Industry Filter */}
          {!selectedIndustry && (
            <div className="py-3 border-b">
              <p className="text-xs font-semibold text-gray-500 mb-2">FILTER BY INDUSTRY</p>
              <div className="flex items-center gap-2 overflow-x-auto">
                {INDUSTRIES.map(ind => (
                  <Button
                    key={ind}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIndustry(ind)}
                    className="whitespace-nowrap"
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Category Filter */}
          <div className="py-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">BROWSE BY CATEGORY</p>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                variant={!selectedCategory ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="whitespace-nowrap"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-64 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow p-4 sticky top-[146px] space-y-6">
              <h3 className="font-semibold text-lg">Filters</h3>

              {/* Materials */}
              <div>
                <label className="text-sm font-medium mb-2 block">Materials</label>
                <div className="space-y-2">
                  {MATERIALS.map(mat => (
                    <label key={mat} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.materials.includes(mat)}
                        onCheckedChange={() => toggleFilter('materials', mat)}
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
                        onCheckedChange={() => toggleFilter('colors', color)}
                      />
                      <span className="text-sm">{color}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Manual Price Override (only if not using budget/quantity) */}
              {!selectedBudget && !selectedQuantity && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Per Unit</label>
                  <div className="space-y-2">
                    {PRICE_RANGES.map(range => (
                      <label key={range.label} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.priceRange?.label === range.label}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              priceRange: checked ? range : null
                            }));
                          }}
                        />
                        <span className="text-sm">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">{filteredProducts.length} products available</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg h-96 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products match your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <Link key={product.id} to={`${createPageUrl("BusinessProductDetail")}?id=${product.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all h-full">
                      <div className="relative aspect-square">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Building2 className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-2 line-clamp-1">{product.name}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                        
                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="text-gray-500">MOQ</div>
                            <div className="font-semibold">{product.moq || 30} units</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="text-gray-500">Lead Time</div>
                            <div className="font-semibold">{product.lead_time_days || 'TBD'} days</div>
                          </div>
                          {product.materials && product.materials.length > 0 && (
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-500">Materials</div>
                              <div className="font-semibold truncate">{product.materials.join(', ')}</div>
                            </div>
                          )}
                          {product.dimensions && (
                            <div className="bg-gray-50 p-2 rounded">
                              <div className="text-gray-500">Size</div>
                              <div className="font-semibold truncate">
                                {product.dimensions.length}x{product.dimensions.width}x{product.dimensions.height}mm
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="border-t pt-3">
                          <div className="text-xs text-gray-500 mb-1">Starting at</div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-2xl font-bold text-slate-800">
                              ${product.wholesale_price?.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">/unit</span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>50-99 units:</span>
                              <span className="font-semibold">${(product.wholesale_price * 0.95).toFixed(2)}/ea</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>100+ units:</span>
                              <span className="font-semibold">${(product.wholesale_price * 0.85).toFixed(2)}/ea</span>
                            </div>
                          </div>
                        </div>
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