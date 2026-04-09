import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, DollarSign, TrendingUp, Eye, ShoppingCart, Heart, CreditCard } from "lucide-react";
import { getStripeSalesOverview } from "@/functions/getStripeSalesOverview";
import PerfectOrderDashboard from "./PerfectOrderDashboard";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardSection() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMakers: 0,
    activeOrders: 0,
    totalRevenue: 0
  });
  const [viewsData, setViewsData] = useState([]);
  const [viewsTimeRange, setViewsTimeRange] = useState('week');
  const [visitsData, setVisitsData] = useState([]);
  const [visitsTimeRange, setVisitsTimeRange] = useState('week');
  const [stripeSales, setStripeSales] = useState(null);
  const [stripeDays, setStripeDays] = useState(30);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [cartWishlistData, setCartWishlistData] = useState({
    usersWithCarts: 0,
    usersWithWishlists: 0,
    cartItems: [],
    wishlistItems: []
  });

  useEffect(() => {
    loadStats();
    loadCartWishlistData();
  }, []);

  useEffect(() => {
    loadViewsData();
  }, [viewsTimeRange]);

  useEffect(() => {
    loadVisitsData();
  }, [visitsTimeRange]);

  useEffect(() => {
    loadStripeSales();
  }, [stripeDays]);

  const loadStripeSales = async () => {
    setStripeLoading(true);
    try {
      const { data } = await getStripeSalesOverview({ days: stripeDays });
      setStripeSales(data);
    } catch (error) {
      console.error('Failed to load Stripe data:', error);
    }
    setStripeLoading(false);
  };

  const loadStats = async () => {
    try {
      const [users, orders] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Order.list()
      ]);

      const totalMakers = users.filter(u => u.business_roles?.includes('maker')).length;
      const activeOrders = orders.filter(o => 
        ['pending', 'accepted', 'printing', 'completed'].includes(o.status)
      ).length;
      const totalRevenue = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        totalUsers: users.length,
        totalMakers,
        activeOrders,
        totalRevenue
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadViewsData = async () => {
    try {
      const allViews = await base44.entities.PageView.list();
      
      const now = new Date();
      let startDate = new Date();
      
      switch(viewsTimeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const filteredViews = allViews.filter(view => {
        const viewDate = new Date(view.created_date);
        return viewDate >= startDate && viewDate <= now;
      });

      const groupedData = {};
      
      filteredViews.forEach(view => {
        const date = new Date(view.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!groupedData[date]) {
          groupedData[date] = {
            date,
            signed_in: 0,
            not_signed_in: 0,
            makers: 0
          };
        }
        
        if (view.user_type === 'maker') {
          groupedData[date].makers++;
        } else if (view.user_type === 'signed_in') {
          groupedData[date].signed_in++;
        } else {
          groupedData[date].not_signed_in++;
        }
      });

      const chartData = Object.values(groupedData).sort((a, b) => {
        const dateA = new Date(a.date + ', 2024');
        const dateB = new Date(b.date + ', 2024');
        return dateA - dateB;
      });

      setViewsData(chartData);
    } catch (error) {
      console.error("Failed to load views data:", error);
    }
  };

  const loadVisitsData = async () => {
    try {
      const allViews = await base44.entities.PageView.list();
      
      const now = new Date();
      let startDate = new Date();
      
      switch(visitsTimeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const filteredViews = allViews.filter(view => {
        const viewDate = new Date(view.created_date);
        return viewDate >= startDate && viewDate <= now;
      });

      // Group by session_id to count unique visits
      const sessionsByDate = {};
      
      filteredViews.forEach(view => {
        const date = new Date(view.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = new Set();
        }
        sessionsByDate[date].add(view.session_id);
      });

      const chartData = Object.entries(sessionsByDate).map(([date, sessions]) => ({
        date,
        visits: sessions.size
      })).sort((a, b) => {
        const dateA = new Date(a.date + ', 2024');
        const dateB = new Date(b.date + ', 2024');
        return dateA - dateB;
      });

      setVisitsData(chartData);
    } catch (error) {
      console.error("Failed to load visits data:", error);
    }
  };

  const loadCartWishlistData = async () => {
    try {
      const [carts, users, products] = await Promise.all([
        base44.entities.Cart.list(),
        base44.entities.User.list(),
        base44.entities.Product.list()
      ]);

      const cartsByUser = {};
      carts.forEach(cart => {
        if (!cartsByUser[cart.user_id]) {
          cartsByUser[cart.user_id] = [];
        }
        const product = products.find(p => p.id === cart.product_id);
        cartsByUser[cart.user_id].push({
          product_name: product?.name || 'Unknown',
          quantity: cart.quantity,
          price: cart.total_price
        });
      });

      const wishlistsByUser = {};
      users.forEach(user => {
        if (user.wishlist && user.wishlist.length > 0) {
          wishlistsByUser[user.id] = user.wishlist.map(productId => {
            const product = products.find(p => p.id === productId);
            return product?.name || 'Unknown';
          });
        }
      });

      const cartItems = Object.entries(cartsByUser).map(([userId, items]) => {
        const user = users.find(u => u.id === userId);
        return {
          userName: user?.full_name || user?.email || 'Unknown',
          items
        };
      });

      const wishlistItems = Object.entries(wishlistsByUser).map(([userId, items]) => {
        const user = users.find(u => u.id === userId);
        return {
          userName: user?.full_name || user?.email || 'Unknown',
          items
        };
      });

      setCartWishlistData({
        usersWithCarts: Object.keys(cartsByUser).length,
        usersWithWishlists: Object.keys(wishlistsByUser).length,
        cartItems,
        wishlistItems
      });
    } catch (error) {
      console.error("Failed to load cart/wishlist data:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border-slate-700 mb-4">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">📊 Overview</TabsTrigger>
          <TabsTrigger value="perfect_orders" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">🎯 Perfect Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="perfect_orders">
          <PerfectOrderDashboard />
        </TabsContent>
        <TabsContent value="overview">
      {/* Stripe Sales Overview */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Stripe Sales Overview
            </CardTitle>
            <Tabs value={String(stripeDays)} onValueChange={(v) => setStripeDays(Number(v))}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="7" className="data-[state=active]:bg-cyan-600">7 Days</TabsTrigger>
                <TabsTrigger value="30" className="data-[state=active]:bg-cyan-600">30 Days</TabsTrigger>
                <TabsTrigger value="90" className="data-[state=active]:bg-cyan-600">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {stripeLoading ? (
            <p className="text-slate-400 text-sm">Loading Stripe data...</p>
          ) : stripeSales ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">${stripeSales.totalRevenue?.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Transactions</p>
                  <p className="text-2xl font-bold text-white">{stripeSales.totalTransactions}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stripeSales.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} dot={false} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
              <div>
                <p className="text-sm font-semibold text-cyan-400 mb-2">Recent Transactions</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {stripeSales.recentTransactions?.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-2 bg-slate-800 rounded text-sm border border-slate-700">
                      <span className="text-slate-300 truncate max-w-[60%]">{tx.description}</span>
                      <span className="text-white font-semibold">${tx.amount.toFixed(2)} <span className="text-slate-400 font-normal">{tx.created}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Total Users</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Active Makers</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalMakers}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Website Visits Chart */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Website Visits (Unique Sessions)
            </CardTitle>
            <Tabs value={visitsTimeRange} onValueChange={setVisitsTimeRange}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="day" className="data-[state=active]:bg-cyan-600">Last Day</TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-cyan-600">Last Week</TabsTrigger>
                <TabsTrigger value="30days" className="data-[state=active]:bg-cyan-600">30 Days</TabsTrigger>
                <TabsTrigger value="90days" className="data-[state=active]:bg-cyan-600">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke="#06b6d4" name="Unique Visits" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Website Views Chart */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-white">
              <Eye className="w-5 h-5 text-cyan-400" />
              Website Views
            </CardTitle>
            <Tabs value={viewsTimeRange} onValueChange={setViewsTimeRange}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="day" className="data-[state=active]:bg-cyan-600">Last Day</TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-cyan-600">Last Week</TabsTrigger>
                <TabsTrigger value="30days" className="data-[state=active]:bg-cyan-600">30 Days</TabsTrigger>
                <TabsTrigger value="90days" className="data-[state=active]:bg-cyan-600">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
              <Legend />
              <Line type="monotone" dataKey="signed_in" stroke="#14b8a6" name="Signed In Users" strokeWidth={2} />
              <Line type="monotone" dataKey="not_signed_in" stroke="#f59e0b" name="Guest Users" strokeWidth={2} />
              <Line type="monotone" dataKey="makers" stroke="#8b5cf6" name="Makers" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cart & Wishlist Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              Cart Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-white">{cartWishlistData.usersWithCarts}</p>
                <p className="text-sm text-cyan-400">Users with items in cart</p>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-semibold text-cyan-400">Cart Contents:</p>
                {cartWishlistData.cartItems.map((cart, idx) => (
                  <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                    <p className="font-medium text-white">{cart.userName}</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                      {cart.items.map((item, itemIdx) => (
                        <li key={itemIdx}>
                          {item.product_name} (x{item.quantity}) - ${item.price.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Heart className="w-5 h-5 text-cyan-400" />
              Wishlist Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-white">{cartWishlistData.usersWithWishlists}</p>
                <p className="text-sm text-cyan-400">Users with wishlist items</p>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-semibold text-cyan-400">Wishlist Contents:</p>
                {cartWishlistData.wishlistItems.map((wishlist, idx) => (
                  <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                    <p className="font-medium text-white">{wishlist.userName}</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                      {wishlist.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}