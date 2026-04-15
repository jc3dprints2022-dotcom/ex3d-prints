// ARCHIVED VERSION - Original BusinessMarketplace with use cases and full filtering
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Award, Wrench, Cog, ArrowRight, Upload, 
  CheckCircle, Building2, Users, Clock, Shield
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

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
  industry: ["Retail", "Manufacturing", "Education", "Healthcare", "Technology", "Other"],
  product_type: ["Finished Goods", "Components", "Tools & Fixtures", "Promotional Items"],
  material: ["PLA", "PETG", "ABS", "TPU", "Nylon"],
  quantity: ["20-50", "50-100", "100-500", "500+"],
  budget: ["Under $500", "$500-$2000", "$2000-$5000", "$5000+"],
  lead_time: ["1-3 days", "3-7 days", "1-2 weeks", "2+ weeks"],
  customization: ["None", "Logo/Branding", "Custom Design", "Full Custom"]
};

export default function BusinessMarketplace() {
  const [user, setUser] = useState(null);
  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [products, setProducts] = useState([]);

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
    try {
      const allProducts = await base44.entities.Product.list();
      const businessProducts = allProducts.filter(p => 
        p.marketplace_type === 'business' && p.status === 'active'
      );
      setProducts(businessProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handleUseCaseSelect = (useCaseId) => {
    setSelectedUseCase(useCaseId);
  };

  const handleFilterToggle = (category, value) => {
    setActiveFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const handleViewProducts = () => {
    const params = new URLSearchParams();
    if (selectedUseCase) params.set('useCase', selectedUseCase);
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        params.set(key, values.join(','));
      }
    });
    window.location.href = `${createPageUrl("BusinessCatalog")}?${params.toString()}`;
  };

  const handleResetFilters = () => {
    setSelectedUseCase(null);
    setActiveFilters({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Enterprise 3D Manufacturing</h1>
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto">
            We manufacture products for your business. Distributed production capacity. Quality-controlled processes. Scalable solutions.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-gray-100">
              <Link to={createPageUrl("BusinessCatalog")}>
                Browse Full Catalog
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to={createPageUrl("BusinessCADUpload")}>
                <Upload className="w-5 h-5 mr-2" />
                Upload CAD Files
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Use Case Selection */}
        {!selectedUseCase && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-4">What do you need manufactured?</h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              We produce high-quality 3D printed products for your business to sell or use
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {USE_CASES.map(useCase => {
                const Icon = useCase.icon;
                return (
                  <Card 
                    key={useCase.id}
                    className="cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
                    onClick={() => handleUseCaseSelect(useCase.id)}
                  >
                    <CardContent className="pt-6">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{useCase.label}</h3>
                      <p className="text-gray-600 text-sm mb-4">{useCase.description}</p>
                      <Button className="w-full">
                        Select <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Filter Selection */}
        {selectedUseCase && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Refine Your Search</h2>
                <p className="text-gray-600">
                  Selected: {USE_CASES.find(uc => uc.id === selectedUseCase)?.label}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button onClick={handleViewProducts}>
                  View Products <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(FILTER_OPTIONS).map(([category, options]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{category.replace('_', ' ')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {options.map(option => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(activeFilters[category] || []).includes(option)}
                            onChange={() => handleFilterToggle(category, option)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* CAD Upload CTA */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
            <CardContent className="py-12 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">Have CAD Files?</h2>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Upload your designs directly for instant quotes on custom manufacturing
              </p>
              <Button asChild size="lg" variant="secondary">
                <Link to={createPageUrl("BusinessCADUpload")}>
                  Get Custom Quote
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Value Props */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold mb-2">Distributed Network</h3>
              <p className="text-sm text-gray-600">Access to hundreds of qualified manufacturers</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold mb-2">Quality Assured</h3>
              <p className="text-sm text-gray-600">Every product inspected before shipping</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">Fast Turnaround</h3>
              <p className="text-sm text-gray-600">Most orders fulfilled within 3-5 business days</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-bold mb-2">Dedicated Support</h3>
              <p className="text-sm text-gray-600">Real humans available to help with your project</p>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Volume Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <p className="text-gray-600">20-99 units</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">Base Price</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Standard materials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    5-7 day turnaround
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Quality inspection
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-600 border-2">
              <CardHeader>
                <Badge className="w-fit mb-2">Most Popular</Badge>
                <CardTitle>Growth</CardTitle>
                <p className="text-gray-600">100-499 units</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">-15% off</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    All starter features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Priority production
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Dedicated support
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <p className="text-gray-600">500+ units</p>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">-25% off</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    All growth features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Custom materials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Account manager
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <Card className="bg-slate-50 border-0">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Contact our team to discuss your manufacturing needs or browse our catalog
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg">
                  <Link to={createPageUrl("Contact")}>
                    Contact Sales
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={createPageUrl("BusinessCatalog")}>
                    Browse Catalog
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}