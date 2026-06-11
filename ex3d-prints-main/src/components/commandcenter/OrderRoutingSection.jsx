import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  Package, Loader2, Search, Users, DollarSign,
  Clock, AlertCircle, CheckCircle, Printer, FileText
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ShippingAddressEditor from "./ShippingAddressEditor";
import OrderShippingPanel from "./OrderShippingPanel";

export default function OrderRoutingSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [makers, setMakers] = useState([]); // New state for makers
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reassigning, setReassigning] = useState(false);
  const [selectedMakerId, setSelectedMakerId] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [makerSplits, setMakerSplits] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, usersData] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list()
      ]);
      setOrders(ordersData.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || ''))));
      setUsers(usersData);
      
      // Get makers for reassignment
      // Filter users who have 'maker' role and a 'maker_id' property
      const makersList = usersData.filter(u => u.business_roles?.includes('maker') && u.maker_id);
      setMakers(makersList);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const getUserInfo = (userId) => {
    const user = users.find(u => u.id === userId);
    return user || { full_name: 'Unknown', email: 'N/A' };
  };

  // New helper function to get maker info by maker_id (from the User object's maker_id property)
  const getMakerByMakerId = (makerId) => {
    const maker = users.find(u => u.maker_id === makerId);
    return maker || { full_name: 'Unknown Maker', email: 'N/A' };
  };

  const handleReassignOrder = async () => {
    if (splitMode) {
      // Validate splits
      if (makerSplits.length === 0) {
        toast({ title: "Add at least one maker split", variant: "destructive" });
        return;
      }

      const totalSplitQuantity = makerSplits.reduce((sum, split) => sum + (split.quantity || 0), 0);
      const orderTotalQuantity = (selectedOrder.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      if (totalSplitQuantity !== orderTotalQuantity) {
        toast({ 
          title: "Quantity mismatch", 
          description: `Total split quantity (${totalSplitQuantity}) must equal order quantity (${orderTotalQuantity})`,
          variant: "destructive" 
        });
        return;
      }

      setReassigning(true);
      try {
        // Create split order items with maker assignments
        const splitItems = [];
        for (const split of makerSplits) {
          for (const item of (selectedOrder.items || [])) {
            const itemQuantityShare = Math.floor((split.quantity / orderTotalQuantity) * item.quantity);
            if (itemQuantityShare > 0) {
              splitItems.push({
                ...item,
                quantity: itemQuantityShare,
                assigned_maker_id: split.maker_id,
                total_price: (item.unit_price * itemQuantityShare)
              });
            }
          }
        }

        await base44.entities.Order.update(selectedOrder.id, {
          items: splitItems,
          assigned_to_makers: makerSplits.map(s => s.maker_id),
          status: 'pending'
        });

        toast({ title: "Order split and assigned successfully!" });
        setSelectedOrder(null);
        setSelectedMakerId("");
        setSplitMode(false);
        setMakerSplits([]);
        loadData();
      } catch (error) {
        console.error('Failed to split order:', error);
        toast({ title: "Failed to split order", variant: "destructive" });
      }
      setReassigning(false);
    } else {
      // Single maker assignment
      if (!selectedMakerId || !selectedOrder) {
        toast({ title: "Please select a maker", variant: "destructive" });
        return;
      }

      setReassigning(true);
      try {
        await base44.entities.Order.update(selectedOrder.id, {
          maker_id: selectedMakerId,
          status: 'pending',
          offer_status: 'offered',
          current_offered_maker_id: selectedMakerId,
          // Set offer timestamps so the maker hub + auto-reassignment treat
          // admin reassignments the same as automatic offers
          offered_at: new Date().toISOString(),
          offer_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          // Clear stale multi-assignment pool so the order shows for the new maker only
          assigned_to_makers: null,
        });

        // Notify the newly assigned maker via email
        const newMaker = makers.find(m => m.maker_id === selectedMakerId);
        if (newMaker?.email) {
          base44.functions.invoke('notifyMakerOrderAssigned', {
            orderId: selectedOrder.id,
            makerId: selectedMakerId,
            makerEmail: newMaker.email,
            makerName: newMaker.full_name,
          }).catch(() => {});
        }

        toast({ title: "Order reassigned successfully" });
        setSelectedOrder(null);
        setSelectedMakerId("");
        loadData();
      } catch (error) {
        console.error('Failed to reassign order:', error);
        toast({ title: "Failed to reassign order", variant: "destructive" });
      }
      setReassigning(false);
    }
  };

  const addMakerSplit = () => {
    setMakerSplits([...makerSplits, { maker_id: "", quantity: 0 }]);
  };

  const removeMakerSplit = (index) => {
    setMakerSplits(makerSplits.filter((_, i) => i !== index));
  };

  const updateMakerSplit = (index, field, value) => {
    const updated = [...makerSplits];
    updated[index][field] = field === 'quantity' ? parseInt(value) || 0 : value;
    setMakerSplits(updated);
  };

  const ORDER_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'printing', label: 'Printing' },
    { value: 'done_printing', label: 'Done Printing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'dropped_off', label: 'Dropped Off' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'unassigned', label: 'Unassigned' },
  ];

  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder || updatingStatus) return;

    // Cancellation must go through the refund function
    if (newStatus === 'cancelled') {
      const reason = window.prompt('Enter cancellation reason (required):');
      if (!reason || !reason.trim()) {
        toast({ title: "Cancellation reason required", variant: "destructive" });
        return;
      }
      setUpdatingStatus(true);
      try {
        const res = await base44.functions.invoke('adminCancelAndRefundOrder', {
          orderId: selectedOrder.id,
          cancellationReason: reason.trim(),
        });
        if (res.data?.success) {
          const updatedOrder = { ...selectedOrder, status: 'cancelled', payment_status: res.data.refund_id ? 'refunded' : selectedOrder.payment_status };
          setSelectedOrder(updatedOrder);
          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
          toast({
            title: "Order cancelled",
            description: res.data.refund_id
              ? `Refund issued: ${res.data.refund_id}`
              : res.data.refund_error
                ? `⚠️ Refund failed: ${res.data.refund_error}`
                : 'No payment to refund.',
          });
        } else {
          toast({ title: "Cancellation failed", description: res.data?.error || 'Unknown error', variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Failed to cancel order", description: error.message, variant: "destructive" });
      }
      setUpdatingStatus(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      await base44.entities.Order.update(selectedOrder.id, { status: newStatus });
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
      toast({ title: `Status updated to "${newStatus.replace(/_/g, ' ')}"` });
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
    setUpdatingStatus(false);
  };

  const filteredOrders = orders.filter(order => {
    const customer = getUserInfo(order.customer_id);
    // Use getMakerByMakerId for consistency with reassign logic if maker_id refers to user.maker_id
    const maker = order.maker_id ? getMakerByMakerId(order.maker_id) : null;
    
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (order.id || '').toLowerCase().includes(q) ||
      (customer.full_name || '').toLowerCase().includes(q) ||
      (customer.email || '').toLowerCase().includes(q) ||
      (maker && (maker.full_name || '').toLowerCase().includes(q));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const fmt = (val) => (Number(val) || 0).toFixed(2);

  const calculatePlatformShare = (total) => ((Number(total) || 0) * 0.50).toFixed(2);
  const calculateMakerPayout = (total) => ((Number(total) || 0) * 0.50).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Order Management</h2>
          <p className="text-cyan-400">Comprehensive order tracking and assignment</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search orders, customers, makers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Order ID</TableHead>
                    <TableHead className="text-slate-300">Customer</TableHead>
                    <TableHead className="text-slate-300">Items</TableHead>
                    <TableHead className="text-slate-300">Total</TableHead>
                    <TableHead className="text-slate-300">Platform Share</TableHead>
                    <TableHead className="text-slate-300">Maker Payout</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Maker</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => {
                    const customer = getUserInfo(order.customer_id);
                    const maker = order.maker_id ? getMakerByMakerId(order.maker_id) : null;
                    
                    const getStatusBadgeColor = (status) => {
                      switch (status) {
                        case 'pending':
                          return 'bg-yellow-500 text-yellow-900';
                        case 'accepted':
                          return 'bg-blue-500 text-blue-900';
                        case 'printing':
                          return 'bg-purple-500 text-purple-900';
                        case 'completed':
                          return 'bg-green-500 text-green-900';
                        case 'dropped_off':
                          return 'bg-teal-500 text-teal-900';
                        case 'delivered':
                          return 'bg-emerald-500 text-emerald-900';
                        case 'cancelled':
                          return 'bg-red-500 text-red-900';
                        case 'unassigned':
                          return 'bg-gray-500 text-gray-900';
                        default:
                          return 'bg-gray-500 text-gray-900';
                      }
                    };
                    
                    return (
                      <TableRow key={order.id} className="border-slate-700">
                        <TableCell className="text-white font-mono text-xs">
                          #{order.id.slice(-8)}
                          {order.is_priority && (
                            <Badge className="ml-2 bg-orange-500">⚡</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div>
                            <p className="font-medium">{customer.full_name}</p>
                            <p className="text-xs text-slate-400">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {order.items?.length || 0} item(s)
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          ${fmt(order.total_amount)}
                          {order.is_priority && (
                            <span className="text-xs text-orange-400 block">+$4 priority</span>
                          )}
                        </TableCell>
                        <TableCell className="text-cyan-400">
                          ${calculatePlatformShare(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-green-400">
                          ${calculateMakerPayout(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(order.status)}>
                            {order.status === 'dropped_off' ? 'delivered' : (order.status || 'unknown').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {maker ? (
                            <div>
                              <p className="font-medium">{maker.full_name}</p>
                              <p className="text-xs text-slate-400">{maker.email}</p>
                            </div>
                          ) : (
                            <Badge className="bg-yellow-500">Awaiting Acceptance</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {order.created_date ? new Date(order.created_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrder(order)}
                            className="bg-slate-700 text-white border-slate-600"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog with Reassignment */}
      <Dialog open={!!selectedOrder} onOpenChange={() => {
        setSelectedOrder(null);
        setSelectedMakerId(""); // Reset selected maker on dialog close
      }}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Order Details #{selectedOrder?.id?.slice(-8)}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Complete order information and item breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(() => {
                      const customer = getUserInfo(selectedOrder.customer_id);
                      return (
                        <>
                          <div>
                            <span className="text-slate-400">Name:</span>
                            <p className="text-white font-medium">{customer.full_name}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Email:</span>
                            <p className="text-white">{customer.email}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Customer ID:</span>
                            <p className="text-white font-mono text-xs">{selectedOrder.customer_id}</p>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Financial Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Amount:</span>
                      <span className="text-white font-bold">${fmt(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Platform Share (50%):</span>
                      <span className="text-cyan-400 font-bold">${calculatePlatformShare(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maker Payout (50%):</span>
                      <span className="text-green-400 font-bold">${calculateMakerPayout(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Payment Status:</span>
                      <Badge className={selectedOrder.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                        {selectedOrder.payment_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Maker Info */}
              {selectedOrder.maker_id && (
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      Assigned Maker
                      {selectedOrder.is_priority && (
                        <Badge className="bg-orange-500 ml-2">⚡ PRIORITY</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Use getMakerByMakerId as per outline's implied data model
                      const maker = getMakerByMakerId(selectedOrder.maker_id);
                      return (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Name:</span>
                            <p className="text-white font-medium">{maker.full_name}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Email:</span>
                            <p className="text-white">{maker.email}</p>
                          </div>
                          {/* Removed specific Maker ID display as per outline change */}
                          {selectedOrder.actual_print_hours && (
                            <div>
                              <span className="text-slate-400">Print Time:</span>
                              <p className="text-white">{selectedOrder.actual_print_hours}h</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {selectedOrder.is_priority && (
                      <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded">
                        <p className="text-sm text-orange-300">
                          <strong>⚡ PRIORITY ORDER:</strong> Must be completed by next day
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="bg-slate-800 p-4 rounded-lg">
                      <div className="flex gap-4">
                        {item.images?.[0] && (
                          <img src={item.images[0]} alt={item.product_name} className="w-24 h-24 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-white font-semibold text-lg">{item.product_name}</p>
                            {item.custom_request_id ? (
                              <Badge className="bg-blue-600 text-white">Custom Order</Badge>
                            ) : item.product_id && (
                              <a
                                href={`${window.location.origin}/ProductDetail?id=${item.product_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                              >
                                View Listing →
                              </a>
                            )}
                          </div>
                          {item.custom_request_id && selectedOrder.customer_username && (
                            <div className="mb-2">
                              <Badge className="bg-teal-600 text-white">Deliver To: @{selectedOrder.customer_username}</Badge>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Material:</span>
                              <p className="text-white">{item.selected_material}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Color:</span>
                              <p className="text-white">{item.selected_color}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Resolution:</span>
                              <p className="text-white">{item.selected_resolution}mm</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Quantity:</span>
                              <p className="text-white">{item.quantity}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Unit Price:</span>
                              <p className="text-white">${fmt(item.unit_price)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Total:</span>
                              <p className="text-white font-bold">${fmt(item.total_price)}</p>
                            </div>
                            {item.weight_grams && (
                              <div>
                                <span className="text-slate-400">Weight:</span>
                                <p className="text-white">{item.weight_grams}g</p>
                              </div>
                            )}
                            {item.print_time_hours && (
                              <div>
                                <span className="text-slate-400">Est. Print Time:</span>
                                <p className="text-white">{item.print_time_hours}h</p>
                              </div>
                            )}
                            {item.print_files && item.print_files.length > 0 && (
                              <div>
                                <span className="text-slate-400">Print Files:</span>
                                <p className="text-white">{item.print_files.length} file(s)</p>
                              </div>
                            )}
                            {item.description && (
                              <div className="col-span-2">
                                <span className="text-slate-400">Description:</span>
                                <p className="text-white">{item.description}</p>
                              </div>
                            )}
                            {item.special_requirements && (
                              <div className="col-span-2">
                                <span className="text-slate-400">Special Requirements:</span>
                                <p className="text-white">{item.special_requirements}</p>
                              </div>
                            )}
                          </div>
                          {item.images && item.images.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-slate-400 mb-2">Images:</p>
                              <div className="flex gap-2 flex-wrap">
                                {item.images.map((img, imgIdx) => (
                                  <img key={imgIdx} src={img} alt={`Item ${idx + 1} - Image ${imgIdx + 1}`} className="w-20 h-20 object-cover rounded border border-slate-600" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Shipping Address Section */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.shipping_address ? (
                    <ShippingAddressEditor order={selectedOrder} onSaved={loadData} />
                  ) : (
                    <p className="text-slate-400 text-sm">No shipping address on file (local delivery or pickup).</p>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Label & Tracking */}
              <Card className="bg-slate-900 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Shipping Label & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderShippingPanel
                    order={selectedOrder}
                    onOrderUpdated={(updates) => {
                      const updated = { ...selectedOrder, ...updates };
                      setSelectedOrder(updated);
                      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updates } : o));
                    }}
                  />
                </CardContent>
              </Card>

              {/* Status Change */}
              <Card className="bg-slate-900 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Update Order Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map(({ value, label }) => (
                      <Button
                        key={value}
                        size="sm"
                        disabled={updatingStatus || selectedOrder.status === value}
                        onClick={() => handleStatusChange(value)}
                        className={
                          selectedOrder.status === value
                            ? 'bg-yellow-500 text-black cursor-default'
                            : 'bg-slate-700 text-white hover:bg-yellow-600'
                        }
                      >
                        {updatingStatus && selectedOrder.status !== value ? '' : ''}{label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current: <span className="text-yellow-400 font-semibold">{(selectedOrder.status || 'unknown').replace(/_/g, ' ')}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Reassign Order Section */}
              <Card className="bg-slate-900 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Reassign Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOrder.maker_id && (
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 mb-3">
                      <p className="text-sm text-blue-300">
                        <strong>Currently Assigned To:</strong> {getMakerByMakerId(selectedOrder.maker_id)?.full_name || 'Unknown Maker'}
                      </p>
                    </div>
                  )}

                  {/* Total Quantity Display */}
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <p className="text-sm text-slate-400">
                      <strong className="text-white">Total Order Quantity:</strong> {(selectedOrder.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)} units
                    </p>
                  </div>

                  {/* Toggle Split Mode */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="splitMode"
                      checked={splitMode}
                      onChange={(e) => {
                        setSplitMode(e.target.checked);
                        if (!e.target.checked) {
                          setMakerSplits([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="splitMode" className="text-white cursor-pointer">
                      Split order among multiple makers by quantity
                    </Label>
                  </div>

                  {!splitMode ? (
                    /* Single Maker Assignment */
                    <>
                      <div>
                        <Label className="text-white mb-2 block">Select New Maker</Label>
                        <Select value={selectedMakerId} onValueChange={setSelectedMakerId}>
                          <SelectTrigger className="bg-slate-900 border-cyan-500/30 text-white">
                            <SelectValue placeholder="Choose a maker..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-cyan-500/30">
                            {makers.map(maker => (
                              <SelectItem key={maker.maker_id} value={maker.maker_id} className="text-white">
                                {maker.full_name} ({maker.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleReassignOrder}
                        disabled={reassigning || !selectedMakerId}
                        className="w-full bg-cyan-600 hover:bg-cyan-700"
                      >
                        {reassigning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reassigning...
                          </>
                        ) : (
                          'Reassign Order'
                        )}
                      </Button>
                    </>
                  ) : (
                    /* Split Mode - Multiple Makers */
                    <>
                      <div className="space-y-3">
                        <Label className="text-white">Assign Quantities to Makers</Label>
                        {makerSplits.map((split, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-slate-400 text-xs">Maker</Label>
                              <Select
                                value={split.maker_id}
                                onValueChange={(value) => updateMakerSplit(index, 'maker_id', value)}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                  <SelectValue placeholder="Choose maker..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-cyan-500/30">
                                  {makers.map(maker => (
                                    <SelectItem key={maker.maker_id} value={maker.maker_id} className="text-white">
                                      {maker.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-32">
                              <Label className="text-slate-400 text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={split.quantity}
                                onChange={(e) => updateMakerSplit(index, 'quantity', e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                                placeholder="0"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMakerSplit(index)}
                              className="bg-red-900 text-white border-red-700 hover:bg-red-800"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={addMakerSplit}
                          className="w-full bg-slate-700 text-white border-slate-600"
                        >
                          + Add Maker
                        </Button>
                      </div>

                      {/* Quantity Summary */}
                      {makerSplits.length > 0 && (
                        <div className="bg-slate-800 p-3 rounded border border-slate-700">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Assigned:</span>
                            <span className={`font-semibold ${
                              makerSplits.reduce((sum, s) => sum + (s.quantity || 0), 0) === selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}>
                              {makerSplits.reduce((sum, s) => sum + (s.quantity || 0), 0)} / {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} units
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleReassignOrder}
                        disabled={reassigning || makerSplits.length === 0}
                        className="w-full bg-cyan-600 hover:bg-cyan-700"
                      >
                        {reassigning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Splitting Order...
                          </>
                        ) : (
                          'Split & Assign Order'
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}