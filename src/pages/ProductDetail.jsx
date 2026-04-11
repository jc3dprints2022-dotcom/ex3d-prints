import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Heart, Star, Loader2, ChevronLeft, ChevronRight, Package, Box, User, ArrowRight } from "lucide-react";
import ReviewList from "../components/shared/ReviewList";
import RatingDisplay from "../components/shared/RatingDisplay";
import { Label } from "@/components/ui/label";
import Model3DViewer from "../components/shared/Model3DViewer";
import ProductCard from "../components/marketplace/ProductCard";



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
  const fromDesignDrop = urlParams.get('from') === 'designdrop';
  const dropPrice = fromDesignDrop ? 10 : null;
  
  const [product, setProduct] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [view3D, setView3D] = useState(false);
  const [current3DFileIndex, setCurrent3DFileIndex] = useState(0);
  const [multiColorSelections, setMultiColorSelections] = useState([]);
  const [designer, setDesigner] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});

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

  const loadProduct = async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true);
    try {
      if (!id) {
        setLoading(false);
        return;
      }
      
      // Fetch product with proper error handling
      let productData;
      try {
        productData = await base44.entities.Product.get(id);
      } catch (getError) {
        // If direct get fails, try filtering by ID as fallback
        const products = await base44.entities.Product.filter({ id });
        productData = products[0];
        if (!productData) throw new Error('Product not found');
      }
      
      setProduct(productData);
      setLoading(false);

      // Axon: view_item
      if (typeof window.axon === 'function') {
        window.axon('track', 'view_item', {
          currency: 'USD',
          value: productData.price,
          items: [{
            item_id: productData.id,
            item_name: productData.name,
            item_category: productData.category || '',
            item_variant: productData.variants?.length > 0 ? productData.variants[0].type : '',
            image_url: productData.images?.[0] || '',
            price: productData.price,
            quantity: 1
          }]
        });
      }

      if (productData.materials?.length > 0) setSelectedMaterial(productData.materials[0]);
      if (productData.colors?.length > 0) setSelectedColor(productData.colors[0]);

      if (productData.multi_color) {
        const numColors = productData.number_of_colors || 2;
        setMultiColorSelections(
          Array.from({ length: numColors }, (_, i) => productData.colors?.[i] || productData.colors?.[0] || 'Black')
        );
      }

      // Background: update view count, load reviews, related products, designer
      base44.entities.Product.update(id, { view_count: (productData.view_count || 0) + 1 }).catch(() => {});

      // Load reviews in background (non-blocking)
      base44.entities.Review.filter({ product_id: id }).then(async (productReviews) => {
        const filtered = productReviews.filter(r => r.review_type === 'product');
        let reviewsWithNames = filtered.map(r => ({ ...r, customer_name: 'Anonymous' }));
        try {
          const allUsers = await base44.entities.User.list();
          reviewsWithNames = filtered.map(review => {
            const customer = allUsers.find(u => u.id === review.customer_id);
            return { ...review, customer_name: customer?.full_name || 'Anonymous' };
          });
        } catch (_) {}
        setReviews(reviewsWithNames);
        const reviewCount = reviewsWithNames.length;
        const avgRating = reviewCount > 0 ? reviewsWithNames.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
        setProduct(prev => ({ ...prev, rating: avgRating, review_count: reviewCount }));
        if (productData.rating !== avgRating || productData.review_count !== reviewCount) {
          base44.entities.Product.update(id, { rating: avgRating, review_count: reviewCount }).catch(() => {});
        }
      }).catch(() => {});

      if (productData.designer_id) {
        base44.entities.User.get(productData.designer_id).then(d => setDesigner(d)).catch(() => {});
      }

      // Load all active products for carousels in background
      base44.entities.Product.filter({ status: 'active' }).then(activeProds => {
        setAllProducts(activeProds);
        const related = activeProds
          .filter(p => p.category === productData.category && p.id !== productData.id)
          .slice(0, 10);
        setRelatedProducts(related);
      }).catch(() => {});

    } catch (error) {
      if (retryCount < 2) {
        setTimeout(() => loadProduct(retryCount + 1), 1200 * (retryCount + 1));
        return;
      }
      console.error("Failed to load product:", error);
      setLoading(false);
    }
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

      const effectivePrice = dropPrice !== null ? dropPrice : product.price;
      const cartData = {
        user_id: user.id,
        product_id: product.id,
        quantity,
        selected_material: selectedMaterial,
        selected_color: product.multi_color ? multiColorSelections.join(', ') : selectedColor,
        unit_price: effectivePrice,
        total_price: effectivePrice * quantity,
        multi_color_selections: product.multi_color ? multiColorSelections : null,
        ...(dropPrice !== null ? { is_design_drop: true } : {})
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

      // Axon: add_to_cart
      if (typeof window.axon === 'function') {
        const variantLabel = Object.entries(selectedVariants).map(([type, opt]) => `${type}:${opt.name}`).join(', ');
        window.axon('track', 'add_to_cart', {
          currency: 'USD',
          value: (dropPrice ?? product.price) * quantity,
          items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.category || '',
            item_variant: variantLabel,
            image_url: product.images?.[0] || '',
            price: dropPrice ?? product.price,
            quantity
          }]
        });
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

  if (!loading && (!id || !product)) {
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
  
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  const showMaterialSelector = product.materials && product.materials.length > 1;

  const getEffectivePrice = () => {
    // If a variant option with a price is selected, use it
    const variantPrices = Object.values(selectedVariants).filter(opt => opt.price !== '' && opt.price !== undefined && !isNaN(parseFloat(opt.price)));
    if (variantPrices.length > 0) return parseFloat(variantPrices[0].price);
    return dropPrice !== null ? dropPrice : product.price;
  };
  const effectivePrice = getEffectivePrice();

  const hasVariants = product.variants && product.variants.length > 0;

  const handleVariantChange = (variantType, optionName, optionPrice) => {
    setSelectedVariants(prev => ({ ...prev, [variantType]: { name: optionName, price: optionPrice } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-bottom">
      {/* Mobile Back Button Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b dark:border-gray-700 safe-area-top shadow-sm">
        <div className="flex items-center px-4 h-14">
          <Link to={fromDesignDrop ? createPageUrl("DesignDrop") : createPageUrl("Marketplace")} onClick={scrollToTop} className="inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 touch-target">
            <ChevronLeft className="w-6 h-6 mr-1" />
            <span className="font-medium">{fromDesignDrop ? 'Back to Drop' : 'Back'}</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <Link to={fromDesignDrop ? createPageUrl("DesignDrop") : createPageUrl("Marketplace")} onClick={scrollToTop} className="hidden md:inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 mb-8 touch-target">
          <ChevronLeft className="w-5 h-5 mr-1" />
          {fromDesignDrop ? 'Back to Design Drop' : 'Back to Marketplace'}
        </Link>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Product Info - Mobile */}
          <div className="md:hidden">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            {fromDesignDrop && <div className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full mb-2">🎉 Design Drop Special</div>}
            <p className="text-3xl font-bold text-teal-600 mb-4">
              ${dropPrice !== null ? dropPrice.toFixed(2) : product.price.toFixed(2)}
              {dropPrice !== null && <span className="text-lg text-gray-400 line-through ml-2">${product.price.toFixed(2)}</span>}
            </p>
            {product.review_count > 0 ? (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= product.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.rating.toFixed(1)} ({product.review_count})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-6 text-gray-500 text-sm">
                <Star className="w-4 h-4 text-gray-300" />
                <span>No reviews yet</span>
              </div>
            )}
          </div>

          {/* Image Gallery / 3D Viewer */}
          <div>
            {/* View Toggle */}
            {product.print_files && product.print_files.length > 0 && (
              <div className="flex gap-2 mb-4">
                <Button
                  variant={!view3D ? "default" : "outline"}
                  onClick={() => setView3D(false)}
                  className="flex-1"
                >
                  Photos
                </Button>
                <Button
                  variant={view3D ? "default" : "outline"}
                  onClick={() => setView3D(true)}
                  className="flex-1"
                >
                  <Box className="w-4 h-4 mr-2" />
                  3D View
                </Button>
              </div>
            )}

            {!view3D ? (
              <div className="space-y-4">
                <div className="relative bg-white rounded-xl overflow-hidden shadow-lg mb-4" style={{ paddingBottom: '66.67%' }}>
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img
                        src={product.images[currentImageIndex]}
                        alt={product.name}
                        className="absolute top-0 left-0 w-full h-full object-cover"
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
                  <div className="grid grid-cols-5 gap-2">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ paddingBottom: '66.67%' }}
                      >
                        <img src={img} alt={`${product.name} ${idx + 1}`} className="absolute top-0 left-0 w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                  <Model3DViewer 
                    fileUrl={product.print_files[current3DFileIndex]} 
                    selectedColor={product.multi_color ? multiColorSelections[0] : selectedColor}
                    className="h-96" 
                  />
                </div>
                
                {/* 3D File Thumbnails */}
                {product.print_files && product.print_files.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {product.print_files.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrent3DFileIndex(idx)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all p-4 bg-white ${
                          idx === current3DFileIndex ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Box className="w-8 h-8 mx-auto text-gray-600" />
                        <p className="text-xs text-center mt-2 text-gray-600">File {idx + 1}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Mobile - Price and Options */}
            <div className="md:hidden">
              <Card className="mb-6">
                <CardContent className="p-4 space-y-4">
                  {hasVariants && product.variants.map((variant, vi) => (
                    <div key={vi}>
                      <Label htmlFor={`variant-mobile-${vi}`}>{variant.type} *</Label>
                      <Select
                        value={selectedVariants[variant.type]?.name || ''}
                        onValueChange={(val) => {
                          const opt = variant.options.find(o => o.name === val);
                          handleVariantChange(variant.type, val, variant.same_price ? variant.base_price : opt?.price);
                        }}
                      >
                        <SelectTrigger id={`variant-mobile-${vi}`}>
                          <SelectValue placeholder={`Select ${variant.type}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {variant.options.map((opt) => (
                            <SelectItem key={opt.name} value={opt.name}>
                              {opt.name}{!variant.same_price && opt.price ? ` — $${parseFloat(opt.price).toFixed(2)}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  {showMaterialSelector && (
                    <div>
                      <Label htmlFor="material-mobile">Material *</Label>
                      <Select value={selectedColor} onValueChange={setSelectedColor}>
                        <SelectTrigger id="color-mobile">
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
                      <Label>Colors * ({multiColorSelections.length} colors)</Label>
                      <div className="space-y-2 mt-2">
                        {multiColorSelections.map((color, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-16">Color {index + 1}:</span>
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

                    <Button onClick={handleAddToCart} size="lg" className="w-full mb-2">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart - ${(effectivePrice * quantity).toFixed(2)}
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleAddToWishlist}
                      className={`w-full ${isInWishlist ? 'bg-red-50 hover:bg-red-100 border-red-500' : 'hover:bg-gray-100'}`}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Designer Info */}
            {designer && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-2">Designed by</p>
                  <Link 
                    to={`${createPageUrl("DesignerProfile")}?id=${designer.id}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {designer.profile_image ? (
                      <img
                        src={designer.profile_image}
                        alt={designer.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{designer.full_name}</p>
                      {designer.designer_name && (
                        <p className="text-sm text-gray-600">@{designer.designer_name}</p>
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <div className="mb-8 pb-8 border-b">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
              <p className="text-sm text-gray-500 mt-3 italic">Exact color and quality of print may vary.</p>
            </div>

            {/* Reviews - Compact Carousel */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h1 className="font-bold text-lg mb-4 text-gray-900">⭐ Reviews</h1>
                  <div className="mb-4">
                    <RatingDisplay reviews={reviews} />
                  </div>
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 pb-4" style={{ minWidth: 'min-content' }}>
                      {reviews.length > 0 ? (
                        reviews.map((review) => (
                          <Card key={review.id} className="flex-shrink-0" style={{ width: '320px' }}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {review.title && (
                                <h4 className="font-semibold text-gray-900 mb-1 text-sm">{review.title}</h4>
                              )}
                              {review.comment && (
                                <p className="text-gray-700 text-sm mb-2 line-clamp-3">{review.comment}</p>
                              )}
                              <div className="text-xs text-gray-500">
                                by {review.customer_name || 'Anonymous'}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 w-full">
                          No reviews yet. Be the first to leave a review!
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Info - Desktop */}
          <div className="hidden md:block">
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
              {fromDesignDrop && <div className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full mb-2">🎉 Design Drop Special</div>}
              <p className="text-4xl font-bold text-teal-600">
                ${dropPrice !== null ? dropPrice.toFixed(2) : product.price.toFixed(2)}
                {dropPrice !== null && <span className="text-2xl text-gray-400 line-through ml-2">${product.price.toFixed(2)}</span>}
              </p>
            </div>
            {product.review_count > 0 ? (
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
            ) : (
              <div className="flex items-center gap-2 mb-6 text-gray-500">
                <Star className="w-5 h-5 text-gray-300" />
                <span>No reviews yet. Be the first to leave a review!</span>
              </div>
            )}

            {/* Add to Cart Card */}
            <Card className="mb-6">
              <CardContent className="p-6 space-y-4">
                {hasVariants && product.variants.map((variant, vi) => (
                  <div key={vi}>
                    <Label htmlFor={`variant-desktop-${vi}`}>{variant.type} *</Label>
                    <Select
                      value={selectedVariants[variant.type]?.name || ''}
                      onValueChange={(val) => {
                        const opt = variant.options.find(o => o.name === val);
                        handleVariantChange(variant.type, val, variant.same_price ? variant.base_price : opt?.price);
                      }}
                    >
                      <SelectTrigger id={`variant-desktop-${vi}`}>
                        <SelectValue placeholder={`Select ${variant.type}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {variant.options.map((opt) => (
                          <SelectItem key={opt.name} value={opt.name}>
                            {opt.name}{!variant.same_price && opt.price ? ` — $${parseFloat(opt.price).toFixed(2)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {showMaterialSelector && (
                  <div>
                    <Label htmlFor="material">Material *</Label>
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
                    Add to Cart - ${(effectivePrice * quantity).toFixed(2)}
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

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Related Products</h2>
              <Button asChild variant="ghost" className="text-teal-600 hover:text-teal-700">
                <Link to={createPageUrl("Marketplace")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
                  See More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
                {relatedProducts.map((relatedProduct) => (
                  <div key={relatedProduct.id} className="flex-shrink-0" style={{ width: '280px' }}>
                    <ProductCard product={relatedProduct} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* For You Carousel */}
        {user && user.recently_viewed && user.recently_viewed.length > 0 && (
          <div className="mt-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">For You</h2>
              <Button asChild variant="ghost" className="text-teal-600 hover:text-teal-700">
                <Link to={createPageUrl("Marketplace")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
                  See More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
                {allProducts
                  .filter(p => user.recently_viewed.slice(0, 5).some(id => 
                    allProducts.find(rp => rp.id === id && rp.category === p.category)
                  ) && p.id !== product.id)
                  .slice(0, 10)
                  .map((rec) => (
                    <div key={rec.id} className="flex-shrink-0" style={{ width: '280px' }}>
                      <ProductCard product={rec} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular Products */}
        <div className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popular Products</h2>
            <Button asChild variant="ghost" className="text-green-600 hover:text-green-700">
              <Link to={`${createPageUrl("Marketplace")}?viewAll=true&sortBy=popular`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
                See More
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
              {[...allProducts]
                .filter(p => p.id !== product.id)
                .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                .slice(0, 10)
                .map((pop) => (
                  <div key={pop.id} className="flex-shrink-0" style={{ width: '280px' }}>
                    <ProductCard product={pop} />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Newest Products */}
        <div className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Newest Products</h2>
            <Button asChild variant="ghost" className="text-green-600 hover:text-green-700">
              <Link to={`${createPageUrl("Marketplace")}?viewAll=true&sortBy=newest`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
                See More
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
              {[...allProducts]
                .filter(p => p.id !== product.id)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .slice(0, 10)
                .map((newest) => (
                  <div key={newest.id} className="flex-shrink-0" style={{ width: '280px' }}>
                    <ProductCard product={newest} />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Marketplace Button */}
        <div className="flex justify-center mt-12">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg">
            <Link to={createPageUrl("Marketplace")} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Browse Marketplace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}