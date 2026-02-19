import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Clock, TrendingUp, ShoppingCart, 
  CheckCircle2, AlertCircle, Truck, Calendar
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function BusinessDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(currentUser);

      // Load business orders
      const allOrders = await base44.entities.Order.filter({ 
        customer_id: currentUser.id 
      });
      const businessOrders = allOrders.filter(order => 
        order.items?.some(item => item.business_name)
      );
      setOrders(businessOrders.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ));

      // Load subscriptions
      const subs = await base44.entities.BusinessSubscription.filter({ 
        user_id: currentUser.id 
      });
      setSubscriptions(subs);

      // Load recommended products based on purchase history
      const products = await base44.entities.Product.filter({ 
        marketplace_type: "business",
        status: "active"
      });
      setRecommendedProducts(products.sort((a, b) => 
        (b.sales_count || 0) - (a.sales_count || 0)
      ).slice(0, 6));

    } catch (error) {
      console.error("Failed to load dashboard:", error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      printing: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      delivered: "bg-teal-100 text-teal-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const totalSpent = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {user?.business_name || "Your Business"}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-purple-600">{activeOrders.length}</p>
                </div>
                <Package className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Subscriptions</p>
                  <p className="text-2xl font-bold text-orange-600">{subscriptions.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                  <p className="text-gray-600 mb-4">Start ordering products for your business</p>
                  <Button asChild>
                    <Link to={createPageUrl("BusinessMarketplace")}>
                      Browse Catalog
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Order #{order.id.slice(0, 8)}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatDate(order.created_date)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                            <div className="flex-1">
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {item.quantity} | ${item.unit_price?.toFixed(2)} each
                              </p>
                              {item.business_name && (
                                <p className="text-sm text-purple-600">
                                  For: {item.business_name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${item.total_price?.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <span className="font-semibold">Total</span>
                          <span className="text-lg font-bold">${order.total_amount?.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            {subscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active subscriptions</h3>
                  <p className="text-gray-600 mb-4">Save time with recurring orders</p>
                  <Button asChild variant="outline">
                    <Link to={createPageUrl("BusinessMarketplace")}>
                      Explore Products
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {subscriptions.map(sub => (
                  <Card key={sub.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {sub.frequency} Subscription
                        </CardTitle>
                        <Badge className={
                          sub.status === 'active' ? 'bg-green-100 text-green-800' :
                          sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {sub.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Items:</span>
                          <span className="font-medium">{sub.items?.length || 0} products</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Per cycle:</span>
                          <span className="font-medium">${sub.total_per_cycle?.toFixed(2)}</span>
                        </div>
                        {sub.next_order_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Next order:</span>
                            <span className="font-medium">{formatDate(sub.next_order_date)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recommended Tab */}
          <TabsContent value="recommended">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Products</CardTitle>
                <p className="text-sm text-gray-600">
                  Popular products for businesses like yours
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedProducts.map(product => (
                    <Link 
                      key={product.id}
                      to={`${createPageUrl("BusinessProductDetail")}?id=${product.id}`}
                      className="group"
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        {product.images?.[0] && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        )}
                        <CardContent className="pt-4">
                          <h3 className="font-semibold mb-2 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {product.short_description || product.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-purple-600">
                              ${product.wholesale_price?.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              MOQ: {product.moq || 20}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
            <Link to={createPageUrl("BusinessMarketplace")}>
              <Package className="w-5 h-5 mr-2" />
              Browse Products
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={createPageUrl("BusinessCart")}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              View Cart
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={createPageUrl("BusinessCADUpload")}>
              <Clock className="w-5 h-5 mr-2" />
              Custom Quote
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}