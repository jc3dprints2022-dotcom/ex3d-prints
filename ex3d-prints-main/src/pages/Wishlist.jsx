import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import ProductCard from "../components/marketplace/ProductCard";
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Wishlist() {
  const [user, setUser] = useState(null);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadWishlist();
  }, []);

  const checkAuthAndLoadWishlist = async () => {
    try {
      // Use sessionStorage cache for instant load (same pattern as Layout)
      const cachedUser = sessionStorage.getItem('cached_user');
      const cacheTime = sessionStorage.getItem('user_cache_time');
      const now = Date.now();

      if (cachedUser && cacheTime && (now - parseInt(cacheTime)) < 300000) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        await loadWishlist(userData);
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(currentUser);
      await loadWishlist(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  const loadWishlist = async (currentUser) => {
    setLoading(true);
    try {
      if (currentUser?.wishlist?.length > 0) {
        const products = await Promise.all(
          currentUser.wishlist.map(id => base44.entities.Product.get(id).catch(() => null))
        );
        setWishlistProducts(products.filter(p => p !== null));
      } else {
        setWishlistProducts([]);
      }
    } catch (error) {
      setWishlistProducts([]);
    }
    setLoading(false);
  };



  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // The 'user' state will always be present if this component is rendered past the initial loading and authentication check.
  // Therefore, no need for guest-specific UI elements or checks.

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            My Wishlist
          </h1>
        </div>

        {wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {wishlistProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <Heart className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-2xl font-bold">Your Wishlist is Empty</h2>
            <p className="text-slate-600 mt-2 mb-4">Looks like you haven't added anything yet. Let's change that!</p>
            <Button asChild>
              <Link to={createPageUrl("Marketplace")}>Explore Products</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}