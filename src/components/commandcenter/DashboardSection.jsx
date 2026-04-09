import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, DollarSign, TrendingUp, Eye, ShoppingCart, Heart, Truck, Star, Printer, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatCard({ title, value, sub, icon: Icon, color = "cyan" }) {
  // Icon is passed as a prop from lucide-react, used as <Icon />
  const colors = {
    cyan: "bg-slate-900 border-cyan-500/30 text-cyan-400",
    green: "bg-green-900/20 border-green-500/30 text-green-400",
    orange: "bg-orange-900/20 border-orange-500/30 text-orange-400",
    red: "bg-red-900/20 border-red-500/30 text-red-400",
    purple: "bg-purple-900/20 border-purple-500/30 text-purple-400",
    blue: "bg-blue-900/20 border-blue-500/30 text-blue-400",
  };
  return (
    <Card className={colors[color]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${colors[color].split(' ')[2]}`}>{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colors[color].split(' ')[2]}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewsData, setViewsData] = useState([]);
  const [visitsData, setVisitsData] = useState([]);
  const [viewsTimeRange, setViewsTimeRange] = useState('week');
  const [visitsTimeRange, setVisitsTimeRange] = useState('week');
  const [cartWishlistData, setCartWishlistData] = useState({ usersWithCarts: 0, usersWithWishlists: 0, cartItems: [], wishlistItems: [] });

  useEffect(() => { loadData(); loadCartWishlistData(); }, []);
  useEffect(() => { loadViewsData(); }, [viewsTimeRange]);
  useEffect(() => { loadVisitsData(); }, [visitsTimeRange]);

  const loadData = async () => {
    setLoading(true);
    const [allOrders, allUsers] = await Promise.all([
      base44.entities.Order.list(),
      base44.entities.User.list(),
    ]);
    setOrders(allOrders);
    setUsers(allUsers);
    setLoading(false);
  };

  const loadViewsData = async () => {
    try {
      const allViews = await base44.entities.PageView.list();
      const now = new Date(), start = new Date();
      const daysMap = { day: 1, week: 7, '30days': 30, '90days': 90 };
      start.setDate(now.getDate() - (daysMap[viewsTimeRange] || 7));
      const filtered = allViews.filter(v => new Date(v.created_date) >= start);
      const grouped = {};
      filtered.forEach(v => {
        const d = new Date(v.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!grouped[d]) grouped[d] = { date: d, signed_in: 0, not_signed_in: 0, makers: 0 };
        if (v.user_type === 'maker') grouped[d].makers++;
        else if (v.user_type === 'signed_in') grouped[d].signed_in++;
        else grouped[d].not_signed_in++;
      });
      setViewsData(Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (e) { console.error(e); }
  };

  const loadVisitsData = async () => {
    try {
      const allViews = await base44.entities.PageView.list();
      const now = new Date(), start = new Date();
      const daysMap = { day: 1, week: 7, '30days': 30, '90days': 90 };
      start.setDate(now.getDate() - (daysMap[visitsTimeRange] || 7));
      const filtered = allViews.filter(v => new Date(v.created_date) >= start);
      const byDate = {};
      filtered.forEach(v => {
        const d = new Date(v.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!byDate[d]) byDate[d] = new Set();
        byDate[d].add(v.session_id);
      });
      setVisitsData(Object.entries(byDate).map(([date, s]) => ({ date, visits: s.size })).sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (e) { console.error(e); }
  };

  const loadCartWishlistData = async () => {
    try {
      const [carts, allUsers, products] = await Promise.all([
        base44.entities.Cart.list(), base44.entities.User.list(), base44.entities.Product.list()
      ]);
      const cartsByUser = {};
      carts.forEach(cart => {
        if (!cartsByUser[cart.user_id]) cartsByUser[cart.user_id] = [];
        const product = products.find(p => p.id === cart.product_id);
        cartsByUser[cart.user_id].push({ product_name: product?.name || 'Unknown', quantity: cart.quantity, price: cart.total_price });
      });
      const wishlistsByUser = {};
      allUsers.forEach(u => {
        if (u.wishlist?.length > 0) wishlistsByUser[u.id] = u.wishlist.map(pid => products.find(p => p.id === pid)?.name || 'Unknown');
      });
      setCartWishlistData({
        usersWithCarts: Object.keys(cartsByUser).length,
        usersWithWishlists: Object.keys(wishlistsByUser).length,
        cartItems: Object.entries(cartsByUser).map(([uid, items]) => ({ userName: allUsers.find(u => u.id === uid)?.full_name || uid, items })),
        wishlistItems: Object.entries(wishlistsByUser).map(([uid, items]) => ({ userName: allUsers.find(u => u.id === uid)?.full_name || uid, items })),
      });
    } catch (e) { console.error(e); }
  };

  // ── Derived analytics ─────────────────────────────────────────────────────
  const productionOrders = orders.filter(o => {
    const notes = (o.notes || '').toLowerCase();
    if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return false;
    const items = o.items || [];
    return items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
  });

  const paid = productionOrders.filter(o => o.payment_status === 'paid');
  const active = productionOrders.filter(o => ['pending', 'accepted', 'printing'].includes(o.status));
  const shipped = productionOrders.filter(o => ['shipped', 'done_printing'].includes(o.status));
  const delivered = productionOrders.filter(o => ['delivered', 'dropped_off', 'completed'].includes(o.status));

  const totalRevenue = paid.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalMakers = users.filter(u => u.business_roles?.includes('maker')).length;

  // Avg fulfillment time (created → shipped)
  const fulfillTimes = productionOrders
    .filter(o => o.shipped_at && o.created_date)
    .map(o => (new Date(o.shipped_at) - new Date(o.created_date)) / (1000 * 60 * 60));
  const avgFulfillHrs = fulfillTimes.length > 0 ? (fulfillTimes.reduce((a, b) => a + b, 0) / fulfillTimes.length).toFixed(1) : "N/A";

  // Avg shipping time (shipped → delivered)
  const shipTimes = productionOrders
    .filter(o => o.shipped_at && o.delivered_at)
    .map(o => (new Date(o.delivered_at) - new Date(o.shipped_at)) / (1000 * 60 * 60 * 24));
  const avgShipDays = shipTimes.length > 0 ? (shipTimes.reduce((a, b) => a + b, 0) / shipTimes.length).toFixed(1) : "N/A";

  // Delivered within 48 hours of shipped
  const deliveredIn48 = productionOrders.filter(o => o.shipped_at && o.delivered_at &&
    (new Date(o.delivered_at) - new Date(o.shipped_at)) <= 48 * 60 * 60 * 1000).length;
  const pct48 = shipTimes.length > 0 ? Math.round((deliveredIn48 / shipTimes.length) * 100) : 0;

  // Print success rate (done_printing / (printing + done_printing + shipped + delivered))
  const printAttempts = productionOrders.filter(o => ['printing', 'done_printing', 'shipped', 'delivered', 'dropped_off', 'completed'].includes(o.status)).length;
  const printSuccess = productionOrders.filter(o => ['done_printing', 'shipped', 'delivered', 'dropped_off', 'completed'].includes(o.status)).length;
  const printSuccessRate = printAttempts > 0 ? Math.round((printSuccess / printAttempts) * 100) : 0;

  // Customer ratings
  const ratedOrders = productionOrders.filter(o => o.customer_rating != null);
  const avgRating = ratedOrders.length > 0 ? (ratedOrders.reduce((s, o) => s + (o.customer_rating || 0), 0) / ratedOrders.length).toFixed(1) : "N/A";
  const reviewRate = delivered.length > 0 ? Math.round((productionOrders.filter(o => o.review_left).length / delivered.length) * 100) : 0;
  const refundRate = paid.length > 0 ? Math.round((productionOrders.filter(o => o.refund_requested).length / paid.length) * 100) : 0;
  const issueOrders = productionOrders.filter(o => o.issue_flag).length;

  // Top makers by completed orders
  const makerStats = {};
  productionOrders.forEach(o => {
    if (!o.maker_id) return;
    if (!makerStats[o.maker_id]) makerStats[o.maker_id] = { total: 0, completed: 0, issues: 0 };
    makerStats[o.maker_id].total++;
    if (['done_printing', 'shipped', 'delivered', 'completed', 'dropped_off'].includes(o.status)) makerStats[o.maker_id].completed++;
    if (o.issue_flag) makerStats[o.maker_id].issues++;
  });
  const makerList = Object.entries(makerStats).map(([id, s]) => ({
    name: users.find(u => u.maker_id === id)?.full_name || id.slice(-6),
    ...s
  })).sort((a, b) => b.completed - a.completed).slice(0, 8);

  // Order flow by date (last 30 days)
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const flowByDay = {};
  productionOrders.filter(o => new Date(o.created_date) >= last30).forEach(o => {
    const d = new Date(o.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!flowByDay[d]) flowByDay[d] = { date: d, orders: 0, revenue: 0 };
    flowByDay[d].orders++;
    if (o.payment_status === 'paid') flowByDay[d].revenue += (o.total_amount || 0);
  });
  const flowData = Object.values(flowByDay).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="order_flow">
        <TabsList className="bg-slate-900 border-slate-700 mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="order_flow" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">📦 Order Flow</TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">🏭 Production</TabsTrigger>
          <TabsTrigger value="delivery" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">🚚 Delivery</TabsTrigger>
          <TabsTrigger value="customer" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">⭐ Customer</TabsTrigger>
          <TabsTrigger value="cart" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">🛒 Cart</TabsTrigger>
          <TabsTrigger value="wishlist" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">❤️ Wishlist</TabsTrigger>
        </TabsList>

        {/* ── ORDER FLOW ─────────────────────────────────────────────────── */}
        <TabsContent value="order_flow" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="Total Orders" value={productionOrders.length} icon={Package} color="cyan" />
            <StatCard title="In Production" value={active.length} sub="pending/printing" icon={Printer} color="orange" />
            <StatCard title="Shipped" value={shipped.length} icon={Truck} color="blue" />
            <StatCard title="Delivered" value={delivered.length} icon={CheckCircle} color="green" />
            <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={DollarSign} color="purple" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Avg Fulfillment" value={avgFulfillHrs === "N/A" ? "N/A" : `${avgFulfillHrs}h`} sub="order placed → shipped" icon={Clock} color="cyan" />
            <StatCard title="Active Makers" value={totalMakers} icon={Users} color="cyan" />
            <StatCard title="Total Users" value={users.length} icon={Users} color="cyan" />
          </div>
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-400" /> Orders & Revenue — Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="#06b6d4" name="Orders" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {/* Traffic */}
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center gap-2"><Eye className="w-5 h-5 text-cyan-400" /> Website Traffic</CardTitle>
                <Tabs value={visitsTimeRange} onValueChange={setVisitsTimeRange}>
                  <TabsList className="bg-slate-800">
                    <TabsTrigger value="day" className="data-[state=active]:bg-cyan-600">Day</TabsTrigger>
                    <TabsTrigger value="week" className="data-[state=active]:bg-cyan-600">Week</TabsTrigger>
                    <TabsTrigger value="30days" className="data-[state=active]:bg-cyan-600">30d</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
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
        </TabsContent>

        {/* ── PRODUCTION ─────────────────────────────────────────────────── */}
        <TabsContent value="production" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Print Success Rate" value={`${printSuccessRate}%`} sub={`${printSuccess}/${printAttempts} orders`} icon={CheckCircle} color="green" />
            <StatCard title="Avg Fulfillment" value={avgFulfillHrs === "N/A" ? "N/A" : `${avgFulfillHrs}h`} sub="order → shipped" icon={Clock} color="cyan" />
            <StatCard title="Active Makers" value={totalMakers} icon={Users} color="cyan" />
            <StatCard title="Orders with Issues" value={issueOrders} icon={AlertTriangle} color="red" />
          </div>
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5 text-cyan-400" /> Maker Performance</CardTitle></CardHeader>
            <CardContent>
              {makerList.length === 0 ? <p className="text-gray-500 text-center py-6">No production data yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-3 text-gray-400">Maker</th>
                        <th className="text-left py-2 px-3 text-gray-400">Total</th>
                        <th className="text-left py-2 px-3 text-gray-400">Completed</th>
                        <th className="text-left py-2 px-3 text-gray-400">Issues</th>
                        <th className="text-left py-2 px-3 text-gray-400">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {makerList.map(m => (
                        <tr key={m.name} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-white">{m.name}</td>
                          <td className="py-2 px-3 text-gray-300">{m.total}</td>
                          <td className="py-2 px-3 text-green-400">{m.completed}</td>
                          <td className="py-2 px-3 text-red-400">{m.issues}</td>
                          <td className="py-2 px-3 text-cyan-400">{m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DELIVERY ───────────────────────────────────────────────────── */}
        <TabsContent value="delivery" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Avg Shipping Time" value={avgShipDays === "N/A" ? "N/A" : `${avgShipDays}d`} sub="shipped → delivered" icon={Truck} color="blue" />
            <StatCard title="Delivered Within 48h" value={`${pct48}%`} sub={`${deliveredIn48} orders`} icon={CheckCircle} color="green" />
            <StatCard title="Total Shipped" value={shipped.length + delivered.length} icon={Package} color="cyan" />
            <StatCard title="Total Delivered" value={delivered.length} icon={CheckCircle} color="green" />
          </div>
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader><CardTitle className="text-white">Order Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Pending / In Production', count: active.length, color: 'bg-orange-500' },
                  { label: 'Done Printing / Shipped', count: shipped.length, color: 'bg-blue-500' },
                  { label: 'Delivered', count: delivered.length, color: 'bg-green-500' },
                  { label: 'Cancelled', count: productionOrders.filter(o => o.status === 'cancelled').length, color: 'bg-red-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${row.color}`} />
                    <span className="text-gray-300 text-sm flex-1">{row.label}</span>
                    <span className="text-white font-semibold">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CUSTOMER ───────────────────────────────────────────────────── */}
        <TabsContent value="customer" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Avg Rating" value={avgRating} sub={`from ${ratedOrders.length} ratings`} icon={Star} color="orange" />
            <StatCard title="Review Rate" value={`${reviewRate}%`} sub="of delivered orders" icon={Star} color="cyan" />
            <StatCard title="Refund Rate" value={`${refundRate}%`} sub="of paid orders" icon={AlertTriangle} color="red" />
            <StatCard title="Orders with Issues" value={issueOrders} icon={AlertTriangle} color="red" />
          </div>
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Star className="w-5 h-5 text-orange-400" /> Rating Distribution</CardTitle></CardHeader>
            <CardContent>
              {[5, 4, 3, 2, 1].map(stars => {
                const count = productionOrders.filter(o => Math.round(o.customer_rating) === stars).length;
                const pct = ratedOrders.length > 0 ? Math.round((count / ratedOrders.length) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-400 text-sm w-8">{"★".repeat(stars)}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-3">
                      <div className="bg-yellow-400 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-300 text-sm w-12 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
              {ratedOrders.length === 0 && <p className="text-gray-500 text-center py-6">No ratings yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CART ───────────────────────────────────────────────────────── */}
        <TabsContent value="cart">
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ShoppingCart className="w-5 h-5 text-cyan-400" /> Cart Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white mb-1">{cartWishlistData.usersWithCarts}</p>
              <p className="text-sm text-cyan-400 mb-4">Users with items in cart</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cartWishlistData.cartItems.map((cart, idx) => (
                  <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                    <p className="font-medium text-white">{cart.userName}</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                      {cart.items.map((item, i) => <li key={i}>{item.product_name} (x{item.quantity}) — ${item.price?.toFixed(2)}</li>)}
                    </ul>
                  </div>
                ))}
                {cartWishlistData.cartItems.length === 0 && <p className="text-gray-500 text-center py-6">No carts yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WISHLIST ───────────────────────────────────────────────────── */}
        <TabsContent value="wishlist">
          <Card className="bg-slate-900 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Heart className="w-5 h-5 text-cyan-400" /> Wishlist Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white mb-1">{cartWishlistData.usersWithWishlists}</p>
              <p className="text-sm text-cyan-400 mb-4">Users with wishlist items</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cartWishlistData.wishlistItems.map((wl, idx) => (
                  <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                    <p className="font-medium text-white">{wl.userName}</p>
                    <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                      {wl.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                ))}
                {cartWishlistData.wishlistItems.length === 0 && <p className="text-gray-500 text-center py-6">No wishlists yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}