import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Package, DollarSign, Clock, CheckCircle,
  Printer, Settings, FileText, TrendingUp, AlertCircle,
  Download, Mail, Plus, Calendar, Star, MapPin
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
  { value: "erau_daytona", label: "ERAU Daytona" },
  { value: "arizona_state", label: "Arizona State University" },
];
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddPrinterForm from "../components/makers/AddPrinterForm";
import FilamentManager from "../components/makers/FilamentManager";
import BankInfoManager from "../components/shared/BankInfoManager";
import MakerExpRedeemTab from "../components/makers/MakerExpRedeemTab";
import { createPageUrl } from "@/utils";
import AnnouncementBanner from "@/components/shared/AnnouncementBanner"; // Added import

export default function MakerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyHours: 0
  });
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoFormData, setInfoFormData] = useState({
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zip: '' }
  });
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();

      if (!currentUser.maker_id || !currentUser.business_roles?.includes('maker')) {
        toast({
          title: "Access Denied",
          description: "You need to be approved as a maker to access this dashboard",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }

      setUser(currentUser);

      // Load orders assigned to this maker
      const allOrders = await base44.entities.Order.list();
      const myOrders = allOrders.filter(order => {
        // Show orders where:
        // 1. I'm the assigned maker (single assignment with maker_id set)
        // 2. OR I'm in the assigned_to_makers array AND the order is still pending
        //    (once accepted by someone else, status changes and it disappears)
        const isAssignedMaker = order.maker_id === currentUser.maker_id;
        const isInMultiAssignment = order.assigned_to_makers?.includes(currentUser.maker_id) && 
                                   order.status === 'pending' && 
                                   !order.maker_id; // maker_id is null when pending multi-assignment

        return isAssignedMaker || isInMultiAssignment;
      });

      // Sort orders: priority orders first, then by created date
      const sortedOrders = myOrders.sort((a, b) => {
        // Priority orders go first
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        // Then by creation date (newest first)
        return new Date(b.created_date) - new Date(a.created_date);
      });
      
      setOrders(sortedOrders);

      // Load printers
      const allPrinters = await base44.entities.Printer.filter({
        maker_id: currentUser.maker_id
      });
      setPrinters(allPrinters);

      // Calculate stats
      const activeOrders = myOrders.filter(o => ['pending', 'accepted', 'printing'].includes(o.status)).length;
      const completedOrders = myOrders
        .filter(o => ['completed', 'dropped_off', 'delivered'].includes(o.status))
        .length;
      const totalEarnings = myOrders
        .filter(o => ['completed', 'dropped_off', 'delivered'].includes(o.status))
        .reduce((sum, o) => {
          const baseEarning = ((o.total_amount * 0.7) - 0.30);
          const priorityEarning = o.is_priority ? 2.80 : 0; // 70% of $4
          return sum + baseEarning + priorityEarning;
        }, 0);

      // Calculate monthly earnings (orders completed this month)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyEarnings = myOrders
        .filter(o => {
          if (!['completed', 'dropped_off', 'delivered'].includes(o.status)) return false;
          const orderDate = new Date(o.updated_date || o.created_date);
          return orderDate >= firstDayOfMonth;
        })
        .reduce((sum, o) => {
          const baseEarning = ((o.total_amount * 0.7) - 0.30);
          const priorityEarning = o.is_priority ? 2.80 : 0;
          return sum + baseEarning + priorityEarning;
        }, 0);

      setStats({
        activeOrders,
        completedOrders,
        totalEarnings,
        monthlyEarnings,
        weeklyHours: currentUser.hours_printed_this_week || 0
      });

      // Initialize info form data
      setInfoFormData({
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || { street: '', city: '', state: '', zip: '' }
      });

    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast({
        title: "Failed to load dashboard data",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const getNextPayoutDate = () => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDayOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAcceptOrder = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, {
        status: 'accepted',
        maker_id: user.maker_id // Assign single maker on accept
      });

      toast({ title: "Order accepted successfully!" });
      await loadDashboard();
    } catch (error) {
      toast({
        title: "Failed to accept order",
        description: error.message,
        variant: "destructive"
      });
    }
    setUpdatingOrder(null);
  };

  const handleMarkPrinting = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, { status: 'printing' });

      toast({ title: "Order marked as printing" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleMarkCompleted = async (orderId) => {
    if (!confirm("Is this order ready for pickup? Please contact Jacob at labaghr@my.erau.edu or 610-858-3200 for drop-off arrangements.")) {
      return;
    }

    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, {
        status: 'completed'
      });

      toast({
        title: "Order marked as completed!",
        description: "Please contact Jacob at labaghr@my.erau.edu or 610-858-3200 for drop-off."
      });
      await loadDashboard();
    } catch (error) {
      console.error("Failed to mark completed:", error);
      toast({
        title: "Failed to complete order",
        description: error.message,
        variant: "destructive"
      });
    }
    setUpdatingOrder(null);
  };

  const handleMarkDroppedOff = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, {
        status: 'dropped_off',
        dropped_off_at: new Date().toISOString()
      });

      // Send pickup notification to customer
      const order = orders.find(o => o.id === orderId);
      if (order) {
        try {
          const customer = await base44.entities.User.get(order.customer_id);

          await base44.functions.invoke('sendEmail', {
            to: customer.email,
            subject: 'Your Order is Ready for Pickup! 📦 - EX3D Prints',
            body: `Hi ${customer.full_name},

Great news! Your order #${orderId.slice(-8)} is ready for pickup!

📦 Pickup Location: ${order.pickup_location}

Order Details:
${order.items.map(item => `- ${item.product_name} (x${item.quantity})`).join('\n')}

Total: $${order.total_amount.toFixed(2)}

Please contact us to arrange pickup.

Need help? Reply to this email or contact us at labaghr@my.erau.edu or 610-858-3200

Thank you for choosing EX3D Prints!

Best regards,
The EX3D Team`
          });
        } catch (emailError) {
          console.error('Failed to send pickup email:', emailError);
        }
      }

      toast({ title: "Order marked as dropped off and customer notified!" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleRejectOrder = async (orderId) => {
    const reason = prompt("Please provide a reason for rejecting this order:");
    if (!reason) return;

    setUpdatingOrder(orderId);
    try {
      const order = orders.find(o => o.id === orderId);

      // Increment rejection count for all products in the order
      for (const item of order.items) {
        try {
          const product = await base44.entities.Product.get(item.product_id);
          await base44.entities.Product.update(item.product_id, {
            rejection_count: (product.rejection_count || 0) + 1
          });
        } catch (error) {
          console.error(`Failed to update rejection count for product ${item.product_id}:`, error);
        }
      }

      // Update order status
      await base44.entities.Order.update(orderId, {
        status: 'unassigned',
        maker_id: null,
        cancellation_reason: reason
      });

      // Try to reassign to other makers
      try {
        await base44.functions.invoke('assignOrderToMaker', { orderId: orderId });
      } catch (reassignError) {
        console.error("Failed to reassign order:", reassignError);
      }

      toast({ title: "Order rejected and reassigned" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "Failed to reject order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      toast({ title: "Downloading file..." });

      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || fileUrl.split('/').pop();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({ title: "Download started!" });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Failed to download file",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-900',
      accepted: 'bg-blue-100 text-blue-900',
      printing: 'bg-purple-100 text-purple-900',
      completed: 'bg-green-100 text-green-900',
      dropped_off: 'bg-teal-100 text-teal-900',
      delivered: 'bg-emerald-100 text-emerald-900',
      cancelled: 'bg-red-100 text-red-900',
      unassigned: 'bg-gray-100 text-gray-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-900';
  };

  const getOrderCardHeaderClass = (status, isPriority) => {
    if (status === 'cancelled') return 'bg-red-100 border-b-2 border-red-500';
    if (isPriority) return 'bg-gradient-to-r from-yellow-200 to-amber-200 border-b-2 border-amber-500';
    return 'bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnnouncementBanner userRole="maker" userId={user?.id} />
      
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Maker Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.full_name}!</p>
          </div>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Next Payout</p>
                  <p className="font-semibold text-blue-900">{getNextPayoutDate()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeOrders}</p>
              </div>
              <Package className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Earnings</p>
                <p className="text-3xl font-bold text-gray-900">${stats.monthlyEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="setup">
            <Printer className="w-4 h-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="exp">
            <Star className="w-4 h-4 mr-2" />
            Redeem EXP
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No orders yet. Check back soon!</p>
                </CardContent>
              </Card>
            ) : (
              orders.map(order => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className={getOrderCardHeaderClass(order.status, order.is_priority)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            Order #{order.id.slice(-8)}
                            {order.status === 'cancelled' && (
                              <span className="text-red-600 text-sm font-normal">❌ CANCELLED</span>
                            )}
                          </CardTitle>
                          {order.is_priority && order.status !== 'cancelled' && (
                            <div className="mt-2 p-2 bg-amber-500 text-white rounded-md">
                              <p className="text-sm font-bold">⚡ PRIORITY OVERNIGHT DELIVERY</p>
                              <p className="text-xs">This order MUST be completed by next day for overnight delivery.</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusBadgeColor(order.status)}>
                          {order.status}
                        </Badge>
                        {order.is_priority && (
                          <Badge className="bg-orange-500">⚡ Priority</Badge>
                        )}
                        {order.status !== 'cancelled' && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Your Earnings:</p>
                            <p className="text-xl font-bold text-green-600">
                              ${(((order.total_amount * 0.7) - 0.30) + (order.is_priority ? 2.80 : 0)).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {order.status === 'cancelled' && (
                          <div className="text-right">
                            <p className="text-sm text-red-600">Lost Earnings:</p>
                            <p className="text-xl font-bold text-red-600 line-through">
                              ${(((order.total_amount * 0.7) - 0.30) + (order.is_priority ? 2.80 : 0)).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {order.status === 'cancelled' && order.cancellation_reason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-semibold text-red-900">Cancellation Reason:</p>
                        <p className="text-sm text-red-800 mt-1">{order.cancellation_reason}</p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="pb-4 border-b last:border-b-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">{item.product_name}</h4>
                                {item.custom_request_id ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    Custom Order
                                  </Badge>
                                ) : item.product_id && (
                                  <a
                                    href={`${createPageUrl("ProductDetail")}?id=${item.product_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-teal-600 hover:underline"
                                  >
                                    View Listing →
                                  </a>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Material:</span> {item.selected_material}
                                </div>
                                <div>
                                  <span className="font-medium">Quantity:</span> {item.quantity}
                                </div>

                                {item.multi_color && item.multi_color_selections ? (
                                  <div className="col-span-2">
                                    <span className="font-medium">Colors (in order):</span>
                                    <div className="flex gap-2 mt-1">
                                      {item.multi_color_selections.map((color, i) => (
                                        <Badge key={i} variant="outline" className="bg-purple-50">
                                          {i + 1}. {color}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-medium">Color:</span> {item.selected_color}
                                  </div>
                                )}

                                {item.dimensions && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Print Size:</span> {item.dimensions.length}mm × {item.dimensions.width}mm × {item.dimensions.height}mm
                                  </div>
                                )}

                                {item.print_time_hours && (
                                  <div>
                                    <span className="font-medium">Est. Print Time:</span> {item.print_time_hours}h
                                  </div>
                                )}

                                {item.weight_grams && (
                                  <div>
                                    <span className="font-medium">Weight:</span> {item.weight_grams}g
                                  </div>
                                )}

                                {item.print_file_scale && item.print_file_scale !== 100 && (
                                  <div className="col-span-2">
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-900">
                                      Scale: {item.print_file_scale}%
                                    </Badge>
                                  </div>
                                )}
                                
                                {item.description && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Description:</span> {item.description}
                                  </div>
                                )}
                                
                                {item.custom_request_id && order.customer_username && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Deliver To:</span> <Badge variant="outline" className="bg-teal-50 text-teal-700">@{order.customer_username}</Badge>
                                  </div>
                                )}
                              </div>

                              {item.print_files && item.print_files.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Print Files:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.print_files.map((fileUrl, fileIdx) => (
                                      <Button
                                        key={fileIdx}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDownloadFile(fileUrl, `${item.product_name}_file_${fileIdx + 1}.stl`)}
                                        className="text-xs"
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        File {fileIdx + 1}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-lg">${item.total_price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center pt-4 border-t">
                        <div>
                          <p className="font-semibold">
                            Total: ${order.total_amount.toFixed(2)}
                            {order.is_priority && <Badge className="ml-2 bg-orange-500">⚡ Priority +$4</Badge>}
                          </p>
                          <p className="text-sm text-green-600">
                            {/* "Your earnings:" removed as it's now in the header for primary visibility */}
                            Earnings calculation: (70% - $0.30 Stripe fee{order.is_priority ? ' + $2.80 priority bonus' : ''})
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Pickup: {order.pickup_location}
                          </p>
                          {order.is_priority && (
                            <p className="text-sm text-orange-600 font-semibold mt-1">
                              ⚡ PRIORITY: Must be completed by next day!
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptOrder(order.id)}
                                disabled={updatingOrder === order.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {updatingOrder === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Accept'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={updatingOrder === order.id}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {order.status === 'accepted' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPrinting(order.id)}
                              disabled={updatingOrder === order.id}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Start Printing
                            </Button>
                          )}

                          {order.status === 'printing' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkCompleted(order.id)}
                              disabled={updatingOrder === order.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {updatingOrder === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Mark Completed'
                                )}
                            </Button>
                          )}

                          {order.status === 'completed' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleMarkDroppedOff(order.id)}
                                disabled={updatingOrder === order.id}
                                className="bg-teal-600 hover:bg-teal-700"
                              >
                                {updatingOrder === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Confirm Drop-off'
                                )}
                              </Button>
                              <div className="text-sm text-orange-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Contact Jacob for drop-off
                              </div>
                            </>
                          )}

                          {order.status === 'dropped_off' && (
                            <div className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Awaiting customer pickup
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="setup">
          <div className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={showPrinterDialog} onOpenChange={setShowPrinterDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingPrinter(null); setShowPrinterDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Printer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPrinter ? 'Edit Printer' : 'Add New Printer'}</DialogTitle>
                    <DialogDescription>
                      {editingPrinter ? 'Update your printer information' : 'Register a new 3D printer to your maker account'}
                    </DialogDescription>
                  </DialogHeader>
                  <AddPrinterForm
                    printer={editingPrinter}
                    onClose={() => {
                      setShowPrinterDialog(false);
                      setEditingPrinter(null);
                    }}
                    onSuccess={() => {
                      setShowPrinterDialog(false);
                      setEditingPrinter(null);
                      loadDashboard();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {printers.map(printer => (
                <Card key={printer.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setEditingPrinter(printer);
                    setShowPrinterDialog(true);
                  }}>
                  <CardHeader>
                    <CardTitle className="text-lg">{printer.name || `${printer.brand} ${printer.model}`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Brand:</span>
                        <span className="font-medium">{printer.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">{printer.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={
                          printer.status === 'active' ? 'bg-green-100 text-green-900' :
                            printer.status === 'printing' ? 'bg-blue-100 text-blue-900' :
                              printer.status === 'maintenance' ? 'bg-yellow-100 text-yellow-900' :
                                'bg-gray-100 text-gray-900'
                        }>
                          {printer.status}
                        </Badge>
                      </div>
                      {printer.multi_color_capable && (
                        <div className="pt-2 border-t">
                          <span className="text-sm text-purple-600 font-medium">
                            ✨ Multi-color capable
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {printers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Printer className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No printers registered yet</p>
                  <Button onClick={() => setShowPrinterDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Printer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Filament Manager Section */}
            <div className="mt-8">
              <FilamentManager makerId={user?.maker_id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exp">
          <MakerExpRedeemTab user={user} onUpdate={loadDashboard} />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your banking information for receiving payouts and making payments
                </p>
              </CardHeader>
              <CardContent>
                <BankInfoManager user={user} onUpdate={loadDashboard} />
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contact Information</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Your email, phone, and address
                    </p>
                  </div>
                  {!editingInfo && (
                    <Button variant="outline" onClick={() => setEditingInfo(true)}>
                      Change Information
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editingInfo ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{user?.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">
                        {user?.address ? (
                          <>
                            {user.address.street}<br />
                            {user.address.city}, {user.address.state} {user.address.zip}
                          </>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={infoFormData.email}
                        onChange={(e) => setInfoFormData({...infoFormData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={infoFormData.phone}
                        onChange={(e) => setInfoFormData({...infoFormData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={infoFormData.address.street}
                        onChange={(e) => setInfoFormData({...infoFormData, address: {...infoFormData.address, street: e.target.value}})}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={infoFormData.address.city}
                          onChange={(e) => setInfoFormData({...infoFormData, address: {...infoFormData.address, city: e.target.value}})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={infoFormData.address.state}
                          onChange={(e) => setInfoFormData({...infoFormData, address: {...infoFormData.address, state: e.target.value}})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={infoFormData.address.zip}
                        onChange={(e) => setInfoFormData({...infoFormData, address: {...infoFormData.address, zip: e.target.value}})}
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingInfo(false);
                          setInfoFormData({
                            email: user?.email || '',
                            phone: user?.phone || '',
                            address: user?.address || { street: '', city: '', state: '', zip: '' }
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await base44.auth.updateMe({
                              email: infoFormData.email,
                              phone: infoFormData.phone,
                              address: infoFormData.address
                            });
                            toast({ title: "Contact information updated!" });
                            setEditingInfo(false);
                            await loadDashboard();
                          } catch (error) {
                            toast({ title: "Failed to update information", variant: "destructive" });
                          }
                        }}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vacation Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Vacation Mode</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  When enabled, you won't receive new order assignments. Existing orders remain active.
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  variant={user?.vacation_mode ? "destructive" : "default"}
                  onClick={async () => {
                    try {
                      await base44.auth.updateMe({ vacation_mode: !user?.vacation_mode });
                      toast({
                        title: user?.vacation_mode ? "Vacation mode disabled" : "Vacation mode enabled",
                        description: user?.vacation_mode ? "You will now receive order assignments" : "You won't receive new orders while on vacation"
                      });
                      await loadDashboard();
                    } catch (error) {
                      toast({
                        title: "Failed to update vacation mode",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  {user?.vacation_mode ? "Disable Vacation Mode" : "Enable Vacation Mode"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}