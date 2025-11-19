import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Palette, DollarSign, TrendingUp, Package, Star, Calendar, Plus, X } from "lucide-react";
import { createPageUrl } from "@/utils";
import BankInfoManager from "../components/shared/BankInfoManager";
import DesignerProductForm from "../components/designers/DesignerProductForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DesignerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myProducts, setMyProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalEarnings: 0,
    activeProducts: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();

      if (!currentUser.designer_id || !currentUser.business_roles?.includes('designer')) {
        toast({
          title: "Access Denied",
          description: "You need to be approved as a designer to access this dashboard",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }

      setUser(currentUser);

      // Load designer's products
      const allProducts = await base44.entities.Product.list();
      const designerProducts = allProducts.filter(p => p.designer_id === currentUser.designer_id);
      setMyProducts(designerProducts);

      // Load all completed orders to calculate earnings
      const allOrders = await base44.entities.Order.list();
      const completedOrders = allOrders.filter(o =>
        ['completed', 'delivered', 'dropped_off'].includes(o.status) && o.payment_status === 'paid'
      );

      // Calculate earnings (10% of each sale of designer's products)
      let totalEarnings = 0;
      let totalSales = 0;

      completedOrders.forEach(order => {
        order.items?.forEach(item => {
          if (item.designer_id === currentUser.designer_id) {
            totalEarnings += item.total_price * 0.10;
            totalSales += item.quantity;
          }
        });
      });

      setStats({
        totalProducts: designerProducts.length,
        totalSales: totalSales,
        totalEarnings: totalEarnings,
        activeProducts: designerProducts.filter(p => p.status === 'active').length
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Designer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.full_name}!</p>
          </div>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Next Payout</p>
                  <p className="font-semibold text-red-900">{getNextPayoutDate()}</p>
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
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <Palette className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeProducts}</p>
              </div>
              <Package className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSales}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600" />
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
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            My Products
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="w-4 h-4 mr-2" />
            Financial Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>My Designs</CardTitle>
                <Button onClick={() => setShowProductForm(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload New Design
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Palette className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No products yet</p>
                  <Button onClick={() => setShowProductForm(true)} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Your First Design
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myProducts.map(product => (
                    <Card key={product.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {product.images?.[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-24 h-24 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-lg">{product.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                              </div>
                              <Badge className={
                                product.status === 'active' ? 'bg-green-500' :
                                product.status === 'pending' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }>
                                {product.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                              <div>
                                <span className="text-gray-600">Price:</span>
                                <p className="font-semibold">${product.price?.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Views:</span>
                                <p className="font-semibold">{product.view_count || 0}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Sales:</span>
                                <p className="font-semibold">{product.sales_count || 0}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Your Earnings:</span>
                                <p className="font-semibold text-red-600">${((product.price * (product.sales_count || 0)) * 0.10).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your banking information for receiving payouts
              </p>
            </CardHeader>
            <CardContent>
              <BankInfoManager user={user} onUpdate={loadDashboard} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Design</DialogTitle>
          </DialogHeader>
          <DesignerProductForm
            designerId={user?.designer_id}
            designerName={user?.full_name}
            onSuccess={() => {
              setShowProductForm(false);
              loadDashboard();
            }}
            onCancel={() => setShowProductForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}