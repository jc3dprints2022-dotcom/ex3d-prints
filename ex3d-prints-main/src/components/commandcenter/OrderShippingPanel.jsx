import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Download, Package, RefreshCw, MapPin, Clock, CheckCircle, Truck
} from "lucide-react";

const STATUS_COLORS = {
  PRE_TRANSIT: "bg-gray-500",
  TRANSIT: "bg-blue-500",
  DELIVERED: "bg-green-600",
  RETURNED: "bg-orange-500",
  FAILURE: "bg-red-500",
  UNKNOWN: "bg-gray-500",
};

export default function OrderShippingPanel({ order, onOrderUpdated }) {
  const [generating, setGenerating] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const hasLabel = !!order.shipping_label_url;

  const handleGenerateLabel = async () => {
    setGenerating(true);
    setShowForm(false);
    try {
      const res = await base44.functions.invoke("generateShippingLabel", { orderId: order.id });
      // base44 SDK wraps the response — handle both res.data and direct response shapes
      const data = res?.data ?? res;
      if (data?.success) {
        toast({
          title: "Shipping label generated!",
          description: `Tracking: ${data.tracking_number}`,
        });
        onOrderUpdated({
          tracking_number: data.tracking_number,
          shipping_label_url: data.label_url,
          shipping_cost: data.cost,
        });
      } else {
        // Surface the full error detail so nothing fails silently
        const errMsg = data?.error || data?.details || "Unknown error from Shippo";
        const shippoMessages = data?.shipment_messages;
        const detail = shippoMessages?.length
          ? `${errMsg} — Shippo: ${shippoMessages.map(m => m.text || m).join(', ')}`
          : errMsg;
        toast({ title: "Label generation failed", description: detail, variant: "destructive", duration: 10000 });
      }
    } catch (err) {
      toast({ title: "Failed to generate label", description: err.message, variant: "destructive", duration: 8000 });
    }
    setGenerating(false);
  };

  const handleFetchTracking = async () => {
    if (!order.tracking_number) return;
    setLoadingTracking(true);
    try {
      const res = await base44.functions.invoke("getShippoTracking", {
        orderId: order.id,
        trackingNumber: order.tracking_number,
      });
      const data = res.data;
      if (data?.success) {
        setTracking(data.tracking);
        if (data.tracking.status === "DELIVERED" && order.status !== "delivered") {
          onOrderUpdated({ status: "delivered", delivered_at: data.tracking.delivered_at });
          toast({ title: "Order marked as delivered based on tracking!" });
        }
      } else {
        toast({ title: "Tracking fetch failed", description: data?.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to fetch tracking", description: err.message, variant: "destructive" });
    }
    setLoadingTracking(false);
  };

  if (order.is_local_delivery) {
    return (
      <p className="text-slate-400 text-sm">Local delivery — no shipping label needed.</p>
    );
  }

  if (!order.shipping_address?.street) {
    return (
      <p className="text-yellow-400 text-sm">⚠️ No shipping address on file — cannot generate label.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label Section */}
      {!hasLabel ? (
        <div>
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Package className="w-4 h-4 mr-2" />
              Generate Shipping Label
            </Button>
          ) : (
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-4 space-y-3">
                <p className="text-white text-sm font-medium">Auto-generate label using order dimensions & weight</p>
                <p className="text-slate-400 text-xs">
                  Weight and dimensions are pulled from order items. The cheapest available USPS rate will be selected.
                  {order.is_priority ? " Priority orders use USPS Priority Mail." : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateLabel}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      "Generate Label"
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="text-white border-slate-600">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Label exists */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-green-600 text-white">
              <CheckCircle className="w-3 h-3 mr-1 inline" /> Label Generated
            </Badge>
            <span className="text-slate-300 text-sm font-mono">{order.tracking_number}</span>
            {order.shipping_cost && (
              <span className="text-slate-400 text-xs">Cost: ${Number(order.shipping_cost).toFixed(2)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => window.open(order.shipping_label_url, "_blank")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-1" /> Download / Print Label
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFetchTracking}
              disabled={loadingTracking}
              className="text-white border-slate-600"
            >
              {loadingTracking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><RefreshCw className="w-4 h-4 mr-1" /> Check Tracking</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {tracking && (
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="text-white text-sm font-medium">Tracking Status</span>
              </div>
              <Badge className={`${STATUS_COLORS[tracking.status] || "bg-gray-500"} text-white`}>
                {tracking.status_label}
              </Badge>
            </div>

            {tracking.status_details && (
              <p className="text-slate-300 text-sm">{tracking.status_details}</p>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              {tracking.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {tracking.location}
                </span>
              )}
              {tracking.latest_event_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(tracking.latest_event_date).toLocaleString()}
                </span>
              )}
              {tracking.eta && (
                <span className="text-teal-400">ETA: {new Date(tracking.eta).toLocaleDateString()}</span>
              )}
            </div>

            {/* History timeline */}
            {tracking.history?.length > 0 && (
              <div className="space-y-2 border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">History</p>
                {tracking.history.map((event, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-slate-500 w-32 flex-shrink-0">
                      {event.date ? new Date(event.date).toLocaleDateString() : "—"}
                    </span>
                    <span className="text-slate-300">{event.status}{event.details ? ` — ${event.details}` : ""}</span>
                    {event.location && (
                      <span className="text-slate-500 ml-auto flex-shrink-0">{event.location}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}