import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { generateShippingKitLabel } from '@/functions/generateShippingKitLabel.ts';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  FileText,
  Printer,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

const STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatAddress(addr) {
  if (!addr) return null;
  const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export default function ShippingKitOrdersSection() {
  const [orders, setOrders] = useState([]);
  const [makerMap, setMakerMap] = useState({}); // user_id -> user object
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null); // order id being processed
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const loadOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const results = await base44.entities.ShippingKitOrder.list('-created_date');
      const orderList = Array.isArray(results) ? results : [];
      setOrders(orderList);

      // Fetch maker user info for display
      const uniqueUserIds = [...new Set(orderList.map((o) => o.user_id).filter(Boolean))];
      const userLookups = await Promise.all(
        uniqueUserIds.map((id) =>
          base44.entities.User.get(id).catch(() => null)
        )
      );
      const map = {};
      uniqueUserIds.forEach((id, i) => {
        if (userLookups[i]) map[id] = userLookups[i];
      });
      setMakerMap(map);
    } catch (error) {
      toast({
        title: 'Failed to load orders',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  const copyToClipboard = (text, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: label }),
      () => toast({ title: 'Could not copy', variant: 'destructive' })
    );
  };

  const generateLabel = async (order) => {
    setGeneratingFor(order.id);
    try {
      const response = await generateShippingKitLabel({ kitOrderId: order.id });

      if (response?.data?.success) {
        toast({
          title: 'Label generated',
          description: `${response.data.carrier} ${response.data.service || ''} · $${response.data.cost}`,
        });
        await loadOrders(false);

        // Auto-open label PDF if returned
        if (response.data.label_url) {
          window.open(response.data.label_url, '_blank');
        }
      } else {
        throw new Error(response?.data?.error || 'Failed to generate label');
      }
    } catch (error) {
      toast({
        title: 'Label generation failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const markAsShipped = async (order) => {
    try {
      await base44.entities.ShippingKitOrder.update(order.id, { status: 'shipped' });
      toast({ title: 'Marked as shipped' });
      await loadOrders(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((o) => (o.status || 'pending') === statusFilter);

  const pendingCount = orders.filter((o) => (o.status || 'pending') === 'pending').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Package className="w-6 h-6 text-teal-500" />
          Shipping Kit Orders
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500 text-white ml-2">
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadOrders(false)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
        </Button>
      </CardHeader>

      <CardContent>
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
          {STATUS_FILTERS.map((status) => {
            const count =
              status === 'all'
                ? orders.length
                : orders.filter((o) => (o.status || 'pending') === status).length;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {statusFilter === 'all' ? 'No kit orders yet' : `No ${statusFilter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusKey = order.status || 'pending';
              const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const address = formatAddress(order.shipping_address) ||
                formatAddress(makerMap[order.user_id]?.address);
              const maker = makerMap[order.user_id];
              const isGenerating = generatingFor === order.id;
              const canGenerateLabel = statusKey === 'pending' && !order.shipping_label_url;
              const canMarkShipped = statusKey === 'processing';

              return (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`${config.className} flex items-center gap-1`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 ${
                            statusKey === 'processing' ? 'animate-spin' : ''
                          }`}
                        />
                        {config.label}
                      </Badge>
                      {order.created_date && (
                        <span className="text-sm text-gray-500">
                          {formatDate(order.created_date)}
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${Number(order.cost).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Maker</p>
                      <p className="font-medium">
                        {maker?.full_name || order.shipping_address?.name || 'Unknown'}
                      </p>
                      {maker?.email && (
                        <p className="text-xs text-gray-500">{maker.email}</p>
                      )}
                      {order.subscription_plan && (
                        <p className="text-xs text-gray-500 mt-1">
                          Plan: {order.subscription_plan}
                        </p>
                      )}
                    </div>
                    {address && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Ship to
                        </p>
                        <p>{address}</p>
                      </div>
                    )}
                  </div>

                  {order.tracking_number && (
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        Tracking:
                      </span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {order.tracking_number}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(order.tracking_number, 'Tracking copied')}
                        className="h-7 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {Array.isArray(order.kit_contents) && order.kit_contents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {order.kit_contents.map((item) => (
                        <span
                          key={item}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {item.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    {canGenerateLabel && (
                      <Button
                        onClick={() => generateLabel(order)}
                        disabled={isGenerating}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Printer className="w-4 h-4 mr-2" />
                            Generate Label
                          </>
                        )}
                      </Button>
                    )}
                    {order.shipping_label_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(order.shipping_label_url, '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Label
                      </Button>
                    )}
                    {canMarkShipped && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsShipped(order)}
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Mark Shipped
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}