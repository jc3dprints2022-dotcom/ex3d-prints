import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Package, Loader2, Search, Users, DollarSign, Printer, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CampusOrderRoutingSection({ campusLocation }) {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [makers, setMakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reassigning, setReassigning] = useState(false);
  const [selectedMakerId, setSelectedMakerId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [campusLocation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, usersData] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list()
      ]);
      
      // Filter orders for this campus
      const campusOrders = ordersData.filter(o => (o.campus_location || 'erau_prescott') === campusLocation);
      setOrders(campusOrders.sort((a, b) => b.created_date.localeCompare(a.created_date)));
      setUsers(usersData);
      
      // Filter makers for this campus
      const campusMakers = usersData.filter(u => 
        u.business_roles?.includes('maker') && 
        u.maker_id &&
        (u.campus_location || 'erau_prescott') === campusLocation
      );
      setMakers(campusMakers);
    } catch (error) {
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const getUserInfo = (userId) => users.find(u => u.id === userId) || { full_name: 'Unknown', email: 'N/A' };
  const getMakerByMakerId = (makerId) => users.find(u => u.maker_id === makerId) || { full_name: 'Unknown', email: 'N/A' };

  const handleReassignOrder = async () => {
    if (!selectedMakerId || !selectedOrder) {
      toast({ title: "Please select a maker", variant: "destructive" });
      return;
    }

    setReassigning(true);
    try {
      await base44.entities.Order.update(selectedOrder.id, {
        maker_id: selectedMakerId,
        status: 'pending'
      });

      toast({ title: "Order reassigned successfully" });
      setSelectedOrder(null);
      setSelectedMakerId("");
      loadData();
    } catch (error) {
      toast({ title: "Failed to reassign order", variant: "destructive" });
    }
    setReassigning(false);
  };

  const filteredOrders = orders.filter(order => {
    const customer = getUserInfo(order.customer_id);
    const maker = order.maker_id ? getMakerByMakerId(order.maker_id) : null;
    
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (maker && maker.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-yellow-900';
      case 'accepted': return 'bg-blue-500 text-blue-900';
      case 'printing': return 'bg-purple-500 text-purple-900';
      case 'completed': return 'bg-green-500 text-green-900';
      case 'dropped_off': return 'bg-teal-500 text-teal-900';
      case 'delivered': return 'bg-emerald-500 text-emerald-900';
      case 'cancelled': return 'bg-red-500 text-red-900';
      default: return 'bg-gray-500 text-gray-900';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                    
                    return (
                      <TableRow key={order.id} className="border-slate-700">
                        <TableCell className="text-white font-mono text-xs">
                          #{order.id.slice(-8)}
                          {order.is_priority && <Badge className="ml-2 bg-orange-500">⚡</Badge>}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          <div>
                            <p className="font-medium">{customer.full_name}</p>
                            <p className="text-xs text-slate-400">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {order.items?.length || 0} item(s)
                        </TableCell>
                        <TableCell className="text-white font-semibold">${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {maker ? maker.full_name : <Badge className="bg-yellow-500">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {new Date(order.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)} className="bg-slate-700 text-white">
                            <FileText className="w-4 h-4 mr-1" /> Details
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

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Order #{selectedOrder?.id.slice(-8)}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(() => {
                      const customer = getUserInfo(selectedOrder.customer_id);
                      return (
                        <>
                          <p className="text-white font-medium">{customer.full_name}</p>
                          <p className="text-slate-400">{customer.email}</p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total:</span>
                      <span className="text-white font-bold">${selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Platform (50%):</span>
                      <span className="text-cyan-400">${(selectedOrder.total_amount * 0.50).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maker (50%):</span>
                      <span className="text-green-400">${(selectedOrder.total_amount * 0.50).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="bg-slate-800 p-4 rounded-lg">
                      <p className="text-white font-semibold">{item.product_name}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div><span className="text-slate-400">Material:</span> {item.selected_material}</div>
                        <div><span className="text-slate-400">Color:</span> {item.selected_color}</div>
                        <div><span className="text-slate-400">Quantity:</span> {item.quantity}</div>
                        <div><span className="text-slate-400">Price:</span> ${item.total_price.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Reassign Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOrder.maker_id && (
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30">
                      <p className="text-sm text-blue-300">
                        <strong>Currently:</strong> {getMakerByMakerId(selectedOrder.maker_id)?.full_name}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-white">Select New Maker</Label>
                    <Select value={selectedMakerId} onValueChange={setSelectedMakerId}>
                      <SelectTrigger className="bg-slate-900 border-cyan-500/30 text-white">
                        <SelectValue placeholder="Choose a maker..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800">
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
                    {reassigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Reassign Order
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