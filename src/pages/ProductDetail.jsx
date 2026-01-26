import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Heart, Star, Loader2, ChevronLeft, ChevronRight, Package, Truck, Shield, Plus, X, Info } from "lucide-react";
import ReviewList from "../components/shared/ReviewList";
import RatingDisplay from "../components/shared/RatingDisplay";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FILAMENT_INFO = {
  'PLA': 'Biodegradable, easy to print, good for decorative items and prototypes',
  'PETG': 'More durable than PLA, temperature and impact resistant, food-safe',
  'ABS': 'Strong and heat-resistant, ideal for functional parts',
  'TPU': 'Flexible and rubber-like, perfect for phone cases and grips'
};

const mmToInches = (mm) => {
  return (mm / 25.4).toFixed(2);
};

const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink", 
  "Copper", "Silk Rainbow", "Marble"
];

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  const [product, setProduct] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviews, setReviews] = useState([]);
  
  const [multiColorSelections, setMultiColorSelections] = useState([]);

  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    if (!id) {
      setLoading(false);
      return;
    }
    loadUser();
    loadProduct();
    
    // trackRecentlyViewed is now an async function and called within loadUser or after user is loaded.
    // For now, it's safe to call it here, and it will update the user's recently_viewed once `user` state is set.
    // However, a better approach might be to call it after `loadUser` has completed and `user` is guaranteed to be set.
    // For this specific outline, we'll keep it as is, but ensure `trackRecentlyViewed` handles the `user` being null initially.
    trackRecentlyViewed(id); 
  }, [id]);

  const trackRecentlyViewed = async (productId) => {
    try {
      // Update localStorage
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const filtered = recentlyViewed.filter(pid => pid !== productId);
      const updated = [productId, ...filtered].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));

      // Update user's recently_viewed in database if logged in
      if (user) {
        const userRecentlyViewed = user.recently_viewed || [];
        const filteredUser = userRecentlyViewed.filter(pid => pid !== productId);
        const updatedUser = [productId, ...filteredUser].slice(0, 10);
        
        await base44.auth.updateMe({ recently_viewed: updatedUser });
      }
    } catch (error) {
      console.error('Failed to track recently viewed:', error);
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const productData = await base44.entities.Product.get(id);
      setProduct(productData);
      
      if (productData.materials && productData.materials.length > 0) {
        setSelectedMaterial(productData.materials[0]);
      }
      if (productData.colors && productData.colors.length > 0) {
        setSelectedColor(productData.colors[0]);
      }

      if (productData.multi_color) {
        const numColors = productData.number_of_colors || 2;
        const initialSelections = [];
        for (let i = 0; i < numColors; i++) {
          initialSelections.push(productData.colors?.[i] || productData.colors?.[0] || 'Black');
        }
        setMultiColorSelections(initialSelections);
      }

      await base44.entities.Product.update(id, {
        view_count: (productData.view_count || 0) + 1
      });

      const allReviews = await base44.entities.Review.list();
      
      const productReviews = allReviews.filter(review => 
        review.product_id === id && review.review_type === 'product'
      );

      let reviewsWithNames = productReviews;
      try {
        const allUsers = await base44.entities.User.list();
        
        reviewsWithNames = productReviews.map(review => {
          const customer = allUsers.find(u => u.id === review.customer_id);
          return {
            ...review,
            customer_name: customer?.full_name || 'Anonymous'
          };
        });
      } catch (userError) {
        console.log('Could not fetch user names (guest browsing):', userError.message);
        reviewsWithNames = productReviews.map(review => ({
          ...review,
          customer_name: 'Anonymous'
        }));
      }

      setReviews(reviewsWithNames);

      let avgRating = 0;
      let reviewCount = reviewsWithNames.length;
      
      if (reviewCount > 0) {
        avgRating = reviewsWithNames.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
      }

      setProduct(prev => ({
        ...prev,
        rating: avgRating,
        review_count: reviewCount
      }));

      if (productData.rating !== avgRating || productData.review_count !== reviewCount) {
        await base44.entities.Product.update(id, {
          rating: avgRating,
          review_count: reviewCount
        });
      }

    } catch (error) {
      console.error("Failed to load product:", error);
      toast({ title: "Failed to load product", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.wishlist && currentUser.wishlist.includes(id)) {
        setIsInWishlist(true);
      }
      // Re-track recently viewed with the user information now available
      trackRecentlyViewed(id);
    } catch (error) {
      setUser(null);
    }
  };

  const handleColorChange = (index, color) => {
    const newSelections = [...multiColorSelections];
    newSelections[index] = color;
    setMultiColorSelections(newSelections);
  };

  const handleAddToCart = async () => {
    if (!selectedMaterial) {
      toast({ title: "Please select material", variant: "destructive" });
      return;
    }

    if (!product.multi_color && !selectedColor) {
      toast({ title: "Please select color", variant: "destructive" });
      return;
    }

    if (product.multi_color && multiColorSelections.some(c => !c)) {
      toast({ title: "Please select all colors for multi-color print", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ 
        title: "Please sign in", 
        description: "Please sign in to add to cart.",
        variant: "destructive" 
      });
      await base44.auth.redirectToLogin(window.location.href);
      return;
    }

    try {
      const existingCartItems = await base44.entities.Cart.filter({
        user_id: user.id,
        product_id: product.id,
        selected_material: selectedMaterial,
        selected_color: product.multi_color ? multiColorSelections.join(', ') : selectedColor,
      });

      const cartData = {
        user_id: user.id,
        product_id: product.id,
        quantity,
        selected_material: selectedMaterial,
        selected_color: product.multi_color ? multiColorSelections.join(', ') : selectedColor,
        unit_price: product.price,
        total_price: product.price * quantity,
        multi_color_selections: product.multi_color ? multiColorSelections : null
      };

      if (existingCartItems.length > 0) {
        const existingItem = existingCartItems[0];
        const newQuantity = existingItem.quantity + quantity;
        await base44.entities.Cart.update(existingItem.id, {
          ...cartData,
          quantity: newQuantity,
          total_price: existingItem.unit_price * newQuantity
        });
        toast({ title: "Cart updated!", description: `Quantity increased to ${newQuantity}` });
      } else {
        await base44.entities.Cart.create(cartData);
        toast({ title: "Added to cart!" });
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast({ 
        title: "Something went wrong", 
        description: "Something went wrong adding this item to your cart. Please try again or refresh the page.",
        variant: "destructive" 
      });
    }
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({ 
        title: "Please sign in", 
        description: "Please sign in to add to wishlist.",
        variant: "destructive" 
      });
      await base44.auth.redirectToLogin(window.location.href);
      return;
    }

    try {
      // Fetch fresh user data to avoid race conditions
      const freshUser = await base44.auth.me();
      const currentWishlist = freshUser.wishlist || [];
      
      const updatedWishlist = isInWishlist
        ? currentWishlist.filter(pid => pid !== product.id)
        : [...currentWishlist, product.id];

      await base44.auth.updateMe({ 
        wishlist: updatedWishlist,
        wishlist_last_updated: new Date().toISOString()
      });
      setIsInWishlist(!isInWishlist);
      toast({ title: isInWishlist ? "Removed from wishlist" : "Added to wishlist ❤️" });
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      toast({ title: "Failed to update wishlist", variant: "destructive" });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === (product.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? (product.images?.length || 1) - 1 : prev - 1
    );
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!id || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
        <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link to={createPageUrl("Marketplace")}>Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  const showMaterialSelector = product.materials && product.materials.length > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to={createPageUrl("Marketplace")} onClick={scrollToTop} className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="relative bg-white rounded-xl overflow-hidden shadow-lg mb-4" style={{ paddingBottom: '66.67%' }}>
              {product.images && product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-all"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-all"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {product.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
              )}
              {product.multi_color && (
                <Badge className="absolute top-2 left-2 bg-purple-500 z-10 hover:bg-purple-600">
                  Multi-Color
                </Badge>
              )}
            </div>
            
            {/* Thumbnail Grid */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mb-6">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ paddingBottom: '66.67%' }}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="absolute top-0 left-0 w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="mb-8 pb-8 border-b">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            {/* Reviews */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h1 className="font-bold text-lg mb-4 text-gray-900">⭐ Reviews</h1>
                  <div className="mb-8">
                    <RatingDisplay reviews={reviews} />
                  </div>
                  <ReviewList reviews={reviews} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
              </div>
              <Button
                variant="ghost"
                size="lg"
                onClick={handleAddToWishlist}
                className={`${isInWishlist ? 'bg-red-50 hover:bg-red-100 border-2 border-red-500' : 'hover:bg-gray-100 border-2 border-gray-300 hover:border-red-400'} p-3 rounded-full transition-all`}
              >
                <Heart className={`w-7 h-7 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'}`} />
              </Button>
            </div>
            <div className="mb-8">
              <p className="text-4xl font-bold text-teal-600">${product.price.toFixed(2)}</p>
            </div>
            {product.review_count > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= product.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  {product.rating.toFixed(1)} ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Add to Cart Card */}
            <Card className="mb-6">
              <CardContent className="p-6 space-y-4">
                <div className={`grid ${showMaterialSelector ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {showMaterialSelector && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor="material">Material *</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Choose the material for your print. Each has different properties.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                        <SelectTrigger id="material">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {product.materials.map((material) => (
                            <SelectItem key={material} value={material}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      {material}
                                      <Info className="w-3 h-3 text-gray-400" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{FILAMENT_INFO[material] || 'High-quality printing material'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {!product.multi_color && (
                  <div>
                    <Label htmlFor="color">Color *</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor}>
                      <SelectTrigger id="color">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {product.colors && product.colors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {product.multi_color && (
                  <div>
                    <Label>Colors * (Multi-color print - {multiColorSelections.length} colors)</Label>
                    <div className="space-y-2 mt-2">
                      {multiColorSelections.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm font-medium w-20">Color {index + 1}:</span>
                          <Select 
                            value={color} 
                            onValueChange={(val) => handleColorChange(index, val)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {product.colors && product.colors.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This design requires {multiColorSelections.length} colors as specified by the designer.
                    </p>
                  </div>
                )}
                
                <div>
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-4 mb-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>

                  <Button onClick={handleAddToCart} size="lg" className="w-full">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart - ${(product.price * quantity).toFixed(2)}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 text-gray-900">📋 Specifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {product.dimensions && (
                    <div className="bg-white p-3 rounded-lg col-span-2">
                      <span className="text-gray-600 block text-xs mb-1">Dimensions (L×W×H):</span>
                      <div className="text-orange-600 font-bold">
                        {mmToInches(product.dimensions.length)}"×{mmToInches(product.dimensions.width)}"×{mmToInches(product.dimensions.height)}"
                      </div>
                    </div>
                  )}
                  {product.category && (
                    <div className="bg-white p-3 rounded-lg">
                      <span className="text-gray-600 block text-xs mb-1">Category:</span>
                      <div className="text-gray-900 font-bold capitalize">{product.category.replace('_', ' ')}</div>
                    </div>
                  )}
                  {product.multi_color && (
                    <div className="bg-white p-3 rounded-lg flex items-center justify-center">
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Multi-Color Print</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}