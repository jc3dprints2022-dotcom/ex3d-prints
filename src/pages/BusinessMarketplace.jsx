import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Search, Package, Zap, Cog, Wrench, FileText, HelpCircle, Building2, CheckCircle, TrendingUp, Clock, Award, Phone, Mail } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const USE_CASES = [
  { 
    id: "retail", 
    label: "Retail Products",
    icon: Package,
    description: "Products we manufacture for you to sell in your store or online shop",
    color: "from-orange-500 to-orange-600"
  },
  { 
    id: "branded", 
    label: "Branded & Promotional Products",
    icon: Award,
    description: "Event merch, custom branded goods, marketing materials for your brand",
    color: "from-purple-500 to-purple-600"
  },
  { 
    id: "replacement", 
    label: "Replacement & Functional Components",
    icon: Wrench,
    description: "Repeat/bulk production of functional parts for your operations",
    color: "from-green-500 to-green-600"
  },
  { 
    id: "prototypes", 
    label: "Custom Parts & Prototypes",
    icon: Cog,
    description: "Engineering parts, one-offs, and prototype work for your projects",
    color: "from-blue-500 to-blue-600"
  }
];

const FILTER_OPTIONS = {
  industry: ["Retail", "Healthcare", "Manufacturing", "Technology", "Hospitality", "Education", "Other"],
  productType: ["Accessories", "Tools", "Fixtures", "Components", "Promotional Items", "Prototypes"],
  material: ["PLA", "PETG", "ABS", "TPU", "ASA", "Nylon"],
  quantity: ["50-100 units", "100-500 units", "500-1000 units", "1000+ units"],
  budget: ["Under $500", "$500-$2,000", "$2,000-$5,000", "$5,000+"],
  leadTime: ["1-3 days", "3-7 days", "1-2 weeks", "2-4 weeks"],
  customization: ["Logo/Text Only", "Color Matching", "Full Custom Design"]
};

export default function BusinessMarketplace() {
  const [user, setUser] = useState(null);
  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    industry: [],
    productType: [],
    material: [],
    quantity: [],
    budget: [],
    leadTime: [],
    customization: []
  });
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const handleUseCaseSelect = async (useCaseId) => {
    setSelectedUseCase(useCaseId);
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

  const toggleFilter = (category, value) => {
    setSelectedFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleViewCatalog = () => {
    window.location.href = createPageUrl("BusinessCatalog");
  };

  const handleReset = () => {
    setSelectedUseCase(null);
    setSelectedFilters({
      industry: [],
      productType: [],
      material: [],
      quantity: [],
      budget: [],
      leadTime: [],
      customization: []
    });
    setShowCatalog(false);
    setProducts([]);
    setFilteredProducts([]);
  };

  if (selectedUseCase && !showCatalog) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-6 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <Button variant="ghost" onClick={handleReset} className="text-white hover:bg-slate-700 mb-4">
              ← Back to Use Cases
            </Button>
            <h2 className="text-2xl font-bold">Refine Your Requirements</h2>
            <p className="text-slate-300">Add filters to narrow down the best manufacturing options</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Object.entries(FILTER_OPTIONS).map(([category, options]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-base capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {options.map(option => (
                      <Badge
                        key={option}
                        variant={selectedFilters[category]?.includes(option) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          selectedFilters[category]?.includes(option) 
                            ? 'bg-slate-800 hover:bg-slate-700' 
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => toggleFilter(category, option)}
                      >
                        {option}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = createPageUrl("BusinessCatalog")} size="lg" className="bg-slate-800 hover:bg-slate-700">
              <Search className="w-5 h-5 mr-2" />
              View Curated Products
            </Button>
            <Button onClick={handleViewCatalog} variant="outline" size="lg">
              Browse Full Catalog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedUseCase || showCatalog) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-6 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4">
            <Button variant="ghost" onClick={handleReset} className="text-white hover:bg-slate-700 mb-4">
              ← Back
            </Button>
            <h2 className="text-2xl font-bold">Manufacturing Solutions</h2>
            <p className="text-slate-300">Enterprise-grade distributed production</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-96 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No products match your criteria</p>
              <Button onClick={handleReset}>Start Over</Button>
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
                        <div className="text-sm text-gray-600 mb-1">Volume Pricing</div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold text-slate-800">
                            ${product.wholesale_price?.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">/unit</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>50-99 units:</span>
                            <span className="font-semibold">${(product.wholesale_price * 0.95).toFixed(2)}/ea</span>
                          </div>
                          <div className="flex justify-between">
                            <span>100+ units:</span>
                            <span className="font-semibold text-green-600">${(product.wholesale_price * 0.85).toFixed(2)}/ea</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Enterprise 3D Manufacturing</h1>
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto">
            We manufacture products for your business. Distributed production capacity. Quality-controlled processes. Scalable solutions.
          </p>
        </div>
      </div>

      {/* What are you looking to produce? */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">What do you need manufactured?</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          We produce high-quality 3D printed products for your business to sell or use
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {USE_CASES.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Card
                key={useCase.id}
                className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-slate-800"
                onClick={() => handleUseCaseSelect(useCase.id)}
              >
                <CardContent className="p-8">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{useCase.label}</h3>
                  <p className="text-gray-600 text-sm">{useCase.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button onClick={handleViewCatalog} variant="outline" size="lg">
            <Search className="w-5 h-5 mr-2" />
            Browse Full Manufacturing Catalog
          </Button>
        </div>
      </div>

      {/* CAD File Upload Bar */}
      <div className="bg-slate-100 border-t border-b py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Link to={createPageUrl("BusinessCADUpload")}>
            <Card className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-teal-600">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">I Have a CAD File</h3>
                      <p className="text-gray-600 text-sm">Upload your design files for custom manufacturing quote</p>
                    </div>
                  </div>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Get Quote →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Value Props */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why EX3D for Manufacturing?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Distributed Capacity</h3>
                <p className="text-sm text-gray-600">Network of verified makers ensures production availability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Quality Control</h3>
                <p className="text-sm text-gray-600">Multi-stage QC process with acceptance criteria validation</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Fast Turnaround</h3>
                <p className="text-sm text-gray-600">Production starts within 24-48 hours of order confirmation</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Scalable Volume</h3>
                <p className="text-sm text-gray-600">From prototypes to thousands of units with volume discounts</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Tiers Example */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Transparent Volume Pricing</h2>
        <p className="text-center text-gray-600 mb-12">Example pricing for standard PLA components</p>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-slate-800 mb-2">$2.50</div>
              <div className="text-sm text-gray-600 mb-4">per unit</div>
              <div className="text-lg font-semibold mb-4">50-99 Units</div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Standard materials</li>
                <li>✓ 7-10 day lead time</li>
                <li>✓ Quality inspection</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 shadow-lg transform scale-105">
            <CardContent className="p-6 text-center">
              <Badge className="mb-2 bg-blue-500">Most Popular</Badge>
              <div className="text-4xl font-bold text-blue-600 mb-2">$2.00</div>
              <div className="text-sm text-gray-600 mb-4">per unit</div>
              <div className="text-lg font-semibold mb-4">100-499 Units</div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Premium materials</li>
                <li>✓ 5-7 day lead time</li>
                <li>✓ Dedicated account rep</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">$1.50</div>
              <div className="text-sm text-gray-600 mb-4">per unit</div>
              <div className="text-lg font-semibold mb-4">500+ Units</div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ All materials available</li>
                <li>✓ Priority production</li>
                <li>✓ Custom packaging</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need a Custom Manufacturing Solution?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Our team works with businesses of all sizes. Get a personalized quote and production timeline.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              <Phone className="w-5 h-5 mr-2" />
              Schedule Consultation
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-slate-700">
              <Mail className="w-5 h-5 mr-2" />
              Request Quote
            </Button>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            Response time: Within 4 business hours
          </p>
        </div>
      </div>
    </div>
  );
}