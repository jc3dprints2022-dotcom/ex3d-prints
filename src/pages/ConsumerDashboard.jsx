import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Package, FileText, Gift, TrendingUp, Settings,
  Star, CheckCircle, Clock, XCircle, Truck, ThumbsUp,
  ShoppingCart, Mail, Phone, MapPin, Save, Menu, X,
  Copy, Users, Award, Eye, ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/marketplace/ProductCard";
import ExpRedeemTab from "@/components/consumer/ExpRedeemTab";
import ReferralTab from "@/components/consumer/ReferralTab";
import MakerDashboardContent from "@/components/makers/MakerDashboardContent";
import DesignerDashboardContent from "@/components/designers/DesignerDashboardContent";

export default function ConsumerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [accountFormData, setAccountFormData] = useState({
    full_name: '', phone: '', address: { street: '', city: '', state: '', zip: '' }
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllCustomRequests, setShowAllCustomRequests] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveSection(tab);
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        window.location.href = '/api/auth/login?next=' + encodeURIComponent(window.location.href);
        return;
      }
      setUser(currentUser);
      setAccountFormData({
        full_name: currentUser.full_name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || { street: '', city: '', state: '', zip: '' }
      });

      await Promise.all([
        loadOrders(currentUser),
        loadCustomRequests(currentUser),
        loadRecentlyViewed(),
        loadRecommendedProducts(currentUser)
      ]);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast({ title: "Failed to load dashboard", variant: "destructive" });
    }
    setLoading(false);
  };

  const loadOrders = async (currentUser) => {
    try {
      const userOrders = await base44.entities.Order.filter({ customer_id: currentUser.id });
      setOrders(userOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadCustomRequests = async (currentUser) => {
    try {
      const requests = await base44.entities.CustomPrintRequest.filter({ customer_id: currentUser.id });
      setCustomRequests(requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Failed to load custom requests:', error);
    }
  };

  const loadRecentlyViewed = async () => {
    try {
      const recentlyViewedIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      if (recentlyViewedIds.length === 0) {
        setRecentlyViewedProducts([]);
        return;
      }

      const products = await Promise.all(
        recentlyViewedIds.slice(0, 8).map(id => 
          base44.entities.Product.get(id).catch(() => null)
        )
      );
      setRecentlyViewedProducts(products.filter(p => p !== null && p?.status === 'active'));
    } catch (error) {
      console.error('Failed to load recently viewed:', error);
      setRecentlyViewedProducts([]);
    }
  };

  const loadRecommendedProducts = async (currentUser) => {
    try {
      const userOrders = await base44.entities.Order.filter({ customer_id: currentUser.id }).catch(() => []);
      const orderedProductIds = userOrders.flatMap(order => 
        order.items?.map(item => item.product_id) || []
      );

      const orderedProducts = await Promise.all(
        orderedProductIds.map(id => 
          base44.entities.Product.get(id).catch(() => null)
        )
      );

      const categories = [...new Set(orderedProducts.filter(p => p).map(p => p?.category).filter(Boolean))];

      const allProducts = await base44.entities.Product.filter({ status: 'active' }).catch(() => []);
      const categoryMatches = allProducts.filter(p => 
        categories.includes(p?.category) && !orderedProductIds.includes(p?.id)
      );

      const sorted = categoryMatches.sort((a, b) => {
        const scoreA = (a?.view_count || 0) + (a?.rating || 0) * 10;
        const scoreB = (b?.view_count || 0) + (b?.rating || 0) * 10;
        return scoreB - scoreA;
      });

      setRecommendedProducts(sorted.slice(0, 8));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setRecommendedProducts([]);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await base44.entities.Order.update(orderId, { 
        status: 'cancelled',
        cancellation_reason: 'Customer requested cancellation'
      });
      toast({ title: "Order cancelled successfully" });
      loadOrders(user);
    } catch (error) {
      toast({ title: "Failed to cancel order", variant: "destructive" });
    }
  };

  const handleConfirmPickup = async (orderId) => {
    if (!confirm('Confirm you have picked up this order?')) return;
    try {
      await base44.entities.Order.update(orderId, { 
        status: 'delivered',
        picked_up_at: new Date().toISOString()
      });
      toast({ title: "Pickup confirmed! Thank you!" });
      loadOrders(user);
    } catch (error) {
      toast({ title: "Failed to confirm pickup", variant: "destructive" });
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const orderItem = selectedOrder.items[0];
      await base44.entities.Review.create({
        order_id: selectedOrder.id,
        customer_id: user.id,
        product_id: orderItem.product_id,
        maker_id: selectedOrder.maker_id,
        designer_id: orderItem.designer_id,
        review_type: 'product',
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        verified_purchase: true
      });
      toast({ title: "Review submitted! Thank you for your feedback!" });
      setReviewModalOpen(false);
      setReviewData({ rating: 5, title: '', comment: '' });
    } catch (error) {
      toast({ title: "Failed to submit review", variant: "destructive" });
    }
    setSubmittingReview(false);
  };

  const handleAcceptQuote = async (request) => {
    try {
      await base44.entities.Cart.create({
        user_id: user.id,
        product_id: request.id,
        product_name: request.title,
        custom_request_id: request.id,
        quantity: request.quantity || 1,
        unit_price: request.quoted_price,
        total_price: request.quoted_price * (request.quantity || 1)
      });

      await base44.entities.CustomPrintRequest.update(request.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString()
      });

      toast({ title: "Quote accepted and added to cart!" });
      window.location.href = '/cart';
    } catch (error) {
      toast({ title: "Failed to accept quote", variant: "destructive" });
    }
  };

  const handleDeclineQuote = async (requestId) => {
    if (!confirm('Are you sure you want to decline this quote?')) return;
    try {
      await base44.entities.CustomPrintRequest.update(requestId, { status: 'declined' });
      toast({ title: "Quote declined" });
      loadCustomRequests(user);
    } catch (error) {
      toast({ title: "Failed to decline quote", variant: "destructive" });
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      await base44.auth.updateMe(accountFormData);
      toast({ title: "Account updated successfully!" });
      await loadDashboardData();
    } catch (error) {
      toast({ title: "Failed to update account", variant: "destructive" });
    }
    setSavingAccount(false);
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      toast({ title: "Referral code copied!" });
    }
  };

  const getOrderStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
      accepted: { color: "bg-blue-100 text-blue-800", icon: CheckCircle, label: "Accepted" },
      printing: { color: "bg-purple-100 text-purple-800", icon: Package, label: "Printing" },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Completed" },
      dropped_off: { color: "bg-teal-100 text-teal-800", icon: Truck, label: "Ready for Pickup" },
      delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Delivered" },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Cancelled" }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    activeOrders: orders.filter(o => ['pending', 'accepted', 'printing'].includes(o.status)).length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    pendingQuotes: customRequests.filter(r => r.status === 'pending').length,
    expBalance: user?.exp_balance || 0,
    totalReferrals: user?.total_referrals || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-teal-500" />
      </div>
    );
  }

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "orders", label: "Orders & Quotes", icon: Package },
    { id: "exp", label: "EXP / Rewards", icon: Gift },
    ...(user?.business_roles?.includes('maker') && user?.subscription_plan ? [{ id: "maker", label: "Maker Hub", icon: Package }] : []),
    ...(user?.business_roles?.includes('designer') ? [{ id: "designer", label: "Designer Studio", icon: Star }] : []),
    { id: "settings", label: "Account Settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`lg:w-64 lg:flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-24 space-y-2">
              {sidebarItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            {/* Welcome Banner */}
            {activeSection === "overview" && (
              <>
                <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2">Hi {user?.full_name?.split(' ')[0]} 👋</h2>
                    <p className="text-teal-50">Welcome back to your dashboard</p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        <span>Active Orders</span>
                      </div>
                      <div className="text-2xl font-bold text-teal-600">{stats.activeOrders}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Delivered</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{stats.deliveredOrders}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <FileText className="w-4 h-4" />
                        <span>Pending Quotes</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">{stats.pendingQuotes}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Gift className="w-4 h-4" />
                        <span>EXP Balance</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">{stats.expBalance}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Users className="w-4 h-4" />
                        <span>Referrals</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Preview */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Recent Orders</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSection("orders")}
                        >
                          View All
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {orders.slice(0, 3).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{order.items?.[0]?.product_name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          {getOrderStatusBadge(order.status)}
                        </div>
                      ))}
                      {orders.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No orders yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending Quotes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Pending Quotes</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSection("quotes")}
                        >
                          View All
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {customRequests.filter(r => r.status === 'quoted').slice(0, 3).map(request => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{request.title}</p>
                            <p className="text-xs text-gray-500">
                              ${request.quoted_price?.toFixed(2)}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Quote Ready</Badge>
                        </div>
                      ))}
                      {customRequests.filter(r => r.status === 'quoted').length === 0 && (
                        <p className="text-center text-gray-500 py-4">No pending quotes</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations Section */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-teal-600" />
                        Recently Viewed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recentlyViewedProducts.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No recently viewed products</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {recentlyViewedProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        Recommended For You
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recommendedProducts.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No recommendations yet</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {recommendedProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Orders & Quotes Section */}
            {activeSection === "orders" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-teal-600" />
                      My Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No orders yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.slice(0, showAllOrders ? orders.length : 5).map(order => (
                          <Card key={order.id} className="border-l-4 border-teal-500">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                {order.items?.[0]?.images?.[0] && (
                                  <img
                                    src={order.items[0].images[0]}
                                    alt={order.items[0].product_name}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">{order.items?.[0]?.product_name}</h3>
                                        {getOrderStatusBadge(order.status)}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <p>Order ID: #{order.id.slice(0, 8)}</p>
                                        <p>Total: ${order.total_amount?.toFixed(2)}</p>
                                        <p>Date: {new Date(order.created_date).toLocaleDateString()}</p>
                                        <p>Items: {order.items?.length || 0}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                     {order.status === 'pending' && (
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleCancelOrder(order.id)}
                                       >
                                         Cancel
                                       </Button>
                                     )}
                                     {order.status === 'dropped_off' && (
                                       <Button
                                         size="sm"
                                         className="bg-green-600 hover:bg-green-700"
                                         onClick={() => handleConfirmPickup(order.id)}
                                       >
                                         <CheckCircle className="w-4 h-4 mr-2" />
                                         Confirm Pickup
                                       </Button>
                                     )}
                                     {order.status === 'delivered' && (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => {
                                           setSelectedOrder(order);
                                           setReviewModalOpen(true);
                                         }}
                                       >
                                         <Star className="w-4 h-4 mr-2" />
                                         Leave Review
                                       </Button>
                                     )}
                                    </div>
                                    </div>
                                    </div>
                                    </div>
                                    </CardContent>
                                    </Card>
                      ))}
                      {orders.length > 5 && (
                        <Button
                          variant="outline"
                          onClick={() => setShowAllOrders(!showAllOrders)}
                          className="w-full"
                        >
                          {showAllOrders ? 'Show Less' : `Show ${orders.length - 5} More Orders`}
                          <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAllOrders ? 'rotate-90' : ''}`} />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

                  <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Custom Print Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No custom requests yet</p>
                      <Button onClick={() => window.location.href = '/custom-print-request'}>
                        Submit New Request
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customRequests.slice(0, showAllCustomRequests ? customRequests.length : 5).map(request => (
                        <Card key={request.id} className="border-l-4 border-purple-500">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                              {request.images?.[0] && (
                                <img
                                  src={request.images[0]}
                                  alt={request.title}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold">{request.title}</h3>
                                      {getOrderStatusBadge(request.status)}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                     <p>Submitted: {new Date(request.created_date).toLocaleDateString()}</p>
                                     {request.quoted_price && (
                                       <p className="font-semibold text-green-600">
                                         Quote: ${request.quoted_price.toFixed(2)}
                                       </p>
                                     )}
                                    </div>
                                    {request.admin_notes && request.status === 'quoted' && (
                                     <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                       <p className="font-medium text-blue-900">Quote Details:</p>
                                       <p className="text-blue-700">{request.admin_notes}</p>
                                     </div>
                                    )}
                                    </div>
                                    {request.status === 'quoted' && (
                                    <div className="flex flex-col gap-2">
                                     <Button
                                       onClick={() => handleAcceptQuote(request)}
                                       className="bg-green-600 hover:bg-green-700"
                                     >
                                       <ThumbsUp className="w-4 h-4 mr-2" />
                                       Accept & Add to Cart
                                     </Button>
                                     <Button
                                       variant="outline"
                                       onClick={() => handleDeclineQuote(request.id)}
                                     >
                                       Decline
                                     </Button>
                                    </div>
                                    )}
                                    </div>
                                    </div>
                                    </div>
                                    </CardContent>
                                    </Card>
                                    ))}
                                    {customRequests.length > 5 && (
                                    <Button
                                    variant="outline"
                                    onClick={() => setShowAllCustomRequests(!showAllCustomRequests)}
                                    className="w-full"
                                    >
                                    {showAllCustomRequests ? 'Show Less' : `Show ${customRequests.length - 5} More Requests`}
                                    <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${showAllCustomRequests ? 'rotate-90' : ''}`} />
                                    </Button>
                                    )}
                                    </div>
                                    )}
                                    </CardContent>
                                    </Card>
                                    </div>
                                    )}

            {/* EXP / Rewards Section */}
            {activeSection === "exp" && (
              <div className="space-y-6">
                <Tabs defaultValue="redeem" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="redeem">Redeem Your EXP</TabsTrigger>
                    <TabsTrigger value="referrals">Referrals</TabsTrigger>
                  </TabsList>
                  <TabsContent value="redeem">
                    <ExpRedeemTab user={user} onUpdate={loadDashboardData} />
                  </TabsContent>
                  <TabsContent value="referrals">
                    <ReferralTab user={user} />
                  </TabsContent>
                </Tabs>
              </div>
            )}



            {/* Maker Hub Section */}
            {activeSection === "maker" && user?.business_roles?.includes('maker') && (
              <>
                {!user?.subscription_plan ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Package className="w-16 h-16 mx-auto text-orange-400 mb-4" />
                      <h3 className="text-xl font-bold mb-2">Subscription Required</h3>
                      <p className="text-gray-600 mb-6">
                        To access the Maker Hub, you need an active subscription plan.
                      </p>
                      <Button 
                        onClick={() => window.location.href = createPageUrl("MakerSubscriptionSelect")}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Choose Your Plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <MakerDashboardContent user={user} onUpdate={loadDashboardData} />
                )}
              </>
            )}

            {/* Designer Studio Section */}
            {activeSection === "designer" && user?.business_roles?.includes('designer') && (
              <DesignerDashboardContent user={user} onUpdate={loadDashboardData} />
            )}

            {/* Account Settings Section */}
            {activeSection === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-teal-600" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveAccount} className="space-y-6">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={accountFormData.full_name}
                        onChange={(e) => setAccountFormData({...accountFormData, full_name: e.target.value})}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={user?.email}
                          disabled
                          className="bg-gray-100 pl-10"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={accountFormData.phone}
                          onChange={(e) => setAccountFormData({...accountFormData, phone: e.target.value})}
                          placeholder="(123) 456-7890"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-base font-semibold flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        Address
                      </Label>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="street">Street Address</Label>
                          <Input
                            id="street"
                            value={accountFormData.address.street}
                            onChange={(e) => setAccountFormData({
                              ...accountFormData, 
                              address: {...accountFormData.address, street: e.target.value}
                            })}
                            placeholder="123 Main St"
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={accountFormData.address.city}
                              onChange={(e) => setAccountFormData({
                                ...accountFormData, 
                                address: {...accountFormData.address, city: e.target.value}
                              })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="state">State</Label>
                            <Input
                              id="state"
                              value={accountFormData.address.state}
                              onChange={(e) => setAccountFormData({
                                ...accountFormData, 
                                address: {...accountFormData.address, state: e.target.value}
                              })}
                              placeholder="FL"
                              maxLength={2}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="zip">ZIP Code</Label>
                          <Input
                            id="zip"
                            value={accountFormData.address.zip}
                            onChange={(e) => setAccountFormData({
                              ...accountFormData, 
                              address: {...accountFormData.address, zip: e.target.value}
                            })}
                            placeholder="12345"
                            maxLength={10}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                      <Button type="submit" disabled={savingAccount} className="bg-teal-600 hover:bg-teal-700">
                        {savingAccount ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>

                  {/* Account Deletion Section */}
                  <div className="mt-8 pt-8 border-t border-red-200">
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone. All your data, orders, and EXP will be lost.')) {
                          if (confirm('Final confirmation: Type DELETE in the prompt to confirm account deletion') && 
                              prompt('Type DELETE to confirm:') === 'DELETE') {
                            toast({ title: "Account deletion requested", description: "Please contact support to complete this process." });
                          }
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Delete My Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this product
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewData({...reviewData, rating})}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        rating <= reviewData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-title">Title</Label>
              <Input
                id="review-title"
                value={reviewData.title}
                onChange={(e) => setReviewData({...reviewData, title: e.target.value})}
                placeholder="Sum up your experience"
                required
              />
            </div>
            <div>
              <Label htmlFor="review-comment">Your Review</Label>
              <Textarea
                id="review-comment"
                value={reviewData.comment}
                onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                placeholder="Tell us more about your experience"
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}