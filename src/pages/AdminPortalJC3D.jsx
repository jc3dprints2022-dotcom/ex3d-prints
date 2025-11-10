
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Users, Package, DollarSign, FileText, Eye, Ban, MessageSquare, Loader2, Search, CheckCircle, FolderOpen, Briefcase, Truck, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import UserDetailModal from "@/components/admin/UserDetailModal";
import AdminDesignReviewModal from "@/components/admin/AdminDesignReviewModal";
import ContactMessageItem from "@/components/admin/ContactMessageItem";
import ApplicationDetailModal from "@/components/admin/ApplicationDetailModal";
import CustomRequestDetailModal from "@/components/admin/CustomRequestDetailModal";
import FinancialsTab from "@/components/admin/FinancialsTab";

export default function AdminPortalEX3D() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalOrders: 0, 
    totalRevenue: 0, 
    pendingDesigns: 0, 
    customRequests: 0, 
    contactMessages: 0, 
    pendingApplications: 0,
    shippingKitOrders: 0,
    shippingKitRevenue: 0
  });
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [makerApps, setMakerApps] = useState([]);
  const [designerApps, setDesignerApps] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [shippingKitOrders, setShippingKitOrders] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [denyingProduct, setDenyingProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);
  const [viewingCustomRequest, setViewingCustomRequest] = useState(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  const loadAdminData = useCallback(async () => {
    try {
      const [
        allUsers, 
        allOrders, 
        allProducts, 
        allCustomRequests, 
        allContactMessages, 
        allAuditLogs, 
        allMakerApps, 
        allDesignerApps, 
        allSubscriptions,
        allShippingKits
      ] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Order.list('-created_date'),
        base44.entities.Product.list('-created_date'),
        base44.entities.CustomPrintRequest.list('-created_date'),
        base44.entities.ContactSubmission.list('-created_date'),
        base44.entities.AuditLog.list('-created_date', 100),
        base44.entities.MakerApplication.list('-created_date'),
        base44.entities.DesignerApplication.list('-created_date'),
        base44.entities.Subscription.list('-created_date'),
        base44.entities.ShippingKitOrder.list('-created_date')
      ]);

      setUsers(allUsers);
      setOrders(allOrders);
      setProducts(allProducts);
      setCustomRequests(allCustomRequests);
      setContactMessages(allContactMessages);
      setAuditLogs(allAuditLogs);
      setMakerApps(allMakerApps);
      setDesignerApps(allDesignerApps);
      setSubscriptions(allSubscriptions);
      setShippingKitOrders(allShippingKits);

      // Calculate shipping kit revenue
      const kitRevenue = allShippingKits.reduce((sum, kit) => sum + (kit.cost || 0), 0);

      // Calculate shipping label costs from audit logs
      const shippingLabelLogs = allAuditLogs.filter(log => log.event_type === 'shipping_label_purchase');
      const shippingLabelRevenue = shippingLabelLogs.reduce((sum, log) => sum + (log.details?.cost || 0), 0);

      setStats({
        totalUsers: allUsers.length,
        totalOrders: allOrders.length,
        totalRevenue: allOrders.filter(o => ['completed', 'delivered'].includes(o.status)).reduce((sum, o) => sum + (o.total_amount || 0), 0) + kitRevenue + shippingLabelRevenue,
        pendingDesigns: allProducts.filter(p => p.status === 'pending').length,
        customRequests: allCustomRequests.filter(r => r.status === 'pending').length,
        contactMessages: allContactMessages.filter(m => m.status === 'new').length,
        pendingApplications: allMakerApps.filter(a => a.status === 'pending').length + allDesignerApps.filter(a => a.status === 'pending').length,
        shippingKitOrders: allShippingKits.length,
        shippingKitRevenue: kitRevenue
      });
    } catch (error) {
      console.error("Failed to load admin data:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
  }, [toast]);
  
  useEffect(() => {
    const checkAdminAccess = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          return;
        }
        setUser(currentUser);
        await loadAdminData();
      } catch (error) {
        console.error("Failed to check admin access:", error);
      }
      setLoading(false);
    };
    checkAdminAccess();
  }, [loadAdminData]);

  const handleApplicationReview = async (appId, appType, isApproved) => {
    const ApplicationEntity = appType === 'maker' ? base44.entities.MakerApplication : base44.entities.DesignerApplication;
    const status = isApproved ? 'approved' : 'rejected';
    try {
        const app = await ApplicationEntity.get(appId);
        await ApplicationEntity.update(appId, { status });

        const userToUpdate = await base44.entities.User.get(app.user_id);
        
        const userUpdatePayload = {
            account_status: isApproved ? 'awaiting_payment' : 'application_rejected',
        };
        
        if (isApproved) {
            const role = appType;
            if (!userToUpdate.business_roles.includes(role)) {
                 userUpdatePayload.business_roles = [...userToUpdate.business_roles, role];
            }
            if (role === 'maker' && !userToUpdate.maker_id) {
                userUpdatePayload.maker_id = `maker_${Date.now()}`;
            }
            if (role === 'designer' && !userToUpdate.designer_id) {
                userUpdatePayload.designer_id = `designer_${Date.now()}`;
            }
        }

        await base44.entities.User.update(app.user_id, userUpdatePayload);

        toast({ title: `Application ${status}` });
        loadAdminData();
    } catch (error) {
        console.error(`Failed to review application:`, error);
        toast({ title: "Action failed", variant: "destructive" });
    }
  };
  
  const openUserDetail = (userId) => {
      const userToView = users.find(u => u.id === userId);
      setSelectedUser(userToView);
      setShowUserModal(true);
  };
  
  const updateProductStatus = async (productId, newStatus) => {
    try {
      await base44.entities.Product.update(productId, { status: newStatus });
      toast({ title: `Product ${newStatus}` });
      loadAdminData();
      setReviewingProduct(null);
    } catch (error) { toast({ title: "Failed to update product", variant: "destructive" }); }
  };
  
  const openDenyModal = (product) => {
    setDenyingProduct(product);
    setRejectionReason('');
    setRejectionFeedback('');
  };
  
  const handleDenyProduct = async () => {
    if (!denyingProduct || !rejectionReason) {
        toast({ title: "Please select a reason.", variant: "destructive" });
        return;
    }
    try {
      await base44.entities.Product.update(denyingProduct.id, { 
        status: 'rejected',
        rejection_reason: rejectionReason,
        admin_feedback: rejectionFeedback
      });
      toast({ title: "Product Rejected" });
      setDenyingProduct(null);
      setReviewingProduct(null);
      loadAdminData();
    } catch (error) { toast({ title: "Failed to reject product", variant: "destructive" }); }
  };

  const updateShippingKitStatus = async (kitId, newStatus, trackingNumber = null) => {
    try {
      const updateData = { status: newStatus };
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }
      await base44.entities.ShippingKitOrder.update(kitId, updateData);
      toast({ title: "Shipping kit status updated" });
      loadAdminData();
    } catch (error) {
      toast({ title: "Failed to update shipping kit", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Shield className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to access the admin portal.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            EX3D Admin Portal
          </h1>
          <p className="text-lg text-gray-600">Platform management and analytics</p>
        </div>

        {/* Stats Cards - Shown on All Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-6 mb-8">
          <Card><CardContent className="p-4"><Users className="w-6 h-6 text-blue-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p><p className="text-xs text-gray-600">Total Users</p></CardContent></Card>
          <Card><CardContent className="p-4"><Package className="w-6 h-6 text-purple-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.totalOrders}</p><p className="text-xs text-gray-600">Total Orders</p></CardContent></Card>
          <Card><CardContent className="p-4"><DollarSign className="w-6 h-6 text-green-500 mb-2"/><p className="text-xl font-bold text-gray-900">${stats.totalRevenue.toFixed(0)}</p><p className="text-xs text-gray-600">Revenue</p></CardContent></Card>
          <Card><CardContent className="p-4"><Eye className="w-6 h-6 text-yellow-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.pendingDesigns}</p><p className="text-xs text-gray-600">Pending Designs</p></CardContent></Card>
          <Card><CardContent className="p-4"><Briefcase className="w-6 h-6 text-indigo-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.pendingApplications}</p><p className="text-xs text-gray-600">Pending Apps</p></CardContent></Card>
          <Card><CardContent className="p-4"><FileText className="w-6 h-6 text-orange-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.customRequests}</p><p className="text-xs text-gray-600">Custom Requests</p></CardContent></Card>
          <Card><CardContent className="p-4"><MessageSquare className="w-6 h-6 text-pink-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.contactMessages}</p><p className="text-xs text-gray-600">New Messages</p></CardContent></Card>
          <Card><CardContent className="p-4"><Truck className="w-6 h-6 text-teal-500 mb-2"/><p className="text-xl font-bold text-gray-900">{stats.shippingKitOrders}</p><p className="text-xs text-gray-600">Shipping Kits</p></CardContent></Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Designs</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="custom_requests">Custom Requests</TabsTrigger>
            <TabsTrigger value="contact_messages">Messages</TabsTrigger>
            <TabsTrigger value="shipping_kits">Shipping Kits</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="text-gray-900">User Management</CardTitle><Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-4" /></CardHeader>
              <CardContent><div className="space-y-3">{users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user.full_name}</p><p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex gap-2 mt-2">{user.business_roles?.map(role => (<Badge key={role} variant="outline" className="capitalize">{role}</Badge>))}{user.role === 'admin' && <Badge variant="destructive">Admin</Badge>}</div>
                    </div><Button variant="outline" size="sm" onClick={() => openUserDetail(user.id)}>View Details</Button>
                  </div>))}</div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Design Approval Queue</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">
                {products.filter(p => p.status === 'pending').map((product) => (
                    <div key={product.id} className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => setReviewingProduct(product)}>
                      <div className="flex gap-4 items-center">
                        <img src={product.images?.[0]} alt={product.name} className="w-24 h-24 object-cover rounded" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3><p className="text-sm text-gray-600 mb-2 truncate">{product.description}</p>
                          <p className="text-sm text-gray-600"><strong>Designer:</strong> {product.designer_name}</p><p className="text-sm text-gray-600"><strong>Price:</strong> ${product.price?.toFixed(2)}</p>
                        </div><Eye className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                ))}
                {products.filter(p => p.status === 'pending').length === 0 && (<p className="text-center text-gray-600 py-8">No pending designs</p>)}
              </div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Order History</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">User: {users.find(u => u.id === order.user_id)?.full_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Total: ${order.total_amount?.toFixed(2)}</p>
                    </div>
                    <Badge className="capitalize">{order.status}</Badge>
                  </div>
                ))}
                {orders.length === 0 && (<p className="text-center text-gray-600 py-8">No orders found.</p>)}
              </div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-gray-900">Pending Maker Applications ({makerApps.filter(a=>a.status === 'pending').length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3">{makerApps.filter(a=>a.status === 'pending').map(app => (
                        <div key={app.id} className="p-3 border rounded-lg">
                            <p className="font-semibold text-gray-900">{app.full_name}</p><p className="text-sm text-gray-600">{app.email}</p>
                            <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline" onClick={() => setViewingApplication({app, type: 'Maker'})}>View Details</Button>
                                <Button size="sm" onClick={() => handleApplicationReview(app.id, 'maker', true)}><CheckCircle className="w-4 h-4 mr-1"/>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApplicationReview(app.id, 'maker', false)}><Ban className="w-4 h-4 mr-1"/>Reject</Button>
                            </div>
                        </div>
                    ))}</CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-gray-900">Pending Designer Applications ({designerApps.filter(a=>a.status === 'pending').length})</CardTitle></CardHeader>
                    <CardContent className="space-y-3">{designerApps.filter(a=>a.status === 'pending').map(app => (
                        <div key={app.id} className="p-3 border rounded-lg">
                            <p className="font-semibold text-gray-900">{app.designer_name}</p><p className="text-sm text-gray-600">{app.email}</p>
                            <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline" onClick={() => setViewingApplication({app, type: 'Designer'})}>View Details</Button>
                                <Button size="sm" onClick={() => handleApplicationReview(app.id, 'designer', true)}><CheckCircle className="w-4 h-4 mr-1"/>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApplicationReview(app.id, 'designer', false)}><Ban className="w-4 h-4 mr-1"/>Reject</Button>
                            </div>
                        </div>
                    ))}</CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="custom_requests" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Custom Print Requests ({customRequests.filter(r => r.status === 'pending').length} pending)</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">
                  {customRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={() => setViewingCustomRequest(request)}>
                      <div>
                        <p className="font-semibold text-gray-900">{request.title}</p>
                        <p className="text-sm text-gray-600">Customer: {users.find(u => u.id === request.customer_id)?.full_name || 'N/A'}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">{request.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="capitalize">{request.status}</Badge>
                        <Eye className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  {customRequests.length === 0 && (<p className="text-center text-gray-600 py-8">No custom print requests.</p>)}
              </div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact_messages" className="space-y-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="text-gray-900">Contact Form Messages ({contactMessages.filter(m => m.status === 'new').length} new)</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">
                  {contactMessages.map((message) => (<ContactMessageItem key={message.id} message={message} onUpdate={() => loadAdminData()} />))}
                  {contactMessages.length === 0 && (<p className="text-center text-gray-600 py-8">No contact messages</p>)}
              </div></CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipping_kits" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Shipping Kit Orders ({shippingKitOrders.length})</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Total Revenue from Kits: <span className="font-bold text-green-600">${stats.shippingKitRevenue.toFixed(2)}</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shippingKitOrders.map((kit) => {
                    const maker = users.find(u => u.id === kit.user_id);
                    return (
                      <div key={kit.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{maker?.full_name || 'Unknown Maker'}</p>
                            <p className="text-sm text-gray-600">{maker?.email}</p>
                            <p className="text-sm text-gray-600">Plan: <Badge variant="outline">{kit.subscription_plan || 'N/A'}</Badge></p>
                            <p className="text-sm text-gray-600 mt-1">Ordered: {new Date(kit.created_date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">${kit.cost.toFixed(2)}</p>
                            <Badge className={`mt-2 ${
                              kit.status === 'delivered' ? 'bg-green-100 text-green-900' :
                              kit.status === 'shipped' ? 'bg-blue-100 text-blue-900' :
                              kit.status === 'processing' ? 'bg-yellow-100 text-yellow-900' :
                              'bg-gray-100 text-gray-900'
                            }`}>
                              {kit.status}
                            </Badge>
                          </div>
                        </div>

                        {kit.shipping_address && (
                          <div className="bg-gray-50 p-3 rounded mb-3">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Ship To:</p>
                            <p className="text-sm text-gray-700">{kit.shipping_address.name}</p>
                            <p className="text-sm text-gray-700">{kit.shipping_address.street}</p>
                            <p className="text-sm text-gray-700">
                              {kit.shipping_address.city}, {kit.shipping_address.state} {kit.shipping_address.zip}
                            </p>
                          </div>
                        )}

                        {kit.tracking_number && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Tracking:</strong> {kit.tracking_number}
                          </p>
                        )}

                        <p className="text-sm text-gray-600 mb-3">
                          <strong>Kit Contents:</strong> {kit.kit_contents?.join(', ') || 'Standard Kit'}
                        </p>

                        {kit.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => updateShippingKitStatus(kit.id, 'processing')}
                            >
                              Mark as Processing
                            </Button>
                          </div>
                        )}

                        {kit.status === 'processing' && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter tracking number..."
                              className="flex-1"
                              id={`tracking-${kit.id}`}
                            />
                            <Button 
                              size="sm"
                              onClick={() => {
                                const trackingInput = document.getElementById(`tracking-${kit.id}`);
                                if (trackingInput.value) {
                                  updateShippingKitStatus(kit.id, 'shipped', trackingInput.value);
                                } else {
                                  toast({ title: "Please enter tracking number", variant: "destructive" });
                                }
                              }}
                            >
                              Mark as Shipped
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {shippingKitOrders.length === 0 && (
                    <p className="text-center text-gray-600 py-8">No shipping kit orders yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Label Purchases */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900">Shipping Label Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditLogs
                    .filter(log => log.event_type === 'shipping_label_purchase')
                    .map((log) => {
                      const maker = users.find(u => u.id === log.user_id);
                      return (
                        <div key={log.id} className="p-4 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">{maker?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600">Order: #{log.details?.orderId?.slice(-6)}</p>
                              <p className="text-sm text-gray-600">Carrier: {log.details?.carrier}</p>
                              <p className="text-sm text-gray-600">Tracking: {log.details?.trackingNumber}</p>
                              <p className="text-sm text-gray-600">Weight: {log.details?.weight} lbs</p>
                              <p className="text-sm text-gray-600">Date: {new Date(log.created_date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">${log.details?.cost?.toFixed(2)}</p>
                              <Badge variant="outline" className="mt-1">Label Revenue</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {auditLogs.filter(log => log.event_type === 'shipping_label_purchase').length === 0 && (
                    <p className="text-center text-gray-600 py-8">No shipping labels purchased yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="financials" className="space-y-6">
            <FinancialsTab 
              orders={orders} 
              users={users} 
              subscriptions={subscriptions}
              products={products}
              shippingKitOrders={shippingKitOrders}
              auditLogs={auditLogs}
            />
          </TabsContent>
          
        </Tabs>
      </div>

      <UserDetailModal user={selectedUser} isOpen={showUserModal} onClose={() => {setSelectedUser(null); setShowUserModal(false);}} onUpdate={loadAdminData} />

      <ApplicationDetailModal application={viewingApplication?.app} type={viewingApplication?.type} isOpen={!!viewingApplication} onClose={() => setViewingApplication(null)} />

      <CustomRequestDetailModal request={viewingCustomRequest} isOpen={!!viewingCustomRequest} onClose={() => setViewingCustomRequest(null)} onUpdate={loadAdminData} users={users} />

      <Dialog open={!!denyingProduct} onOpenChange={() => setDenyingProduct(null)}>
        <DialogContent><DialogHeader><DialogTitle className="text-gray-900">Deny Design: {denyingProduct?.name}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="rejection-reason" className="text-gray-900">Reason *</Label>
              <Select onValueChange={setRejectionReason} value={rejectionReason}><SelectTrigger id="rejection-reason"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate">Inappropriate Content</SelectItem><SelectItem value="violates_copyright">Violates Copyright</SelectItem>
                  <SelectItem value="unreasonable_pricing">Unreasonable Pricing</SelectItem><SelectItem value="violates_terms_of_service">Violates Terms of Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="rejection-feedback" className="text-gray-900">Feedback (optional)</Label><Textarea id="rejection-feedback" value={rejectionFeedback} onChange={(e) => setRejectionFeedback(e.target.value)} placeholder="Provide specific feedback..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDenyingProduct(null)}>Cancel</Button><Button variant="destructive" onClick={handleDenyProduct} disabled={!rejectionReason}>Confirm Denial</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AdminDesignReviewModal product={reviewingProduct} isOpen={!!reviewingProduct} onClose={() => setReviewingProduct(null)} onApprove={updateProductStatus} onDeny={openDenyModal} />
    </div>
  );
}
