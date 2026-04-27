import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Truck, Package, Search, Copy, ExternalLink, RefreshCw, Download, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";

const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  printing: "bg-purple-100 text-purple-800",
  done_printing: "bg-orange-100 text-orange-800",
  shipped: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const SHIPPO_STATUS_CONFIG = {
  DELIVERED:   { label: "Delivered",        color: "bg-green-500 text-white",  icon: CheckCircle },
  TRANSIT:     { label: "In Transit",       color: "bg-blue-500 text-white",   icon: Truck },
  PRE_TRANSIT: { label: "Label Created",    color: "bg-gray-500 text-white",   icon: Package },
  RETURNED:    { label: "Returned",         color: "bg-orange-500 text-white", icon: AlertCircle },
  FAILURE:     { label: "Exception",        color: "bg-red-500 text-white",    icon: AlertCircle },
  UNKNOWN:     { label: "Unknown",          color: "bg-gray-400 text-white",   icon: Package },
};

export default function ShipmentTrackingSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const [trackingData, setTrackingData] = useState({});
  const [fetchingTracking, setFetchingTracking] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allOrders, allUsers] = await Promise.all([
        base44.entities.Order.list("-created_date"),
        base44.entities.User.list(),
      ]);
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
      const res = await base44.functions.invoke("generateShippingLabel", { orderId: order.id });
      const data = res?.data;
      if (data?.success) {
        toast({ title: "Label generated!", description: `${data.carrier || ''} ${data.service || ''} — $${data.cost || ''}` });
        if (data.label_url) window.open(data.label_url, "_blank");
        await loadData();
      } else {
        throw new Error(data?.error || "Label generation failed");
      }
    } catch (error) {
      toast({ title: "Label failed", description: error.message, variant: "destructive" });
    }
    setGeneratingLabel(null);
  };

  const handleFetchTracking = async (order) => {
    if (!order.tracking_number) return;
    setFetchingTracking(order.id);
    try {
      const res = await base44.functions.invoke("getShippoTracking", {
        orderId: order.id,
        trackingNumber: order.tracking_number,
      });
      const data = res?.data;
      if (data?.success) {
        setTrackingData(prev => ({ ...prev, [order.id]: data.tracking }));
        setExpandedOrder(order.id);
        toast({ title: `Status: ${data.tracking.status_label}` });
      } else {
        throw new Error(data?.error || "Failed to fetch tracking");
      }
    } catch (error) {
      toast({ title: "Tracking failed", description: error.message, variant: "destructive" });
    }
    setFetchingTracking(null);
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
          <p className="text-cyan-400 text-sm">All orders requiring shipping — label generation & live Shippo tracking</p>
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
            const isFetching = fetchingTracking === order.id;
            const needsLabel = !order.shipping_label_url && ["done_printing", "accepted", "printing"].includes(order.status);
            const tracking = trackingData[order.id];
            const isExpanded = expandedOrder === order.id;
            const shippoStatus = tracking ? SHIPPO_STATUS_CONFIG[tracking.status] || SHIPPO_STATUS_CONFIG.UNKNOWN : null;
            const StatusIcon = shippoStatus?.icon;

            return (
              <Card key={order.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-white font-mono font-semibold">#{order.id.slice(-8)}</span>
                        <Badge className={ORDER_STATUS_COLORS[order.status] || "bg-gray-500 text-white"}>
                          {order.status?.replace(/_/g, " ")}
                        </Badge>
                        {shippoStatus && (
                          <Badge className={shippoStatus.color}>
                            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1 inline" />}
                            {shippoStatus.label}
                          </Badge>
                        )}
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
                          {tracking?.eta && (
                            <p className="text-cyan-400 text-xs mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              ETA: {new Date(tracking.eta).toLocaleDateString()}
                            </p>
                          )}
                          {tracking?.delivered_at && (
                            <p className="text-green-400 text-xs mt-1">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              Delivered: {new Date(tracking.delivered_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {order.tracking_number && (
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-slate-400 text-xs">Tracking:</span>
                          <code className="text-cyan-300 font-mono text-xs bg-slate-900 px-2 py-1 rounded">
                            {order.tracking_number}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400" onClick={() => copyTracking(order.tracking_number)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          {tracking?.location && (
                            <span className="text-slate-400 text-xs">
                              <MapPin className="w-3 h-3 inline mr-1" />{tracking.location}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Live tracking history */}
                      {isExpanded && tracking?.history?.length > 0 && (
                        <div className="mt-3 bg-slate-900 rounded-lg p-3 space-y-2">
                          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Recent Updates</p>
                          {tracking.history.map((h, i) => (
                            <div key={i} className="flex gap-3 text-xs">
                              <span className="text-slate-500 whitespace-nowrap">{h.date ? new Date(h.date).toLocaleDateString() : '—'}</span>
                              <span className="text-cyan-300 font-medium">{h.status}</span>
                              <span className="text-slate-400">{h.details}</span>
                              {h.location && <span className="text-slate-500 ml-auto">{h.location}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-slate-400 text-xs mt-2">
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
                      {order.tracking_number && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => isExpanded ? setExpandedOrder(null) : handleFetchTracking(order)}
                          disabled={isFetching}
                          className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/20"
                        >
                          {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
                          {isExpanded ? "Hide" : "Track"}
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