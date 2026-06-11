import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, DollarSign, TrendingUp, ShoppingCart, Heart, Truck, Star, Printer, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function StatCard({ title, value, sub, icon: Icon, colorClass = "text-cyan-400", borderClass = "border-cyan-500/30" }) {
  return (
    <Card className={`bg-slate-900 ${borderClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${colorClass}`}>{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colorClass}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function isProductionOrder(order) {
  const notes = (order.notes || '').toLowerCase();
  if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return false;
  const items = order.items || [];
  return items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
}

const TIME_FILTERS = [
  { value: "all",     label: "All time" },
  { value: "year",    label: "Last year" },
  { value: "30days",  label: "Last 30 days" },
  { value: "month",   label: "This month" },
  { value: "week",    label: "Last week" },
];

function getTimeCutoff(range) {
  const d = new Date();
  if (range === "all") return null;
  if (range === "year")   { d.setFullYear(d.getFullYear() - 1); return d; }
  if (range === "30days") { d.setDate(d.getDate() - 30); return d; }
  if (range === "month")  { return new Date(d.getFullYear(), d.getMonth(), 1); }
  if (range === "week")   { d.setDate(d.getDate() - 7); return d; }
  return null;
}

export default function DashboardSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [cartWishlistData, setCartWishlistData] = useState({ usersWithCarts: 0, usersWithWishlists: 0, cartItems: [], wishlistItems: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => { loadData(); loadCartWishlistData(); }, []);

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

  const cutoff = getTimeCutoff(timeRange);
  const filteredOrders = cutoff ? orders.filter(o => new Date(o.created_date) >= cutoff) : orders;

  const productionOrders = filteredOrders.filter(isProductionOrder);
  const paid = productionOrders.filter(o => o.payment_status === 'paid');
  const active = productionOrders.filter(o => ['pending', 'accepted', 'printing'].includes(o.status));
  const inShipping = productionOrders.filter(o => ['shipped', 'done_printing'].includes(o.status));
  const delivered = productionOrders.filter(o => ['delivered', 'dropped_off', 'completed'].includes(o.status));
  const totalRevenue = paid.reduce((s, o) => s + (o.total_amount || 0), 0);

  const fulfillTimes = productionOrders
    .filter(o => o.shipped_at && o.created_date)
    .map(o => (new Date(o.shipped_at) - new Date(o.created_date)) / (1000 * 60 * 60));
  const avgFulfillHrs = fulfillTimes.length > 0
    ? (fulfillTimes.reduce((a, b) => a + b, 0) / fulfillTimes.length).toFixed(1)
    : null;

  const printAttempts = productionOrders.filter(o =>
    ['printing', 'done_printing', 'shipped', 'delivered', 'dropped_off', 'completed'].includes(o.status)
  ).length;
  const printSuccess = productionOrders.filter(o =>
    ['done_printing', 'shipped', 'delivered', 'dropped_off', 'completed'].includes(o.status)
  ).length;
  const printSuccessRate = printAttempts > 0 ? Math.round((printSuccess / printAttempts) * 100) : 0;

  const issueCount = productionOrders.filter(o => o.issue_flag).length;

  const makerStats = {};
  productionOrders.forEach(o => {
    if (!o.maker_id) return;
    if (!makerStats[o.maker_id]) makerStats[o.maker_id] = { total: 0, completed: 0, issues: 0 };
    makerStats[o.maker_id].total++;
    if (['done_printing', 'shipped', 'delivered', 'completed', 'dropped_off'].includes(o.status)) makerStats[o.maker_id].completed++;
    if (o.issue_flag) makerStats[o.maker_id].issues++;
  });
  const makerList = Object.entries(makerStats).map(([id, s]) => ({
    name: users.find(u => u.maker_id === id)?.full_name || `...${id.slice(-5)}`,
    ...s,
    rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
  })).sort((a, b) => b.completed - a.completed).slice(0, 8);

  const flowByDay = {};
  productionOrders.forEach(o => {
    const d = new Date(o.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!flowByDay[d]) flowByDay[d] = { date: d, orders: 0, revenue: 0 };
    flowByDay[d].orders++;
    if (o.payment_status === 'paid') flowByDay[d].revenue += (o.total_amount || 0);
  });
  const flowData = Object.values(flowByDay).sort((a, b) => new Date(a.date + ' 2025') - new Date(b.date + ' 2025'));

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 whitespace-nowrap">Time range:</span>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-44 bg-slate-800 border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            {TIME_FILTERS.map(f => (
              <SelectItem key={f.value} value={f.value} className="text-white hover:bg-slate-700 focus:bg-slate-700">{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders & Production */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Orders" value={productionOrders.length} icon={Package} />
          <StatCard title="In Production" value={active.length} sub="pending / printing" icon={Printer} colorClass="text-orange-400" borderClass="border-orange-500/30" />
          <StatCard title="Delivered" value={delivered.length} icon={CheckCircle} colorClass="text-green-400" borderClass="border-green-500/30" />
          <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`from ${paid.length} paid orders`} icon={DollarSign} colorClass="text-purple-400" borderClass="border-purple-500/30" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Print Success Rate" value={`${printSuccessRate}%`} sub={`${printSuccess}/${printAttempts}`} icon={CheckCircle} colorClass="text-green-400" borderClass="border-green-500/30" />
          <StatCard title="Avg Fulfillment" value={avgFulfillHrs ? `${avgFulfillHrs}h` : "N/A"} sub="order → shipped" icon={Clock} />
          <StatCard title="Active Makers" value={users.filter(u => u.business_roles?.includes('maker')).length} icon={Users} />
          <StatCard title="Orders with Issues" value={issueCount} icon={AlertTriangle} colorClass="text-red-400" borderClass="border-red-500/30" />
        </div>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> Orders & Revenue — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
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

        {/* Order Status Breakdown */}
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader><CardTitle className="text-white">Order Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Pending / In Production', count: active.length, pct: productionOrders.length > 0 ? Math.round((active.length / productionOrders.length) * 100) : 0, color: 'bg-orange-500' },
                { label: 'Done Printing / Shipped', count: inShipping.length, pct: productionOrders.length > 0 ? Math.round((inShipping.length / productionOrders.length) * 100) : 0, color: 'bg-blue-500' },
                { label: 'Delivered', count: delivered.length, pct: productionOrders.length > 0 ? Math.round((delivered.length / productionOrders.length) * 100) : 0, color: 'bg-green-500' },
                { label: 'Cancelled', count: productionOrders.filter(o => o.status === 'cancelled').length, pct: productionOrders.length > 0 ? Math.round((productionOrders.filter(o => o.status === 'cancelled').length / productionOrders.length) * 100) : 0, color: 'bg-red-500' },
              ].map(row => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{row.label}</span>
                    <span className="text-white font-semibold">{row.count} ({row.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maker Performance Table */}
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Maker Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {makerList.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No production data yet.</p>
            ) : (
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
                        <td className="py-2 px-3 text-cyan-400">{m.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart & Wishlist */}
        <div>
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" /> Cart & Wishlist Activity
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <StatCard title="Users with Cart Items" value={cartWishlistData.usersWithCarts} icon={ShoppingCart} />
            <StatCard title="Users with Wishlists" value={cartWishlistData.usersWithWishlists} icon={Heart} colorClass="text-pink-400" borderClass="border-pink-500/30" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><ShoppingCart className="w-5 h-5 text-cyan-400" /> Cart Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {cartWishlistData.cartItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No active carts.</p>
                  ) : cartWishlistData.cartItems.map((cart, idx) => (
                    <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                      <p className="font-medium text-white">{cart.userName}</p>
                      <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                        {cart.items.map((item, i) => <li key={i}>{item.product_name} (×{item.quantity}) — ${(item.price || 0).toFixed(2)}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-pink-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><Heart className="w-5 h-5 text-pink-400" /> Wishlist Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {cartWishlistData.wishlistItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No wishlists yet.</p>
                  ) : cartWishlistData.wishlistItems.map((wl, idx) => (
                    <div key={idx} className="p-2 bg-slate-800 rounded text-sm border border-slate-700">
                      <p className="font-medium text-white">{wl.userName}</p>
                      <ul className="ml-4 mt-1 space-y-1 text-slate-300">
                        {wl.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}