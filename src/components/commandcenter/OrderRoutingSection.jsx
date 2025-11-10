
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
import { Label } from "@/components/ui/label"; // Added Label import

export default function OrderRoutingSection() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [makers, setMakers] = useState([]); // New state for makers
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reassigning, setReassigning] = useState(false); // New state for reassigning
  const [selectedMakerId, setSelectedMakerId] = useState(""); // New state for selected maker for reassignment
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
      setOrders(ordersData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
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
    if (!selectedMakerId || !selectedOrder) {
      toast({ title: "Please select a maker", variant: "destructive" });
      return;
    }

    setReassigning(true);
    try {
      // Assuming order.maker_id stores the user.maker_id value for makers
      await base44.entities.Order.update(selectedOrder.id, {
        maker_id: selectedMakerId, // selectedMakerId comes from maker.maker_id
        status: 'pending' // As per outline
      });

      toast({ title: "Order reassigned successfully" });
      setSelectedOrder(null);
      setSelectedMakerId("");
      loadData();
    } catch (error) {
      console.error('Failed to reassign order:', error);
      toast({ title: "Failed to reassign order", variant: "destructive" });
    }
    setReassigning(false);
  };

  const filteredOrders = orders.filter(order => {
    const customer = getUserInfo(order.customer_id);
    // Use getMakerByMakerId for consistency with reassign logic if maker_id refers to user.maker_id
    const maker = order.maker_id ? getMakerByMakerId(order.maker_id) : null;
    
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (maker && maker.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const calculatePlatformShare = (total) => {
    return (total * 0.30).toFixed(2); // 30% platform fee
  };

  const calculateMakerPayout = (total) => {
    return (total * 0.70).toFixed(2); // 70% maker payout
  };

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
                          ${order.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-cyan-400">
                          ${calculatePlatformShare(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-green-400">
                          ${calculateMakerPayout(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(order.status)}>
                            {order.status.replace('_', ' ')}
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
                          {new Date(order.created_date).toLocaleDateString()}
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
              Order Details #{selectedOrder?.id.slice(-8)}
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
                      <span className="text-white font-bold">${selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Platform Share (30%):</span>
                      <span className="text-cyan-400 font-bold">${calculatePlatformShare(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maker Payout (70%):</span>
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
                            {item.product_id && (
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
                              <p className="text-white">${item.unit_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Total:</span>
                              <p className="text-white font-bold">${item.total_price.toFixed(2)}</p>
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
