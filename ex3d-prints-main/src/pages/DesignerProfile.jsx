import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, User, ChevronLeft } from "lucide-react";
import ProductCard from "../components/marketplace/ProductCard";

export default function DesignerProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const designerId = urlParams.get('id');
  
  const [designer, setDesigner] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (designerId) {
      loadDesignerData();
    }
  }, [designerId]);

  const loadDesignerData = async () => {
    setLoading(true);
    try {
      // Get user data
      const userData = await base44.entities.User.get(designerId);
      setDesigner(userData);

      // Get designer's products — match by designer_user_id OR by user's designer_id field
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      const userDesignerId = userData.designer_id;
      const designerProducts = allProducts
        .filter(p =>
          p.designer_user_id === designerId ||
          (userDesignerId && p.designer_id === userDesignerId)
        )
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setProducts(designerProducts);
    } catch (error) {
      console.error("Failed to load designer data:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Designer Not Found</h1>
        <Button asChild>
          <Link to={createPageUrl("Marketplace")}>Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to={createPageUrl("Marketplace")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Marketplace
        </Link>

        {/* Designer Profile Card */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              {designer.profile_image ? (
                <img
                  src={designer.profile_image}
                  alt={designer.full_name}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{designer.full_name}</h1>
                {designer.designer_name && (
                  <p className="text-lg text-gray-600 mb-4">@{designer.designer_name}</p>
                )}
                {designer.bio && (
                  <p className="text-gray-700 leading-relaxed mb-4">{designer.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-900">{products.length}</span> Designs
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Designer's Products */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Designs by {designer.full_name}</h2>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">This designer hasn't uploaded any designs yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}