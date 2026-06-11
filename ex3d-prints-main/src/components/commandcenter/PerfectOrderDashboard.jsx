import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertTriangle, Clock, TrendingUp, TrendingDown, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EXPECTED_DELIVERY_DAYS = 7;

function calcDeliveryDays(order) {
  const end = order.delivered_at || order.picked_up_at;
  if (!end) return null;
  const days = (new Date(end) - new Date(order.created_date)) / (1000 * 60 * 60 * 24);
  return Math.round(days * 10) / 10;
}

function isPerfect(order) {
  const days = calcDeliveryDays(order);
  return (
    days !== null &&
    days <= EXPECTED_DELIVERY_DAYS &&
    !order.issue_flag &&
    order.customer_satisfaction === true
  );
}

export default function PerfectOrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const allOrders = await base44.entities.Order.list("-created_date", 200);
    const delivered = allOrders.filter(o => ["delivered", "dropped_off", "completed"].includes(o.status) || o.delivered_at);

    // Load maker names
    const makerIds = [...new Set(delivered.map(o => o.maker_id).filter(Boolean))];
    const userMap = {};
    await Promise.all(makerIds.map(async id => {
      try {
        const u = await base44.entities.User.get(id);
        userMap[id] = u;
      } catch {}
    }));
    setUsers(userMap);
    setOrders(delivered);
    setLoading(false);
  };

  const handleSaveFlags = async (order, flags) => {
    const days = calcDeliveryDays(order);
    const perfect = days !== null && days <= EXPECTED_DELIVERY_DAYS && !flags.issue_flag && flags.customer_satisfaction === true;
    await base44.entities.Order.update(order.id, { ...flags, perfect_order: perfect });
    toast({ title: "Order updated" });
    setEditingOrder(null);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  const perfectOrders = orders.filter(o => o.perfect_order || isPerfect(o));
  const issueOrders = orders.filter(o => o.issue_flag);
  const ratedOrders = orders.filter(o => o.customer_satisfaction !== undefined);
  const perfectRate = orders.length > 0 ? Math.round((perfectOrders.length / orders.length) * 100) : 0;

  const deliveryTimes = orders.map(calcDeliveryDays).filter(d => d !== null);
  const avgDelivery = deliveryTimes.length > 0 ? (deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length).toFixed(1) : "N/A";

  // Maker performance
  const makerStats = {};
  orders.forEach(o => {
    if (!o.maker_id) return;
    if (!makerStats[o.maker_id]) makerStats[o.maker_id] = { total: 0, perfect: 0, issues: 0, name: users[o.maker_id]?.full_name || o.maker_id };
    makerStats[o.maker_id].total++;
    if (o.perfect_order || isPerfect(o)) makerStats[o.maker_id].perfect++;
    if (o.issue_flag) makerStats[o.maker_id].issues++;
  });
  const makerList = Object.values(makerStats).filter(m => m.total >= 1).sort((a, b) => (b.perfect / b.total) - (a.perfect / a.total));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Perfect Order Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-900/30 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm">Perfect Order Rate</span>
            </div>
            <p className="text-3xl font-bold text-white">{perfectRate}%</p>
            <p className="text-xs text-gray-400 mt-1">{perfectOrders.length} / {orders.length} orders</p>
          </CardContent>
        </Card>

        <Card className="bg-red-900/30 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">Orders with Issues</span>
            </div>
            <p className="text-3xl font-bold text-white">{issueOrders.length}</p>
            <p className="text-xs text-gray-400 mt-1">of {orders.length} completed</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/30 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 text-sm">Avg Delivery Time</span>
            </div>
            <p className="text-3xl font-bold text-white">{avgDelivery}</p>
            <p className="text-xs text-gray-400 mt-1">days (target: {EXPECTED_DELIVERY_DAYS}d)</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-900/30 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 text-sm">Customer Rated</span>
            </div>
            <p className="text-3xl font-bold text-white">{ratedOrders.length}</p>
            <p className="text-xs text-gray-400 mt-1">of {orders.length} orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Maker Performance */}
      {makerList.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-green-500/30">
            <CardHeader><CardTitle className="text-green-400 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Top Makers</CardTitle></CardHeader>
            <CardContent>
              {makerList.slice(0, 5).map(m => (
                <div key={m.name} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                  <span className="text-white text-sm">{m.name}</span>
                  <span className="text-green-400 font-semibold">{Math.round((m.perfect / m.total) * 100)}% perfect</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-red-500/30">
            <CardHeader><CardTitle className="text-red-400 flex items-center gap-2"><TrendingDown className="w-5 h-5" /> Needs Improvement</CardTitle></CardHeader>
            <CardContent>
              {[...makerList].reverse().slice(0, 5).map(m => (
                <div key={m.name} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                  <span className="text-white text-sm">{m.name}</span>
                  <span className="text-red-400 font-semibold">{m.issues} issues</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Table */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader><CardTitle className="text-cyan-400">Order Tracking Table</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-gray-400">Order ID</th>
                  <th className="text-left py-2 px-3 text-gray-400">Maker</th>
                  <th className="text-left py-2 px-3 text-gray-400">Delivery (days)</th>
                  <th className="text-left py-2 px-3 text-gray-400">Issue</th>
                  <th className="text-left py-2 px-3 text-gray-400">Customer Happy</th>
                  <th className="text-left py-2 px-3 text-gray-400">Perfect</th>
                  <th className="text-left py-2 px-3 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const days = calcDeliveryDays(order);
                  const perfect = order.perfect_order || isPerfect(order);
                  const isEditing = editingOrder?.id === order.id;
                  return (
                    <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-white font-mono">#{order.id.slice(-6)}</td>
                      <td className="py-2 px-3 text-gray-300">{users[order.maker_id]?.full_name || order.maker_id?.slice(-6) || "—"}</td>
                      <td className="py-2 px-3">
                        <span className={days === null ? "text-gray-500" : days <= EXPECTED_DELIVERY_DAYS ? "text-green-400" : "text-red-400"}>
                          {days === null ? "—" : `${days}d`}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <select
                            className="bg-slate-700 text-white rounded px-2 py-1 text-xs"
                            defaultValue={editingOrder.issue_flag ? "yes" : "no"}
                            onChange={e => setEditingOrder(prev => ({ ...prev, issue_flag: e.target.value === "yes" }))}
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        ) : (
                          <Badge className={order.issue_flag ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}>
                            {order.issue_flag ? "Yes" : "No"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <select
                            className="bg-slate-700 text-white rounded px-2 py-1 text-xs"
                            defaultValue={editingOrder.customer_satisfaction === true ? "yes" : editingOrder.customer_satisfaction === false ? "no" : ""}
                            onChange={e => setEditingOrder(prev => ({ ...prev, customer_satisfaction: e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined }))}
                          >
                            <option value="">Unknown</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : (
                          <Badge className={
                            order.customer_satisfaction === true ? "bg-green-600 text-white" :
                            order.customer_satisfaction === false ? "bg-red-600 text-white" :
                            "bg-gray-700 text-gray-300"
                          }>
                            {order.customer_satisfaction === true ? "Yes" : order.customer_satisfaction === false ? "No" : "—"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={perfect ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}>
                          {perfect ? "✅ Yes" : "❌ No"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700" onClick={() => handleSaveFlags(order, { issue_flag: editingOrder.issue_flag, customer_satisfaction: editingOrder.customer_satisfaction })}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingOrder(null)}>✕</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setEditingOrder({ ...order })}>Edit</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && <p className="text-center text-gray-500 py-8">No completed orders yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}