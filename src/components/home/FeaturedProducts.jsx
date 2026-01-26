import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProductCard from "../marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HorizontalProductSection from "../marketplace/HorizontalProductSection";

export default function FeaturedProducts({ products }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!products || products.length === 0) {
    return null;
  }

  // Get products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  // Filter categories with at least 5 products
  const validCategories = Object.entries(productsByCategory)
    .filter(([_, prods]) => prods.length >= 5)
    .map(([category]) => category);

  // Most popular (top 6 by view count)
  const mostPopular = [...products]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 6);

  // Category order: dorm_essentials, desk, then alphabetical (excluding those two and filtered categories)
  const categoryOrder = ['dorm_essentials', 'desk'];
  const otherCategories = validCategories
    .filter(cat => !categoryOrder.includes(cat))
    .sort();
  const orderedCategories = [...categoryOrder.filter(cat => validCategories.includes(cat)), ...otherCategories];

  const categoryLabels = {
    kit_cards: "Kit Cards",
    plane_models: "Plane Models",
    rocket_models: "Rocket Models",
    halloween: "Halloween",
    embry_riddle: "Embry Riddle",
    dorm_essentials: "Dorm Essentials",
    desk: "Desk",
    art: "Art",
    fashion: "Fashion",
    gadgets: "Gadgets",
    toys_and_games: "Toys & Games",
    thanksgiving: "Thanksgiving",
    christmas: "Christmas",
    holidays: "Holidays",
    misc: "Miscellaneous"
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Most Popular Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Most Popular
            </h2>
            <p className="text-xl text-slate-600">
              Explore our most viewed designs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {mostPopular.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Category Sections */}
        {orderedCategories.map(category => (
          <HorizontalProductSection
            key={category}
            title={categoryLabels[category] || category}
            products={productsByCategory[category]}
            category={category}
          />
        ))}

        <div className="text-center mt-12">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700">
            <Link to={createPageUrl("Marketplace")} onClick={scrollToTop}>
              Browse All Products
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}