import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, Loader2, AlertTriangle } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/components/ui/use-toast";

// Exclude supply/admin orders from all financial calculations
function isProductionOrder(order) {
  const notes = (order.notes || '').toLowerCase();
  if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return false;
  const items = order.items || [];
  return items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
}

export default function PaymentsFinancialsSection() {
  const [allOrders, setAllOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueRange, setRevenueRange] = useState('30days');
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, allUsers] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list(),
      ]);
      setAllOrders(orders);
      setUsers(allUsers);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load financial data", variant: "destructive" });
    }
    setLoading(false);
  };

  // Only production (3D print) orders
  const orders = allOrders.filter(isProductionOrder);

  // Paid & completed subsets
  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const completedPaid = orders.filter(o =>
    ['completed', 'delivered', 'dropped_off', 'shipped', 'done_printing'].includes(o.status) && o.payment_status === 'paid'
  );
  const pendingPaid = orders.filter(o => o.payment_status === 'pending');
  const refundedOrders = orders.filter(o => o.payment_status === 'refunded');

  // Core financial metrics
  const grossRevenue = paidOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const shippingTotal = paidOrders.reduce((s, o) => s + (o.shipping_cost || 0), 0);
  const listingRevenue = grossRevenue - shippingTotal;
  const refundedTotal = refundedOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const netRevenue = grossRevenue - refundedTotal;

  // Stripe fees estimate: 2.9% + $0.30 per transaction
  const estimatedStripeFees = paidOrders.reduce((s, o) => s + (o.total_amount || 0) * 0.029 + 0.30, 0);

  // Maker payouts: 50% of listing cost (excl. shipping), + $4 per priority order
  const makerPayoutsTotal = completedPaid.reduce((s, o) => {
    const listing = (o.total_amount || 0) - (o.shipping_cost || 0);
    const base = listing * 0.50;
    const priority = o.is_priority ? 4 : 0;
    return s + base + priority;
  }, 0);

  // Designer payouts: 10% of item total for attributed items
  let designerPayoutsTotal = 0;
  completedPaid.forEach(o => {
    (o.items || []).forEach(item => {
      if (item.designer_id && item.designer_id !== 'admin') {
        designerPayoutsTotal += (item.total_price || 0) * 0.10;
      }
    });
  });

  // Platform net profit: net revenue - stripe fees - maker payouts - designer payouts
  const platformProfit = netRevenue - estimatedStripeFees - makerPayoutsTotal - designerPayoutsTotal;

  const avgOrderValue = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

  // Per-maker earnings
  const makerEarnings = {};
  completedPaid.forEach(o => {
    if (!o.maker_id) return;
    if (!makerEarnings[o.maker_id]) makerEarnings[o.maker_id] = { earnings: 0, orders: 0 };
    const listing = (o.total_amount || 0) - (o.shipping_cost || 0);
    makerEarnings[o.maker_id].earnings += listing * 0.50 + (o.is_priority ? 4 : 0);
    makerEarnings[o.maker_id].orders++;
  });
  const makersList = Object.entries(makerEarnings).map(([id, data]) => {
    const u = users.find(u => u.maker_id === id);
    return { id, name: u?.full_name || `...${id.slice(-6)}`, email: u?.email || '', ...data };
  }).sort((a, b) => b.earnings - a.earnings);

  // Per-designer earnings
  const designerEarnings = {};
  completedPaid.forEach(o => {
    (o.items || []).forEach(item => {
      if (!item.designer_id || item.designer_id === 'admin') return;
      if (!designerEarnings[item.designer_id]) designerEarnings[item.designer_id] = { earnings: 0, sales: 0 };
      designerEarnings[item.designer_id].earnings += (item.total_price || 0) * 0.10;
      designerEarnings[item.designer_id].sales += item.quantity || 1;
    });
  });
  const designersList = Object.entries(designerEarnings).map(([id, data]) => {
    const u = users.find(u => u.designer_id === id);
    return { id, name: u?.full_name || `...${id.slice(-6)}`, email: u?.email || '', ...data };
  }).sort((a, b) => b.earnings - a.earnings);

  // Revenue chart data
  const getTimeStart = (range) => {
    const d = new Date();
    const map = { day: 1, week: 7, '30days': 30, '90days': 90 };
    if (map[range]) d.setDate(d.getDate() - map[range]);
    else return null; // alltime
    return d;
  };

  const buildRevenueChart = () => {
    const start = getTimeStart(revenueRange);
    const filtered = start ? paidOrders.filter(o => new Date(o.created_date) >= start) : paidOrders;
    const byDate = {};
    filtered.forEach(o => {
      const d = new Date(o.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[d]) byDate[d] = { date: d, gross: 0, orders: 0 };
      byDate[d].gross += o.total_amount || 0;
      byDate[d].orders++;
    });
    return Object.values(byDate)
      .sort((a, b) => new Date(a.date + ' 2025') - new Date(b.date + ' 2025'))
      .map(row => ({ ...row, gross: parseFloat(row.gross.toFixed(2)) }));
  };

  const chartData = buildRevenueChart();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  const statCard = (label, value, sub, color = "text-white") => (
    <Card className="bg-slate-900 border-cyan-500/30">
      <CardContent className="p-5">
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  const statusBadge = (s) => {
    const map = { paid: 'bg-green-700 text-green-100', pending: 'bg-yellow-700 text-yellow-100', refunded: 'bg-gray-700 text-gray-200', failed: 'bg-red-700 text-red-100' };
    return <Badge className={map[s] || 'bg-gray-700 text-gray-200'}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard("Gross Revenue", `$${grossRevenue.toFixed(2)}`, `from ${paidOrders.length} paid orders`, "text-green-400")}
        {statCard("Net Revenue", `$${netRevenue.toFixed(2)}`, `after $${refundedTotal.toFixed(2)} in refunds`, "text-cyan-400")}
        {statCard("Platform Profit", `$${platformProfit.toFixed(2)}`, "after fees + payouts", platformProfit >= 0 ? "text-emerald-400" : "text-red-400")}
        {statCard("Avg Order Value", `$${avgOrderValue.toFixed(2)}`, `${paidOrders.length} paid orders`)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard("Maker Payouts", `$${makerPayoutsTotal.toFixed(2)}`, "50% listing + priority fees", "text-orange-400")}
        {statCard("Designer Payouts", `$${designerPayoutsTotal.toFixed(2)}`, "10% per attributed sale", "text-blue-400")}
        {statCard("Est. Stripe Fees", `$${estimatedStripeFees.toFixed(2)}`, "2.9% + $0.30/txn estimate")}
        {statCard("Refunds Issued", `$${refundedTotal.toFixed(2)}`, `${refundedOrders.length} orders refunded`, "text-red-400")}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCard("Shipping Revenue", `$${shippingTotal.toFixed(2)}`, "from shipping charges")}
        {statCard("Pending Payment", `$${pendingPaid.reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(2)}`, `${pendingPaid.length} orders pending`)}
        {statCard("Completed & Paid Orders", completedPaid.length, `of ${orders.length} total production orders`)}
      </div>

      {/* Revenue Chart */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> Revenue Over Time
            </CardTitle>
            <Tabs value={revenueRange} onValueChange={setRevenueRange}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="week" className="data-[state=active]:bg-cyan-600">Week</TabsTrigger>
                <TabsTrigger value="30days" className="data-[state=active]:bg-cyan-600">30d</TabsTrigger>
                <TabsTrigger value="90days" className="data-[state=active]:bg-cyan-600">90d</TabsTrigger>
                <TabsTrigger value="alltime" className="data-[state=active]:bg-cyan-600">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="gross" stroke="#10b981" name="Gross Revenue ($)" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#06b6d4" name="Orders" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Maker & Designer Payouts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400">Maker Payouts</CardTitle>
            <p className="text-xs text-gray-400">50% of listing cost + $4 per priority order</p>
          </CardHeader>
          <CardContent>
            {makersList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No maker payouts yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {makersList.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                    <div>
                      <p className="font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email} · {m.orders} orders</p>
                    </div>
                    <p className="text-xl font-bold text-orange-400">${m.earnings.toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-orange-400 font-bold">${makerPayoutsTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400">Designer Payouts</CardTitle>
            <p className="text-xs text-gray-400">10% of item price for attributed designs</p>
          </CardHeader>
          <CardContent>
            {designersList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No designer payouts yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {designersList.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                    <div>
                      <p className="font-semibold text-white">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.email} · {d.sales} units sold</p>
                    </div>
                    <p className="text-xl font-bold text-blue-400">${d.earnings.toFixed(2)}</p>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-blue-400 font-bold">${designerPayoutsTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orders
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .slice(0, 25)
              .map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-slate-800 rounded border border-slate-700">
                  <div>
                    <p className="font-semibold text-white">#{order.id.slice(-8)}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_date).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-semibold text-white">${(order.total_amount || 0).toFixed(2)}</p>
                    {statusBadge(order.payment_status)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}