import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Package, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function ProductCard({ product }) {
  const { toast } = useToast();
  const [addingToCart, setAddingToCart] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isInWishlist, setIsInWishlist] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser.wishlist && currentUser.wishlist.includes(product.id)) {
        setIsInWishlist(true);
      }
    } catch (error) {
      setUser(null);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setAddingToCart(true);
    try {
      const user = await base44.auth.me();
      
      const existingCartItems = await base44.entities.Cart.filter({ 
        user_id: user.id,
        product_id: product.id 
      });
      
      if (existingCartItems.length > 0) {
        const existingItem = existingCartItems[0];
        const newQuantity = existingItem.quantity + 1;
        await base44.entities.Cart.update(existingItem.id, {
          quantity: newQuantity,
          total_price: existingItem.unit_price * newQuantity
        });
        toast({ title: "Quantity updated in cart!" });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          selected_material: product.materials?.[0] || 'PLA',
          selected_color: product.colors?.[0] || 'Black',
          selected_resolution: 0.2,
          unit_price: product.price,
          total_price: product.price
        });
        toast({ title: "Added to cart!" });
      }

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      if (error.message.includes('not authenticated')) {
        toast({ 
          title: "Please sign in", 
          description: "Please sign in to add to cart.",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Something went wrong", 
          description: "Something went wrong adding this item to your cart. Please try again or refresh the page.",
          variant: "destructive" 
        });
      }
    }
    setAddingToCart(false);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ 
        title: "Please sign in", 
        description: "Please sign in to add to wishlist.",
        variant: "destructive" 
      });
      return;
    }

    try {
      // Fetch latest user data to ensure we have the most current wishlist
      const currentUser = await base44.auth.me();
      const currentWishlist = currentUser.wishlist || [];
      
      // Check if product is already in wishlist
      const productInWishlist = currentWishlist.includes(product.id);
      
      const updatedWishlist = productInWishlist
        ? currentWishlist.filter(pid => pid !== product.id)
        : [...currentWishlist, product.id];

      await base44.auth.updateMe({ wishlist: updatedWishlist, wishlist_last_updated: new Date().toISOString() });
      
      // Update local state
      setUser(prev => ({ ...prev, wishlist: updatedWishlist }));
      setIsInWishlist(!productInWishlist);
      
      toast({ title: productInWishlist ? "Removed from wishlist" : "Added to wishlist ❤️" });
      window.dispatchEvent(new Event('wishlistUpdated'));
      
      // Reload user data to sync
      await loadUser();
    } catch (error) {
      toast({ title: "Failed to update wishlist", variant: "destructive" });
    }
  };

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === (product.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === 0 ? (product.images?.length || 1) - 1 : prev - 1
    );
  };

  const truncateTitle = (title) => {
    if (title.length > 27) {
      return title.substring(0, 27) + '...';
    }
    return title;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Link to={createPageUrl(`ProductDetail?id=${product.id}`)} onClick={scrollToTop}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-3 right-3 z-20 p-2 rounded-full shadow-lg transition-all ${
            isInWishlist 
              ? 'bg-red-500 hover:bg-red-600 border-2 border-red-600' 
              : 'bg-white/90 hover:bg-white border-2 border-gray-300 hover:border-red-400'
          }`}
        >
          <Heart 
            className={`w-5 h-5 ${
              isInWishlist 
                ? 'fill-white text-white' 
                : 'text-gray-600 hover:text-red-500'
            }`} 
          />
        </button>

        <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
          {product.images && product.images.length > 0 ? (
            <>
              <img 
                src={product.images[currentImageIndex] || product.images[0]} 
                alt={product.name}
                className="absolute top-0 left-0 w-full h-full object-cover"
                key={currentImageIndex}
              />
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 p-1 rounded-full shadow-lg hover:bg-white transition-all z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 p-1 rounded-full shadow-lg hover:bg-white transition-all z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-full text-xs z-10">
                    {currentImageIndex + 1} / {product.images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {product.multi_color && (
            <Badge className="absolute top-2 left-2 bg-purple-500 z-10">
              Multi-Color
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2" title={product.name}>
            {truncateTitle(product.name)}
          </h3>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm ml-1">{product.rating?.toFixed(1) || '0.0'}</span>
            </div>
            <span className="text-sm text-gray-500">
              ({product.review_count || 0} reviews)
            </span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-2xl font-bold text-teal-600">
              ${product.price?.toFixed(2)}
            </span>
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}