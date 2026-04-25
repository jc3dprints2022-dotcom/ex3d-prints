import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Truck, Package, Search, Copy, ExternalLink, RefreshCw, Download } from "lucide-react";
import { generateShippingLabel } from "@/functions/generateShippingLabel";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  printing: "bg-purple-100 text-purple-800",
  done_printing: "bg-orange-100 text-orange-800",
  shipped: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function ShipmentTrackingSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allOrders, allUsers] = await Promise.all([
        base44.entities.Order.list("-created_date"),
        base44.entities.User.list(),
      ]);
      // Only show orders that have a shipping address (i.e., need physical shipping)
      const shippingOrders = allOrders.filter(o =>
        o.shipping_address?.street && !o.is_local_delivery &&
        !["cancelled"].includes(o.status)
      );
      setOrders(shippingOrders);
      setUsers(allUsers);
    } catch (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const getUser = (id) => users.find(u => u.id === id) || null;
  const getMaker = (makerId) => users.find(u => u.maker_id === makerId) || null;

  const copyTracking = (tracking) => {
    navigator.clipboard?.writeText(tracking).then(
      () => toast({ title: "Tracking copied!" }),
      () => {}
    );
  };

  const handleGenerateLabel = async (order) => {
    setGeneratingLabel(order.id);
    try {
      const res = await generateShippingLabel({ orderId: order.id });
      if (res?.data?.success) {
        toast({ title: "Label generated!", description: `${res.data.carrier} ${res.data.service} — $${res.data.cost}` });
        if (res.data.label_url) window.open(res.data.label_url, "_blank");
        await loadData();
      } else {
        throw new Error(res?.data?.error || "Label generation failed");
      }
    } catch (error) {
      toast({ title: "Label failed", description: error.message, variant: "destructive" });
    }
    setGeneratingLabel(null);
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    const customer = getUser(o.customer_id);
    return (
      o.id.toLowerCase().includes(q) ||
      (o.tracking_number || "").toLowerCase().includes(q) ||
      (customer?.full_name || "").toLowerCase().includes(q) ||
      (customer?.email || "").toLowerCase().includes(q)
    );
  });

  const pendingLabels = orders.filter(o => !o.shipping_label_url && ["done_printing", "accepted", "printing"].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Shipment Tracking</h2>
          <p className="text-cyan-400 text-sm">All orders requiring shipping — label generation & tracking</p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-slate-600 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {pendingLabels.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-3 text-yellow-300 text-sm">
          ⚠️ {pendingLabels.length} order{pendingLabels.length > 1 ? "s" : ""} need shipping labels generated
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by order ID, tracking, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Truck className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p>No shipping orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const customer = getUser(order.customer_id);
            const maker = order.maker_id ? getMaker(order.maker_id) : null;
            const isGenerating = generatingLabel === order.id;
            const needsLabel = !order.shipping_label_url && ["done_printing", "accepted", "printing"].includes(order.status);

            return (
              <Card key={order.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-white font-mono font-semibold">#{order.id.slice(-8)}</span>
                        <Badge className={STATUS_COLORS[order.status] || "bg-gray-500 text-white"}>
                          {order.status?.replace("_", " ")}
                        </Badge>
                        {order.is_priority && <Badge className="bg-orange-500 text-white">⚡ Priority</Badge>}
                        <span className="text-slate-400 text-xs">{new Date(order.created_date).toLocaleDateString()}</span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Customer</p>
                          <p className="text-white">{customer?.full_name || "Unknown"}</p>
                          <p className="text-slate-400 text-xs">{customer?.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Ship To</p>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {order.shipping_address?.name}<br />
                            {order.shipping_address?.street}<br />
                            {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Maker</p>
                          <p className="text-white text-sm">{maker?.full_name || "Unassigned"}</p>
                        </div>
                      </div>

                      {order.tracking_number && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-slate-400 text-xs">Tracking:</span>
                          <code className="text-cyan-300 font-mono text-xs bg-slate-900 px-2 py-1 rounded">
                            {order.tracking_number}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400" onClick={() => copyTracking(order.tracking_number)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      <div className="text-slate-400 text-xs">
                        {order.items?.length || 0} item(s) · ${order.total_amount?.toFixed(2)} total
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {needsLabel && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateLabel(order)}
                          disabled={isGenerating}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Package className="w-4 h-4 mr-1" />}
                          Generate Label
                        </Button>
                      )}
                      {order.shipping_label_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(order.shipping_label_url, "_blank")}
                          className="border-slate-600 text-slate-300"
                        >
                          <Download className="w-4 h-4 mr-1" /> Label
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}