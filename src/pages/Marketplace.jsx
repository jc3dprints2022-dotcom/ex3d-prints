
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductGrid from "../components/marketplace/ProductGrid";
import HorizontalProductSection from "../components/marketplace/HorizontalProductSection";
import { Search, X, Upload, SlidersHorizontal } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = [
  { value: "kit_cards", label: "Kit Cards" },
  { value: "plane_models", label: "Plane Models" },
  { value: "rocket_models", label: "Rocket Models" },
  { value: "halloween", label: "Halloween" },
  { value: "embry_riddle", label: "Embry-Riddle" },
  { value: "dorm_essentials", label: "Dorm Essentials"},
  { value: "desk", label: "Desk"},
  { value: "art", label: "Art"},
  { value: "fashion", label: "Fashion"},
  { value: "gadgets", label: "Gadgets"},
  { value: "toys&games", label: "Toys&Games"},
  { value: "holidays", label: "Holidays"},
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("browse"); // "browse" or "filtered"
  const [filters, setFilters] = useState({
    category: null,
    materials: [], 
    colors: [], 
    priceRange: null,
    sortBy: "popular"
  });

  useEffect(() => {
    loadUser();
    loadProducts();
  }, []);

  useEffect(() => {
    // Check URL params to determine view mode
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const categoryParam = urlParams.get('category');
    const viewAllParam = urlParams.get('viewAll');
    
    if (searchParam) {
      setSearchQuery(searchParam);
      setViewMode("filtered");
    }
    
    if (categoryParam) {
      setFilters(prev => ({ ...prev, category: categoryParam }));
      setViewMode("filtered");
    }
    
    if (viewAllParam === 'true') {
      setViewMode("filtered");
    }
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
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      setProducts(allProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
    setLoading(false);
  };

  const applyFilters = useCallback(() => {
    let tempProducts = [...products];

    // Search filter
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      tempProducts = tempProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }
    
    // Category filter
    if (filters.category) {
      tempProducts = tempProducts.filter(p => p.category === filters.category);
    }

    // Material filter
    if (filters.materials.length > 0) {
      tempProducts = tempProducts.filter(p => 
        p.materials && p.materials.some(mat => filters.materials.includes(mat))
      );
    }

    // Color filter
    if (filters.colors.length > 0) {
      tempProducts = tempProducts.filter(p => 
        p.colors && p.colors.some(color => filters.colors.includes(color))
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const range = PRICE_RANGES.find(r => r.value === filters.priceRange);
      if (range) {
        tempProducts = tempProducts.filter(p => p.price >= range.min && p.price <= range.max);
      }
    }
    
    // Sorting
    if (filters.sortBy === 'newest') {
      tempProducts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (filters.sortBy === 'price_asc') {
      tempProducts.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_desc') {
      tempProducts.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'popular') {
      tempProducts.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    
    setFilteredProducts(tempProducts);
  }, [filters, products, searchQuery]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: prev[filterType] === value ? null : value }));
    setViewMode("filtered");
  };

  const handleMultiFilterToggle = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [filterType]: newArray };
    });
    setViewMode("filtered");
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      materials: [],
      colors: [],
      priceRange: null,
      sortBy: "popular"
    });
    setSearchQuery("");
    setViewMode("browse");
    window.history.pushState({}, '', createPageUrl("Marketplace"));
  };

  const handleSearch = () => {
    setViewMode("filtered");
  };

  const activeFiltersCount = [
    filters.category ? 1 : 0,
    filters.materials.length,
    filters.colors.length,
    filters.priceRange ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  // Get products by category
  const getProductsByCategory = (categoryValue) => {
    return products.filter(p => p.category === categoryValue);
  };

  // Get most popular products
  const getMostPopular = () => {
    return [...products].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  };

  // Browse Mode - Show horizontal scrolling sections
  if (viewMode === "browse" && !searchQuery && !filters.category && activeFiltersCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-lg text-gray-600">Discover unique 3D printed designs from talented creators</p>
            </div>
            <Button asChild>
              <Link to={createPageUrl("CustomPrintRequest")}>
                <Upload className="w-5 h-5 mr-2" />
                Upload Custom Files
              </Link>
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="pl-12 pr-12 h-12 text-lg border-gray-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch} className="h-12 px-8">
                Search
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Most Popular Section */}
              <HorizontalProductSection
                title="Most Popular"
                products={getMostPopular()}
                viewAllUrl={`${createPageUrl("Marketplace")}?viewAll=true`}
              />

              {/* Category Sections */}
              {CATEGORIES.map(category => {
                const categoryProducts = getProductsByCategory(category.value);
                if (categoryProducts.length === 0) return null;
                
                return (
                  <HorizontalProductSection
                    key={category.value}
                    title={category.label}
                    products={categoryProducts}
                    viewAllUrl={`${createPageUrl("Marketplace")}?category=${category.value}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Filtered Mode - Show grid with filters (original marketplace view)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-lg text-gray-600">Discover unique 3D printed designs from talented creators</p>
          </div>
          <Button asChild>
            <Link to={createPageUrl("CustomPrintRequest")}>
              <Upload className="w-5 h-5 mr-2" />
              Upload Custom Files
            </Link>
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-lg border-gray-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-3 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="default" className="ml-1">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {/* Category Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Category {filters.category && <Badge variant="secondary" className="ml-2">1</Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {CATEGORIES.map(cat => (
                      <DropdownMenuItem 
                        key={cat.value} 
                        onClick={() => handleFilterChange('category', cat.value)}
                        className={filters.category === cat.value ? 'bg-teal-50' : ''}
                      >
                        {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Material Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Material {filters.materials.length > 0 && <Badge variant="secondary" className="ml-2">{filters.materials.length}</Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {MATERIALS.map(mat => (
                      <DropdownMenuItem 
                        key={mat} 
                        onSelect={(e) => {
                          e.preventDefault();
                          handleMultiFilterToggle('materials', mat);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox 
                          checked={filters.materials.includes(mat)}
                          className="pointer-events-none"
                        />
                        <span>{mat}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Color Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Color {filters.colors.length > 0 && <Badge variant="secondary" className="ml-2">{filters.colors.length}</Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                    {COLORS.map(color => (
                      <DropdownMenuItem 
                        key={color} 
                        onSelect={(e) => {
                          e.preventDefault();
                          handleMultiFilterToggle('colors', color);
                        }}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox 
                          checked={filters.colors.includes(color)}
                          className="pointer-events-none"
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300" 
                          style={{ backgroundColor: color.toLowerCase().replace(/\s/g, '').replace(/glow-in-the-dark(.*)/, 'lime').replace(/color-change(.*)/, 'purple').replace(/silkrainbow/, 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)') }}
                        />
                        <span>{color}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Price Range Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Price Range {filters.priceRange && <Badge variant="secondary" className="ml-2">1</Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {PRICE_RANGES.map(range => (
                      <DropdownMenuItem 
                        key={range.value} 
                        onClick={() => handleFilterChange('priceRange', range.value)}
                        className={filters.priceRange === range.value ? 'bg-teal-50' : ''}
                      >
                        {range.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  Clear All Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort: {SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {SORT_OPTIONS.map(option => (
                  <DropdownMenuItem 
                    key={option.value} 
                    onClick={() => setFilters(prev => ({ ...prev, sortBy: option.value }))}
                    className={filters.sortBy === option.value ? 'bg-teal-50' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Back to Browse Button */}
            <Button variant="outline" onClick={clearFilters}>
              Back to Browse
            </Button>

            {/* Active Filter Tags */}
            {filters.category && (
              <Badge variant="secondary" className="gap-1">
                {CATEGORIES.find(c => c.value === filters.category)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('category', filters.category)} />
              </Badge>
            )}
            {filters.materials.map(material => (
              <Badge key={material} variant="secondary" className="gap-1">
                {material}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleMultiFilterToggle('materials', material)} />
              </Badge>
            ))}
            {filters.colors.map(color => (
              <Badge key={color} variant="secondary" className="gap-1">
                {color}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleMultiFilterToggle('colors', color)} />
              </Badge>
            ))}
            {filters.priceRange && (
              <Badge variant="secondary" className="gap-1">
                {PRICE_RANGES.find(r => r.value === filters.priceRange)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleFilterChange('priceRange', filters.priceRange)} />
              </Badge>
            )}
          </div>
        </div>

        <div className="flex">
          <main className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">{filteredProducts.length} Products Found</h2>
            </div>

            <ProductGrid products={filteredProducts} loading={loading} />
          </main>
        </div>
      </div>
    </div>
  );
}
