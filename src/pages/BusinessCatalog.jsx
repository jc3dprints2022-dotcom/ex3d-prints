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

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "ASA", "Nylon"];
const CATEGORIES = [
  "Promotional Items", "Branded Products", "Engineering Parts", 
  "Replacement Parts", "Tools & Fixtures", "Prototypes"
];

export default function BusinessCatalog() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    materials: [],
    categories: [],
    priceRange: [0, 1000],
    moqRange: [20, 500]
  });

  useEffect(() => {
    loadProducts();
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

    if (filters.materials.length > 0) {
      tempProducts = tempProducts.filter(p =>
        p.materials && p.materials.some(mat => filters.materials.includes(mat))
      );
    }

    setFilteredProducts(tempProducts);
  }, [filters, products, searchQuery]);

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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-64 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow p-4 sticky top-24 space-y-6">
              <h3 className="font-semibold text-lg">Filters</h3>

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

              <div>
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.categories.includes(cat)}
                        onCheckedChange={() => toggleFilter('categories', cat)}
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">{filteredProducts.length} products available</p>
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
                        <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">MOQ:</span>
                            <span className="font-semibold">{product.moq || 20} units</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Lead Time:</span>
                            <span className="font-semibold">{product.lead_time_days || 'TBD'} days</span>
                          </div>
                        </div>

                        <div className="border-t pt-3">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-2xl font-bold text-slate-800">
                              ${product.wholesale_price?.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">/unit</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              50+: ${(product.wholesale_price * 0.9).toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-green-600">
                              100+: ${(product.wholesale_price * 0.8).toFixed(2)}
                            </Badge>
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