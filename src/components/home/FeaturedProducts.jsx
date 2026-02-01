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

  const featuredProducts = products.slice(0, 12);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Featured Products
          </h2>
          <p className="text-xl text-slate-600">
            Check out our handpicked collection of high-quality 3D prints
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 h-16 px-12 text-lg">
            <Link to={createPageUrl("Marketplace")} onClick={scrollToTop}>
              Browse All Products
              <ArrowRight className="w-6 h-6 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}