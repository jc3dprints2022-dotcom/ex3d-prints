import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, Ban, Snowflake, DollarSign, Package, 
  ShoppingBag, Printer as PrinterIcon, Eye, Trash2,
  TrendingUp, Users, MousePointer, AlertTriangle,
  CheckCircle, Clock, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UserDetailModal({ user, isOpen, onClose, onUpdate }) {
  const [selectedRole, setSelectedRole] = useState('consumer');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    orders: [],
    products: [],
    printers: [],
    stats: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      loadUserData();
      // Set initial role
      const roles = user.business_roles || ['consumer'];
      setSelectedRole(roles[0]);
    }
  }, [isOpen, user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load orders (both as customer and maker)
      const customerOrders = await base44.entities.Order.filter({ customer_id: user.id });
      const makerOrders = user.maker_id ? await base44.entities.Order.filter({ maker_id: user.maker_id }) : [];
      
      // Load products if designer
      const designerProducts = user.designer_id ? await base44.entities.Product.filter({ designer_id: user.designer_id }) : [];
      
      // Load printers if maker
      const makerPrinters = user.maker_id ? await base44.entities.Printer.filter({ maker_id: user.maker_id }) : [];
      
      // Calculate stats
      const totalSpent = customerOrders
        .filter(o => ['completed', 'delivered'].includes(o.status))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      const makerEarnings = makerOrders
        .filter(o => ['completed', 'delivered'].includes(o.status))
        .reduce((sum, o) => sum + (o.total_amount * 0.7), 0);
      
      // Calculate timeframe earnings for maker
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisYear = new Date(now.getFullYear(), 0, 1);
      
      const makerEarningsThisMonth = makerOrders
        .filter(o => ['completed', 'delivered'].includes(o.status) && new Date(o.created_date) >= thisMonth)
        .reduce((sum, o) => sum + (o.total_amount * 0.7), 0);
      
      const makerEarningsLastMonth = makerOrders
        .filter(o => ['completed', 'delivered'].includes(o.status) && 
          new Date(o.created_date) >= lastMonth && new Date(o.created_date) < thisMonth)
        .reduce((sum, o) => sum + (o.total_amount * 0.7), 0);
      
      const makerEarningsThisYear = makerOrders
        .filter(o => ['completed', 'delivered'].includes(o.status) && new Date(o.created_date) >= thisYear)
        .reduce((sum, o) => sum + (o.total_amount * 0.7), 0);
      
      // Calculate designer stats
      const allOrders = await base44.entities.Order.list();
      const designerSales = {};
      const designerRevenue = {};
      
      designerProducts.forEach(product => {
        designerSales[product.id] = 0;
        designerRevenue[product.id] = 0;
      });
      
      allOrders.forEach(order => {
        if (order.items && ['completed', 'delivered'].includes(order.status)) {
          order.items.forEach(item => {
            if (designerSales[item.product_id] !== undefined) {
              designerSales[item.product_id] += item.quantity;
              designerRevenue[item.product_id] += item.total_price * 0.15; // 15% royalty
            }
          });
        }
      });
      
      const totalDesignerRevenue = Object.values(designerRevenue).reduce((a, b) => a + b, 0);

      setUserData({
        customerOrders,
        makerOrders,
        products: designerProducts,
        printers: makerPrinters,
        stats: {
          totalSpent,
          makerEarnings,
          makerEarningsThisMonth,
          makerEarningsLastMonth,
          makerEarningsThisYear,
          designerSales,
          designerRevenue,
          totalDesignerRevenue,
          affiliateStats: user.affiliate_stats || {}
        }
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      toast({ title: "Failed to load user data", variant: "destructive" });
    }
    setLoading(false);
  };

  const freezeAccount = async () => {
    if (!window.confirm(`Are you sure you want to freeze ${user.full_name}'s account?`)) return;
    
    try {
      await base44.entities.User.update(user.id, { account_status: 'frozen' });
      toast({ title: "Account frozen successfully" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to freeze account", variant: "destructive" });
    }
  };

  const deactivateAccount = async () => {
    if (!window.confirm(`Are you sure you want to DEACTIVATE ${user.full_name}'s account? This action may be irreversible.`)) return;
    
    try {
      await base44.entities.User.update(user.id, { account_status: 'deactivated' });
      toast({ title: "Account deactivated" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to deactivate account", variant: "destructive" });
    }
  };

  const reassignOrder = async (orderId, currentMakerId) => {
    const newMakerId = window.prompt("Enter new Maker ID to reassign this order:");
    if (!newMakerId || newMakerId === currentMakerId) return;
    
    try {
      await base44.entities.Order.update(orderId, { maker_id: newMakerId, status: 'pending' });
      toast({ title: "Order reassigned successfully" });
      loadUserData();
    } catch (error) {
      toast({ title: "Failed to reassign order", variant: "destructive" });
    }
  };

  const deleteDesign = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to DELETE the design "${productName}"? This action cannot be undone.`)) return;
    
    try {
      await Product.update(productId, { status: 'inactive' });
      toast({ title: "Design deleted successfully" });
      loadUserData();
    } catch (error) {
      toast({ title: "Failed to delete design", variant: "destructive" });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'printing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-teal-100 text-teal-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) return null;

  const availableRoles = user.business_roles || ['consumer'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{user.full_name}</h2>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadUserData}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Account Actions */}
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">Account Management</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={freezeAccount} className="border-orange-300 text-orange-700">
              <Snowflake className="w-4 h-4 mr-1" />
              Freeze Account
            </Button>
            <Button variant="destructive" size="sm" onClick={deactivateAccount}>
              <Ban className="w-4 h-4 mr-1" />
              Deactivate
            </Button>
          </div>
        </div>

        {/* Reports Section */}
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              User Reports & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">No reports filed against this user</p>
          </CardContent>
        </Card>

        {/* Role Selector */}
        {availableRoles.length > 1 && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">View as Role:</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Role-Specific Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {selectedRole === 'consumer' && (
              <ConsumerView 
                user={user} 
                orders={userData.customerOrders} 
                stats={userData.stats} 
                getStatusColor={getStatusColor}
              />
            )}
            
            {selectedRole === 'maker' && (
              <MakerView 
                user={user} 
                orders={userData.makerOrders} 
                printers={userData.printers}
                stats={userData.stats} 
                getStatusColor={getStatusColor}
                onReassignOrder={reassignOrder}
              />
            )}
            
            {selectedRole === 'designer' && (
              <DesignerView 
                user={user} 
                products={userData.products} 
                stats={userData.stats}
                onDeleteDesign={deleteDesign}
              />
            )}
            
            {selectedRole === 'affiliate' && (
              <AffiliateView 
                user={user} 
                stats={userData.stats}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Consumer View Component
function ConsumerView({ user, orders, stats, getStatusColor }) {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Spent</p>
                <p className="text-2xl font-bold">${stats.totalSpent?.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Orders</p>
                <p className="text-2xl font-bold">
                  {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length > 0 ? orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      Order #{order.id.slice(-8)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(order.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <p><strong>Maker:</strong> {order.maker_id || 'Unassigned'}</p>
                  <p><strong>Items:</strong> {order.items?.length || 0}</p>
                  {order.tracking_number && (
                    <p><strong>Tracking:</strong> {order.tracking_number}</p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-center text-slate-500 py-4">No orders found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Maker View Component
function MakerView({ user, orders, printers, stats, getStatusColor, onReassignOrder }) {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Active Orders</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">This Month</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.makerEarningsThisMonth?.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Last Month</p>
              <p className="text-2xl font-bold">
                ${stats.makerEarningsLastMonth?.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Total Earned</p>
              <p className="text-2xl font-bold">
                ${stats.makerEarnings?.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Current Orders</TabsTrigger>
          <TabsTrigger value="printers">Printers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3 mt-4">
          {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length > 0 ? (
            orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="text-sm">Order #{order.id.slice(-8)}</span>
                  </div>
                  <div className="flex gap-2">
                    <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onReassignOrder(order.id, user.maker_id)}
                    >
                      Reassign
                    </Button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Customer:</strong> {order.customer_id}</p>
                  <p><strong>Items:</strong> {order.items?.length || 0}</p>
                  <p><strong>Created:</strong> {new Date(order.created_date).toLocaleDateString()}</p>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-center text-slate-500 py-8">No active orders</p>
          )}
        </TabsContent>

        <TabsContent value="printers" className="space-y-3 mt-4">
          {printers.length > 0 ? printers.map((printer) => (
            <Card key={printer.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{printer.name}</h4>
                  <p className="text-sm text-slate-600">{printer.brand} {printer.model}</p>
                  <p className="text-sm text-slate-600">
                    Materials: {printer.supported_materials?.join(', ')}
                  </p>
                </div>
                <Badge variant={printer.status === 'active' ? 'default' : 'outline'}>
                  {printer.status}
                </Badge>
              </div>
            </Card>
          )) : (
            <p className="text-center text-slate-500 py-8">No printers registered</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Designer View Component
function DesignerView({ user, products, stats, onDeleteDesign }) {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Total Designs</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Total Sales</p>
              <p className="text-2xl font-bold">
                {Object.values(stats.designerSales || {}).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-slate-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalDesignerRevenue?.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Designs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.length > 0 ? products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <img 
                      src={product.images?.[0]} 
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <h4 className="font-semibold">{product.name}</h4>
                      <p className="text-sm text-slate-600">${product.price}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Sales: {stats.designerSales?.[product.id] || 0}</span>
                        <span>Revenue: ${(stats.designerRevenue?.[product.id] || 0).toFixed(2)}</span>
                        <span>Views: {product.view_count || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant={product.status === 'active' ? 'default' : 'outline'}>
                      {product.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => onDeleteDesign(product.id, product.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-center text-slate-500 py-8">No designs uploaded</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Affiliate View Component
function AffiliateView({ user, stats }) {
  const affiliateStats = stats.affiliateStats || {};
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Clicks</p>
                <p className="text-2xl font-bold">{affiliateStats.clicks || 0}</p>
              </div>
              <MousePointer className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Signups</p>
                <p className="text-2xl font-bold">{affiliateStats.signups || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Conversions</p>
                <p className="text-2xl font-bold">{affiliateStats.conversions || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Earned</p>
                <p className="text-2xl font-bold">${(affiliateStats.earnings || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Referral Code:</span>
              <span className="font-mono font-semibold">{user.referral_code || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Conversion Rate:</span>
              <span className="font-semibold">
                {affiliateStats.clicks > 0 
                  ? ((affiliateStats.conversions / affiliateStats.clicks) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Avg. Earnings per Click:</span>
              <span className="font-semibold">
                ${affiliateStats.clicks > 0 
                  ? ((affiliateStats.earnings || 0) / affiliateStats.clicks).toFixed(2) 
                  : '0.00'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
