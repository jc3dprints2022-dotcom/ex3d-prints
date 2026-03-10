import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Package, DollarSign, Clock, CheckCircle,
  Printer, Settings, FileText, TrendingUp, AlertCircle,
  Download, Mail, Plus, Calendar, Star, MapPin
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddPrinterForm from "../makers/AddPrinterForm";
import FilamentManager from "../makers/FilamentManager";
import BankInfoManager from "../shared/BankInfoManager";
import MakerExpRedeemTab from "../makers/MakerExpRedeemTab";
import { createPageUrl } from "@/utils";
import AnnouncementBanner from "../shared/AnnouncementBanner";

export default function MakerDashboardContent({ user: propUser, onUpdate }) {
  const [user, setUser] = useState(propUser);
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
      const currentUser = propUser || await base44.auth.me();
      setUser(currentUser);

      const allOrders = await base44.entities.Order.list();
      const myOrders = allOrders.filter(order => {
        const isAssignedMaker = order.maker_id === currentUser.maker_id;
        const isInMultiAssignment = order.assigned_to_makers?.includes(currentUser.maker_id) && 
                                   ['pending', 'unassigned'].includes(order.status) && 
                                   !order.maker_id;
        return isAssignedMaker || isInMultiAssignment;
      });

      const sortedOrders = myOrders.sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      
      setOrders(sortedOrders);

      const allPrinters = await base44.entities.Printer.filter({
        maker_id: currentUser.maker_id
      });
      setPrinters(allPrinters);

      const activeOrders = myOrders.filter(o => ['pending', 'accepted', 'printing'].includes(o.status)).length;
      const completedOrders = myOrders.filter(o => ['completed', 'dropped_off', 'delivered'].includes(o.status)).length;
      const totalEarnings = myOrders
        .filter(o => ['completed', 'dropped_off', 'delivered'].includes(o.status))
        .reduce((sum, o) => {
          const baseEarning = ((o.total_amount * 0.7) - 0.30);
          const priorityEarning = o.is_priority ? 2.80 : 0;
          return sum + baseEarning + priorityEarning;
        }, 0);

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
        maker_id: user.maker_id
      });
      toast({ title: "Order accepted successfully!" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "Failed to accept order", description: error.message, variant: "destructive" });
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
    if (!confirm("Mark this order as completed? A USPS shipping label will be generated automatically if the customer provided a shipping address.")) {
      return;
    }
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, { status: 'completed' });

      const order = orders.find(o => o.id === orderId);

      // Auto-generate shipping label if order has a shipping address
      if (order && !order.is_local_delivery && order.shipping_address?.street) {
        try {
          const res = await base44.functions.invoke('generateShippingLabel', { orderId });
          const data = res.data;
          if (data?.success && data?.tracking_number) {
            toast({
              title: "✅ Order completed! Shipping label generated.",
              description: `Tracking: ${data.tracking_number}`
            });
          } else if (data?.is_local_delivery) {
            toast({ title: "Order completed!", description: "Local delivery — no label needed." });
          } else {
            toast({
              title: "Order completed",
              description: data?.error || "Label generation failed. Please generate manually if needed."
            });
          }
        } catch (labelErr) {
          console.error('Auto label generation failed:', labelErr);
          toast({
            title: "Order marked as completed",
            description: "Auto shipping label generation failed — USPS may not be configured yet."
          });
        }
      } else {
        toast({
          title: "Order marked as completed!",
          description: order?.is_local_delivery
            ? "Local delivery — no shipping label needed."
            : "Please contact Jacob at labaghr@my.erau.edu or 610-858-3200 for drop-off."
        });
      }

      await loadDashboard();
    } catch (error) {
      toast({ title: "Failed to complete order", description: error.message, variant: "destructive" });
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

      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Send pickup notification to customer
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

        // Automatically transfer payment to maker if Stripe Connect is set up
        if (user?.stripe_connect_account_id && user?.stripe_connect_onboarding_complete) {
          try {
            await base44.functions.invoke('createStripeTransferToMaker', { orderId });
            console.log('✅ Automatic payment transfer initiated');
          } catch (transferError) {
            console.error('⚠️ Failed to auto-transfer payment:', transferError);
            // Don't show error to user - admin will handle manually
          }
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

      await base44.entities.Order.update(orderId, {
        status: 'unassigned',
        maker_id: null,
        cancellation_reason: reason
      });

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
      // Force STL MIME type so browser doesn't flag it as unknown/suspicious
      const stlBlob = new Blob([blob], { type: 'model/stl' });
      const url = window.URL.createObjectURL(stlBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || fileUrl.split('/').pop().replace(/[^a-z0-9._-]/gi, '_');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { window.URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast({ title: "Download started!" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Failed to download file", description: "Please try again", variant: "destructive" });
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
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnnouncementBanner userRole="maker" userId={user?.id} />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maker Hub</h2>
          <p className="text-gray-600">Manage your printing orders and equipment</p>
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



      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="pb-4 border-b last:border-b-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.product_name}</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 mt-2">
                                <div><span className="font-medium">Material:</span> {item.selected_material}</div>
                                <div><span className="font-medium">Quantity:</span> {item.quantity}</div>
                                <div><span className="font-medium">Color:</span> {item.selected_color}</div>
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
                          <p className="font-semibold">Total: ${order.total_amount.toFixed(2)}</p>
                          {order.tracking_number && (
                            <p className="text-xs text-blue-600 mt-1 font-mono">📦 {order.tracking_number}</p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {order.shipping_label_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(order.shipping_label_url, '_blank')}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Label
                            </Button>
                          )}
                          {order.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => handleAcceptOrder(order.id)} disabled={updatingOrder === order.id} className="bg-green-600 hover:bg-green-700">
                                {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectOrder(order.id)} disabled={updatingOrder === order.id}>
                                Reject
                              </Button>
                            </>
                          )}

                          {order.status === 'accepted' && (
                            <Button size="sm" onClick={() => handleMarkPrinting(order.id)} disabled={updatingOrder === order.id} className="bg-purple-600 hover:bg-purple-700">
                              Start Printing
                            </Button>
                          )}

                          {order.status === 'printing' && (
                            <Button size="sm" onClick={() => handleMarkCompleted(order.id)} disabled={updatingOrder === order.id} className="bg-green-600 hover:bg-green-700">
                              {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Completed'}
                            </Button>
                          )}

                          {order.status === 'completed' && (
                            <Button size="sm" onClick={() => handleMarkDroppedOff(order.id)} disabled={updatingOrder === order.id} className="bg-teal-600 hover:bg-teal-700">
                              {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Drop-off'}
                            </Button>
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
            <Card>
              <CardHeader>
                <CardTitle>Payment Account</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Connect your Stripe account to receive payments automatically when orders are completed
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.stripe_connect_account_id && user?.stripe_connect_onboarding_complete ? (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-green-900">Payment Account Connected</p>
                    </div>
                    <p className="text-sm text-green-700">
                      Your Stripe account is connected. You'll automatically receive payments when orders are completed.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Payments are transferred within 2-3 business days after order completion.
                    </p>
                  </div>
                ) : user?.stripe_connect_account_id ? (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <p className="font-semibold text-yellow-900">Onboarding Incomplete</p>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      Complete your Stripe onboarding to start receiving automatic payments.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const { data } = await base44.functions.invoke('createStripeConnectOnboarding');
                          if (data.onboarding_url) {
                            window.location.href = data.onboarding_url;
                          }
                        } catch (error) {
                          toast({ title: "Failed to start onboarding", variant: "destructive" });
                        }
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Complete Setup
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900 font-medium mb-2">🚀 Get Paid Automatically</p>
                      <p className="text-sm text-blue-700">
                        Connect your Stripe account to receive payments automatically when you complete orders. Funds are typically available in 2-3 business days.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          const { data } = await base44.functions.invoke('createStripeConnectOnboarding');
                          if (data.onboarding_url) {
                            window.location.href = data.onboarding_url;
                          }
                        } catch (error) {
                          toast({ title: "Failed to start onboarding", variant: "destructive" });
                        }
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      Connect Stripe Account
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Powered by Stripe Connect - Secure and trusted by millions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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
                      if (onUpdate) onUpdate();
                    } catch (error) {
                      toast({ title: "Failed to update vacation mode", variant: "destructive" });
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