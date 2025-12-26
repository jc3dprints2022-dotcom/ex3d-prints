
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Star, FileText, Check, X, Clock, AlertCircle, CheckCircle, Users, PlusCircle, XCircle, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReviewModal from "../components/consumer/ReviewModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AnnouncementBanner from "../components/shared/AnnouncementBanner";
import ProductCard from "../components/marketplace/ProductCard";
import ExpRedeemTab from "../components/consumer/ExpRedeemTab";
import ReferralTab from "../components/consumer/ReferralTab";

export default function ConsumerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true); // Specific loading state for orders
  const [orders, setOrders] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [makerApplication, setMakerApplication] = useState(null);
  const [designerApplication, setDesignerApplication] = useState(null);
  const [reviewingOrder, setReviewingOrder] = useState(null);
  const [reviewType, setReviewType] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState(null); // New state for tracking order being updated
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [processing, setProcessing] = useState(false); // New state for processing quote actions
  const { toast } = useToast();
  const navigate = useNavigate();

  // Renamed and refactored loadUserData to loadDashboardData
  const loadDashboardData = useCallback(async (currentUser) => {
    try {
      setLoading(true); // Overall dashboard loading
      setLoadingOrders(true); // Specific for orders

      const [orderData, requestData, allProducts] = await Promise.all([
        base44.entities.Order.filter({ customer_id: currentUser.id }, '-created_date'),
        base44.entities.CustomPrintRequest.filter({ customer_id: currentUser.id }, '-created_date'),
        base44.entities.Product.list()
      ]);

      // Enrich orders with product names and images
      const enrichedOrders = orderData.map(order => {
        const enrichedItems = order.items?.map(item => {
          const product = allProducts.find(p => p.id === item.product_id);
          return {
            ...item,
            product_name: item.product_name || product?.name || 'Custom Print',
            images: item.images || product?.images || []
          };
        });
        return {
          ...order,
          items: enrichedItems
        };
      });
      
      setOrders(enrichedOrders);
      setLoadingOrders(false); // Orders loading ends
      setCustomRequests(requestData);

      // Safely load maker application
      if (currentUser.maker_application_id) {
        try {
          const makerApp = await base44.entities.MakerApplication.get(currentUser.maker_application_id);
          setMakerApplication(makerApp);
        } catch (error) {
          console.log('Maker application not found or deleted:', error.message);
          setMakerApplication(null);
          // Clear the invalid reference
          try {
            await base44.auth.updateMe({ maker_application_id: null });
          } catch (updateError) {
            console.error('Failed to clear invalid maker_application_id:', updateError);
          }
        }
      } else {
        setMakerApplication(null);
      }

      // Safely load designer application
      if (currentUser.designer_application_id) {
        try {
          const designerApp = await base44.entities.DesignerApplication.get(currentUser.designer_application_id);
          setDesignerApplication(designerApp);
        } catch (error) {
          console.log('Designer application not found or deleted:', error.message);
          setDesignerApplication(null);
          // Clear the invalid reference
          try {
            await base44.auth.updateMe({ designer_application_id: null });
          } catch (updateError) {
            console.error('Failed to clear invalid designer_application_id:', updateError);
          }
        }
      } else {
        setDesignerApplication(null);
      }

    } catch (error) {
      toast({ title: "Failed to load dashboard", variant: "destructive" });
      console.error(error);
    } finally {
      setLoading(false); // Overall dashboard loading ends
    }
  }, [toast]);

  const checkAuthAndLoad = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        await base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(currentUser);
      loadDashboardData(currentUser); // Call the refactored data loading function
      loadRecentlyViewed();
      loadRecommendedProducts(currentUser);
    } catch (error) {
      console.error("Authentication check failed:", error);
      await base44.auth.redirectToLogin(window.location.href);
    }
  };

  const loadRecentlyViewed = async () => {
    try {
      const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      if (recentlyViewedIds.length === 0) return;

      const products = await Promise.all(
        recentlyViewedIds.slice(0, 6).map(id => 
          base44.entities.Product.get(id).catch(() => null)
        )
      );
      setRecentlyViewedProducts(products.filter(p => p !== null && p.status === 'active'));
    } catch (error) {
      console.error('Failed to load recently viewed:', error);
    }
  };

  const loadRecommendedProducts = async (currentUser) => {
    try {
      // Get user's order history to find their preferred categories
      const userOrders = await base44.entities.Order.filter({ customer_id: currentUser.id });
      const orderedProductIds = userOrders.flatMap(order => 
        order.items?.map(item => item.product_id) || []
      );

      const orderedProducts = await Promise.all(
        orderedProductIds.map(id => 
          base44.entities.Product.get(id).catch(() => null)
        )
      );

      const categories = [...new Set(orderedProducts.filter(p => p).map(p => p.category))];

      // Get products from those categories
      const allProducts = await base44.entities.Product.filter({ status: 'active' });
      const categoryMatches = allProducts.filter(p => 
        categories.includes(p.category) && !orderedProductIds.includes(p.id)
      );

      // Sort by view count and rating
      const sorted = categoryMatches.sort((a, b) => {
        const scoreA = (a.view_count || 0) + (a.rating || 0) * 10;
        const scoreB = (b.view_count || 0) + (b.rating || 0) * 10;
        return scoreB - scoreA;
      });

      setRecommendedProducts(sorted.slice(0, 6));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
    
    // Check for payment success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast({ 
        title: "Payment successful!", 
        description: "Your order has been placed and assigned to a maker." 
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []); // Empty dependency array means it runs once on mount

  const handleReviewOrder = (order) => { // Refactored to accept only order, type defaults to 'product'
    setReviewingOrder(order);
    setReviewType('product');
  };

  const handleReviewSuccess = () => {
    // After a review, reload data. `loadDashboardData` needs the `user` object.
    if (user) {
      loadDashboardData(user);
    } else {
      // Fallback in case user state isn't immediately available (shouldn't happen with current flow)
      checkAuthAndLoad(); 
    }
    setReviewingOrder(null);
    setReviewType(null);
  };

  const handleAcceptQuote = async (request) => {
    // Check if quote is still valid (within 30 days of acceptance)
    if (request.status === 'accepted' && request.accepted_date) {
      const acceptedDate = new Date(request.accepted_date);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      if (acceptedDate < thirtyDaysAgo) {
        toast({
          title: "Quote expired",
          description: "This quote has expired. Please request a new quote.",
          variant: "destructive"
        });
        return;
      }
    }

    const isFirstAcceptance = request.status === 'quoted';
    const actionText = isFirstAcceptance ? 'Accept' : 'Add to cart again';
    
    if (!confirm(`${actionText} quote of $${request.quoted_price?.toFixed(2)} for "${request.title}"?`)) {
      return;
    }

    setProcessing(true);
    try {
      console.log('Adding custom request to cart:', request);
      
      // Add the custom request to cart with proper identification
      const cartItem = await base44.entities.Cart.create({
        user_id: user.id,
        product_id: request.id,
        product_name: request.title,
        custom_request_id: request.id,
        quantity: request.quantity || 1,
        selected_material: request.material_preference || 'PLA',
        selected_color: request.color_preference || 'White',
        selected_resolution: 0.2,
        unit_price: request.quoted_price,
        total_price: (request.quoted_price * (request.quantity || 1)),
        print_file_scale: 100
      });
      
      console.log('Cart item created:', cartItem);

      // Only update status to accepted on first acceptance
      if (isFirstAcceptance) {
        await base44.entities.CustomPrintRequest.update(request.id, {
          status: 'accepted',
          accepted_date: new Date().toISOString()
        });
        console.log('Custom request status updated to accepted');
      }

      // Trigger cart update event
      window.dispatchEvent(new Event('cartUpdated'));

      toast({
        title: isFirstAcceptance ? "Quote accepted!" : "Added to cart!",
        description: "Your custom request has been added to your cart. Proceed to checkout to complete your order."
      });

      if (user) {
        await loadDashboardData(user);
      }
    } catch (error) {
      console.error('Failed to accept quote:', error);
      toast({
        title: "Failed to accept quote",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineQuote = async (request) => {
    if (!confirm(`Are you sure you want to decline the quote for "${request.title}"?`)) {
      return;
    }

    setProcessing(true);
    try {
      await base44.entities.CustomPrintRequest.update(request.id, {
        status: 'declined'
      });
      toast({ title: "Quote Declined", description: "The custom print request has been marked as declined." });
      if (user) {
        await loadDashboardData(user); // Reload all dashboard data including custom requests
      }
    } catch (error) {
      console.error("Failed to decline quote:", error);
      toast({
        title: "Failed to decline quote",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder || !cancellationReason.trim()) {
      toast({ title: "Please provide a cancellation reason", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await base44.functions.invoke('cancelOrderWithRefund', {
        orderId: cancellingOrder.id,
        cancellationReason: cancellationReason
      });

      if (data?.success) {
        toast({ 
          title: "Order cancelled successfully",
          description: "Your refund will be processed within 5-10 business days." 
        });
      } else {
        throw new Error(error?.message || data?.error || 'Cancellation failed');
      }

      setCancellingOrder(null);
      setCancellationReason('');
      
      if (user) {
        loadDashboardData(user);
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast({ 
        title: "Failed to cancel order", 
        variant: "destructive", 
        description: error.message 
      });
    }
  };

  const handleConfirmPickup = async (orderId) => {
    if (!confirm("Have you picked up this order from the cabinet?")) {
      return;
    }

    setUpdatingOrder(orderId);
    try {
      const { data, error } = await base44.functions.invoke('confirmPickup', { 
        orderId: orderId 
      });

      if (data?.success) {
        toast({ 
          title: "Pickup confirmed!", 
          description: "Thank you for confirming your pickup" 
        });
        if (user) {
          loadDashboardData(user);
        }
      } else {
        throw new Error(error?.message || 'Failed to confirm pickup');
      }
    } catch (error) {
      console.error("Confirm pickup error:", error);
      toast({ 
        title: "Failed to confirm pickup", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
      case 'accepted':
      case 'approved':
      case 'dropped_off':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'printing':
      case 'quoted':
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
      case 'declined':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin" /></div>;
  }
  
  const pendingApplications = (makerApplication?.status === 'pending' || designerApplication?.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.full_name || 'there'}!</h1>
          <p className="text-gray-600">Manage your orders and account</p>
        </div>

        <AnnouncementBanner userRole="consumer" userId={user?.id} />

        {pendingApplications && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Application Status:</strong>
              {makerApplication?.status === 'pending' && <span className="ml-2">Your Maker application is under review.</span>}
              {designerApplication?.status === 'pending' && <span className="ml-2">Your Designer application is under review.</span>}
            </AlertDescription>
          </Alert>
        )}

        {(makerApplication?.status === 'approved' || designerApplication?.status === 'approved') && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Congratulations! Your maker status has been approved. Access your Maker Dashboard under the For Makers tab.</strong>
              {makerApplication?.status === 'approved' && !user.maker_id && <span className="ml-2">Your Maker application has been approved! Complete your subscription to access your Maker Dashboard.</span>}
              {designerApplication?.status === 'approved' && !user.designer_id && <span className="ml-2">Your Designer application has been approved! Complete your subscription to access your Designer Dashboard.</span>}
            </AlertDescription>
          </Alert>
        )}

        {(makerApplication?.status === 'rejected' || designerApplication?.status === 'rejected') && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Application Update:</strong>
              {makerApplication?.status === 'rejected' && <span className="ml-2">Your Maker application was not approved. Check your email for details.</span>}
              {designerApplication?.status === 'rejected' && <span className="ml-2">Your Designer application was not approved. Check your email for details.</span>}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders"><Package className="w-4 h-4 mr-2"/>Orders</TabsTrigger>
            <TabsTrigger value="custom-requests"><FileText className="w-4 h-4 mr-2"/>Custom Quotes ({customRequests.filter(r => r.status === 'quoted').length})</TabsTrigger>
            <TabsTrigger value="exp"><Star className="w-4 h-4 mr-2"/>Redeem EXP</TabsTrigger>
            <TabsTrigger value="referral"><Users className="w-4 h-4 mr-2"/>Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-6 h-6 text-teal-600" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      return (
                        <Card key={order.id} className="border-2">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-lg">Order #{order.id.slice(-8)}</h3>
                                  <Badge className={
                                    order.status === 'delivered' || order.status === 'dropped_off' ? 'bg-green-500' :
                                    order.status === 'printing' ? 'bg-blue-500' :
                                    order.status === 'cancelled' ? 'bg-red-500' :
                                    order.status === 'unassigned' ? 'bg-gray-500' :
                                    'bg-yellow-500'
                                  }>
                                    {order.status.replace('_', ' ')}
                                  </Badge>
                                  {order.is_priority && (
                                    <Badge className="bg-orange-500">⚡ Priority</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  Placed: {new Date(order.created_date).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Total: ${order.total_amount.toFixed(2)}{order.is_priority ? ' (includes $4 priority)' : ''}
                                </p>
                                
                                {/* Expanded Order Details */}
                                <div className="mt-4 space-y-2 text-sm">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <div>
                                      <span className="font-semibold text-gray-700">Customer Name:</span>
                                      <p className="text-gray-600">{user?.full_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-700">Email:</span>
                                      <p className="text-gray-600">{user?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-700">Payment Status:</span>
                                      <Badge className={order.payment_status === 'paid' ? 'bg-green-500' : order.payment_status === 'refunded' ? 'bg-gray-500' : 'bg-yellow-500'}>
                                        {order.payment_status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {(order.status === 'delivered' || order.status === 'dropped_off') && !order.review_submitted && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleReviewOrder(order)}
                                    className="bg-teal-600 hover:bg-teal-700"
                                  >
                                    <Star className="w-4 h-4 mr-2" />
                                    Leave Review
                                  </Button>
                                )}
                                {order.status === 'dropped_off' && !order.picked_up_at && (
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleConfirmPickup(order.id)}
                                    disabled={updatingOrder === order.id}
                                  >
                                    {updatingOrder === order.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                    )}
                                    Confirm I Picked This Up
                                  </Button>
                                )}
                                {(order.status === 'pending' || order.status === 'accepted') && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setCancellingOrder(order)}
                                    className="border-red-500 text-red-500 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel & Refund
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3 border-t pt-4">
                              <h4 className="font-semibold text-sm text-gray-700">Order Items:</h4>
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                                  {item.images?.[0] && (
                                    <img 
                                      src={item.images[0]} 
                                      alt={item.product_name}
                                      className="w-16 h-16 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-semibold">{item.product_name}</p>
                                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                                      <p><span className="font-medium">Material:</span> {item.selected_material}</p>
                                      <p><span className="font-medium">Color:</span> {item.selected_color}</p>
                                      <p><span className="font-medium">Resolution:</span> {item.selected_resolution}mm</p>
                                      <p><span className="font-medium">Quantity:</span> {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}</p>
                                      {item.weight_grams && (
                                        <p><span className="font-medium">Weight:</span> {item.weight_grams}g</p>
                                      )}
                                      {item.print_time_hours && (
                                        <p><span className="font-medium">Est. Print Time:</span> {item.print_time_hours}h</p>
                                      )}
                                      {item.print_files && item.print_files.length > 0 && (
                                        <p className="text-xs text-blue-600">
                                          <span className="font-medium">Files:</span> {item.print_files.length} file(s)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Maker Assignment Info */}
                            {/*
                            {order.maker_id ? (
                              
                              <div className="mt-4 pt-4 border-t">
                                <div className="bg-teal-50 p-3 rounded-lg">
                                  <p className="text-sm font-semibold text-teal-900 mb-2">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Assigned Maker
                                  </p>
                                  <div className="text-sm text-teal-800 space-y-1">
                                    <p><span className="font-medium">Maker ID:</span> {order.maker_id}</p>
                                    {order.actual_print_hours && (
                                      <p><span className="font-medium">Actual Print Time:</span> {order.actual_print_hours} hours</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                            ) : (
                              <div className="mt-4 pt-4 border-t">
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                  <p className="text-sm font-semibold text-yellow-900">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Awaiting Maker Acceptance
                                  </p>
                                  <p className="text-xs text-yellow-800 mt-1">
                                    Your order will be assigned to a maker shortly
                                  </p>
                                </div>
                              </div>
                            )}
                            */}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom-requests" className="mt-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  My Custom Print Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">No custom requests yet</p>
                    <Button onClick={() => window.location.href = '/CustomPrintRequest'} className="bg-teal-600 hover:bg-teal-700">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create Custom Request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customRequests.map(request => {
                      // Check if quote is expired (30 days since acceptance)
                      const isExpired = request.status === 'accepted' && request.accepted_date && 
                        new Date(request.accepted_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      
                      // Calculate days remaining
                      let daysRemaining = null;
                      if (request.status === 'accepted' && request.accepted_date) {
                        const acceptedDate = new Date(request.accepted_date);
                        const expiryDate = new Date(acceptedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                        const now = new Date();
                        daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
                      }

                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{request.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                            </div>
                            <Badge className={
                              request.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'accepted' && !isExpired ? 'bg-green-100 text-green-800' :
                              request.status === 'accepted' && isExpired ? 'bg-gray-100 text-gray-800' :
                              request.status === 'declined' ? 'bg-red-100 text-red-800' :
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {isExpired ? 'expired' : request.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                              <span className="text-gray-600">Material:</span>
                              <span className="ml-2 font-medium">{request.material_preference || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Color:</span>
                              <span className="ml-2 font-medium">{request.color_preference || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <span className="ml-2 font-medium">{request.quantity || 1}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Submitted:</span>
                              <span className="ml-2 font-medium">{new Date(request.created_date).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {request.status === 'quoted' && request.quoted_price && (
                            <div className="bg-blue-50 p-4 rounded-lg mb-3 border border-blue-200">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-blue-900">Quote Received</h4>
                                <span className="text-2xl font-bold text-blue-900">${request.quoted_price.toFixed(2)}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm text-blue-800 mb-3">
                                <div>
                                  <span className="font-medium">Print Time:</span>
                                  <span className="ml-1">{request.print_time_hours}h</span>
                                </div>
                                <div>
                                  <span className="font-medium">Weight:</span>
                                  <span className="ml-1">{request.weight_grams}g</span>
                                </div>
                                <div>
                                  <span className="font-medium">Dimensions:</span>
                                  <span className="ml-1">
                                    {request.dimensions?.length && request.dimensions?.width && request.dimensions?.height
                                      ? `${request.dimensions.length} × ${request.dimensions.width} × ${request.dimensions.height} mm`
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                              </div>
                              {request.admin_notes && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-blue-900 mb-1">Additional Notes:</p>
                                  <p className="text-sm text-blue-800">{request.admin_notes}</p>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => handleAcceptQuote(request)}
                                  disabled={processing}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                  Accept Quote & Add to Cart
                                </Button>
                                <Button 
                                  onClick={() => handleDeclineQuote(request)}
                                  disabled={processing}
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                  Decline Quote
                                </Button>
                              </div>
                            </div>
                          )}

                          {request.status === 'accepted' && !isExpired && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <div className="flex justify-between items-center mb-2">
                                <div>
                                  <p className="text-sm font-semibold text-green-900">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    Quote Accepted - Valid for {daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'}
                                  </p>
                                  <p className="text-xs text-green-700 mt-1">
                                    Price: ${request.quoted_price.toFixed(2)} | You can add this to cart multiple times before it expires
                                  </p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleAcceptQuote(request)}
                                disabled={processing}
                                className="bg-teal-600 hover:bg-teal-700 mt-2"
                                size="sm"
                              >
                                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                                Add to Cart Again
                              </Button>
                            </div>
                          )}

                          {request.status === 'accepted' && isExpired && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-800">
                                <Clock className="w-4 h-4 inline mr-1" />
                                This quote has expired (30 days have passed). Please submit a new custom request for an updated quote.
                              </p>
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <p className="text-sm text-yellow-800">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Your request is being reviewed. You'll receive a quote soon.
                              </p>
                            </div>
                          )}

                          {(request.images && request.images.length > 0) && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Reference Images:</p>
                              <div className="flex gap-2">
                                {request.images.slice(0, 3).map((img, idx) => (
                                  <img key={idx} src={img} alt={`Reference ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="exp" className="mt-6">
            <ExpRedeemTab user={user} onUpdate={checkAuthAndLoad} />
          </TabsContent>

          <TabsContent value="referral" className="mt-6">
            <ReferralTab user={user} onUpdate={checkAuthAndLoad} />
          </TabsContent>
        </Tabs>

        {/* Recently Viewed Section */}
        {recentlyViewedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recently Viewed</h2>
            <div className="relative">
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {recentlyViewedProducts.map(product => (
                  <div key={product.id} className="flex-shrink-0" style={{ width: '280px' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommended Section */}
        {recommendedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommended For You</h2>
            <div className="relative">
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {recommendedProducts.map(product => (
                  <div key={product.id} className="flex-shrink-0" style={{ width: '280px' }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ReviewModal
        isOpen={!!reviewingOrder}
        onClose={() => {
          setReviewingOrder(null);
          setReviewType(null);
        }}
        order={reviewingOrder}
        reviewType={reviewType}
        onSuccess={handleReviewSuccess}
      />

      <Dialog open={!!cancellingOrder} onOpenChange={() => {
        setCancellingOrder(null);
        setCancellationReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{cancellingOrder?.id.slice(-6)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Please provide a reason for cancellation *</Label>
            <Textarea
              id="reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g., Changed my mind, ordered by mistake, need it sooner..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCancellingOrder(null);
              setCancellationReason('');
            }}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
