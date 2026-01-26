import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProductCard from "../marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FeaturedProducts({ products }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!products || products.length === 0) {
    return null;
  }

  const featuredProducts = products.slice(0, 6);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Featured Designs
          </h2>
          <p className="text-xl text-slate-600">
            Explore our curated collection of high-quality 3D prints
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center">
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