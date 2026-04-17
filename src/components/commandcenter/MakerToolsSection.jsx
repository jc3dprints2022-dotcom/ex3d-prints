import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Package,
  Download,
  CheckCircle,
  MapPin,
  Mail,
  FlaskConical,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generateShippingKitLabel } from "@/functions/generateShippingKitLabel";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-800",
};

function getLabelUrl(order) {
  return (
    order?.shipping_label_url ||
    order?.label_url ||
    order?.shippingLabelUrl ||
    order?.labelUrl ||
    ""
  );
}

export default function ShippingKitOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [filamentOrders, setFilamentOrders] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [generatingLabel, setGeneratingLabel] = useState(null);
  const [markingShipped, setMarkingShipped] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);

    try {
      const [kitOrders, redemptions] = await Promise.all([
        base44.entities.ShippingKitOrder.list("-created_date").catch(() => []),
        base44.entities.ExpRedemption.filter({ payment_type: "money" }).catch(() => []),
      ]);

      setOrders(kitOrders || []);
      setFilamentOrders(redemptions || []);

      const allOrders = [...(kitOrders || []), ...(redemptions || [])];
      const uniqueUserIds = [...new Set(allOrders.map((o) => o.user_id).filter(Boolean))];

      const userMap = {};

      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          const user = await base44.entities.User.get(uid).catch(() => null);
          if (user) {
            userMap[uid] = user;
          }
        })
      );

      setUsers(userMap);
    } catch (error) {
      console.error("Failed to load shipping kit orders:", error);
      toast({
        title: "Failed to load orders",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabel = async (order) => {
    setGeneratingLabel(order.id);

    try {
      const user = users[order.user_id];
      const addr = order.shipping_address?.street ? order.shipping_address : user?.address;

      if (!addr?.street) {
        toast({
          title: "No shipping address found for this maker",
          variant: "destructive",
        });
        return;
      }

      const result = await generateShippingKitLabel({ kitOrderId: order.id });

      const newLabelUrl =
        result?.data?.label_url ||
        result?.data?.shipping_label_url ||
        "";

      const newTrackingNumber =
        result?.data?.tracking_number ||
        order?.tracking_number ||
        "";

      if (newLabelUrl || newTrackingNumber) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  shipping_label_url: newLabelUrl || o.shipping_label_url,
                  tracking_number: newTrackingNumber,
                  status: "processing",
                }
              : o
          )
        );

        if (newLabelUrl) {
          window.open(newLabelUrl, "_blank", "noopener,noreferrer");
        }

        toast({
          title: "Shipping label generated!",
        });
      } else {
        toast({
          title: result?.data?.error || "Failed to generate label",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating label:", error);
      toast({
        title: "Failed to generate label",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGeneratingLabel(null);
    }
  };

  const handleDownloadLabel = (order) => {
    const labelUrl = getLabelUrl(order);

    if (labelUrl) {
      window.open(labelUrl, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      title: "No label URL found for this order",
      description: "Regenerate the label to save a downloadable PDF URL.",
      variant: "destructive",
    });
  };

  const handleMarkShipped = async (order, trackingNumber) => {
    setMarkingShipped(order.id);

    try {
      const tracking = trackingNumber || window.prompt("Enter tracking number (optional):");

      await base44.entities.ShippingKitOrder.update(order.id, {
        status: "shipped",
        tracking_number: tracking || order.tracking_number || "",
      });

      const user = users[order.user_id];
      if (user?.email) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: "Your EX3D Shipping Kit Has Shipped! 📦",
          body: `Hi ${user.full_name},\n\nGreat news — your EX3D shipping kit is on its way!${
            tracking ? `\n\nTracking Number: ${tracking}` : ""
          }\n\nYou should receive it within a few business days.\n\nThe EX3D Team`,
        }).catch(() => {});
      }

      toast({
        title: "Order marked as shipped!",
      });

      await loadOrders();
    } catch (error) {
      console.error("Failed to mark shipped:", error);
      toast({
        title: "Failed to mark shipped",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setMarkingShipped(null);
    }
  };

  const pendingCount = orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Kit & Filament Orders</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={loadOrders}
          className="border-slate-600 text-slate-300"
        >
          Refresh
        </Button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-3 text-yellow-300 text-sm">
          ⚠️ {pendingCount} shipping kit order{pendingCount > 1 ? "s" : ""} pending fulfillment
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <Tabs defaultValue="kits">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger
              value="kits"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300"
            >
              <Package className="w-4 h-4 mr-1" />
              Shipping Kits ({orders.length})
            </TabsTrigger>
            <TabsTrigger
              value="filament"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300"
            >
              <FlaskConical className="w-4 h-4 mr-1" />
              Filament Orders ({filamentOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kits">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No shipping kit orders yet</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {orders.map((order) => {
                  const user = users[order.user_id];
                  const addr = order.shipping_address?.street
                    ? order.shipping_address
                    : user?.address;

                  const labelUrl = getLabelUrl(order);
                  const hasTracking = !!order.tracking_number;

                  return (
                    <Card key={order.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">
                                {user?.full_name || "Unknown Maker"}
                              </p>
                              <Badge
                                className={
                                  STATUS_COLORS[order.status] || "bg-gray-200 text-gray-800"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-slate-400">
                              <Mail className="w-3 h-3" />
                              {user?.email || order.user_id}
                            </div>

                            <p className="text-xs text-slate-500 mt-1">
                              Ordered: {new Date(order.created_date).toLocaleDateString()} · Paid: $
                              {((order.cost || 0) / 100).toFixed(2)}
                            </p>
                          </div>

                          <div className="text-right">
                            {order.tracking_number && (
                              <p className="text-xs text-cyan-400 mb-1">
                                Tracking: {order.tracking_number}
                              </p>
                            )}
                          </div>
                        </div>

                        {addr?.street && (
                          <div className="flex items-start gap-2 mb-3 p-2 bg-slate-900 rounded text-sm text-slate-300">
                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                            <span>
                              {addr?.name || user?.full_name || ""}, {addr?.street}, {addr?.city},{" "}
                              {addr?.state} {addr?.zip}
                            </span>
                          </div>
                        )}

                        {order.status !== "shipped" &&
                          order.status !== "delivered" &&
                          order.status !== "cancelled" && (
                            <div className="flex gap-2 mt-2">
                              {labelUrl ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-900/30"
                                  onClick={() => handleDownloadLabel(order)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Download Label PDF
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 text-slate-300"
                                  onClick={() => handleGenerateLabel(order)}
                                  disabled={generatingLabel === order.id}
                                >
                                  {generatingLabel === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-1" />
                                  )}
                                  {hasTracking ? "Re-generate Label" : "Generate Label"}
                                </Button>
                              )}

                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleMarkShipped(order, order.tracking_number)}
                                disabled={markingShipped === order.id}
                              >
                                {markingShipped === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                )}
                                Mark Shipped
                              </Button>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="filament">
            {filamentOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FlaskConical className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>No filament orders yet</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {filamentOrders.map((order) => {
                  const user = users[order.user_id];

                  return (
                    <Card key={order.id} className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-white">
                                {user?.full_name || order.user_id}
                              </p>
                              <Badge
                                className={
                                  STATUS_COLORS[order.status] || "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {order.status || "pending"}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-slate-400">
                              <Mail className="w-3 h-3" />
                              {user?.email || "—"}
                            </div>

                            <p className="text-sm text-slate-300 mt-2 font-medium">
                              {order.reward_name || "Filament Order"}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              Ordered: {new Date(order.created_date).toLocaleDateString()}
                            </p>
                          </div>

                          <Badge className="bg-teal-900/40 text-teal-300 border border-teal-700">
                            Paid by Card
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}