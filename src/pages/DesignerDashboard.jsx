import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, TrendingUp, Eye, ShoppingCart, PlusCircle, Loader2, Palette, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DesignerProductForm from "../components/designers/DesignerProductForm";
import BankInfoManager from "../components/shared/BankInfoManager";
import BrandingKit from "../components/makers/BrandingKit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DesignerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const { toast } = useToast();

  const tabs = [
    { value: 'products', label: 'My Designs', icon: Package },
    { value: 'financial', label: 'Financial Info', icon: DollarSign },
    { value: 'branding', label: 'Branding Kit', icon: Palette },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser.designer_id || !currentUser.business_roles?.includes('designer')) {
        toast({
          title: "Access Denied",
          description: "You need to be approved as a designer",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }

      setUser(currentUser);

      const allProducts = await base44.entities.Product.list();
      const myProducts = allProducts.filter(p => p.designer_id === currentUser.designer_id);
      setProducts(myProducts);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast({
        title: "Error loading dashboard",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleProductCreated = () => {
    setShowUploadForm(false);
    setEditingProduct(null);
    loadDashboardData();
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowUploadForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    try {
      await base44.entities.Product.delete(deletingProduct.id);
      toast({ title: "Product deleted successfully" });
      setDeletingProduct(null);
      loadDashboardData();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({ title: "Failed to delete product", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    pending: products.filter(p => p.status === 'pending').length,
    rejected: products.filter(p => p.status === 'rejected').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Designer Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.full_name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Designs</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-10 h-10 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Eye className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Declined</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="products" className="space-y-6 mt-6">
          {showUploadForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingProduct ? 'Edit Design' : 'Upload New Design'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DesignerProductForm 
                  designerId={user.designer_id}
                  designerName={user.designer_name || user.full_name}
                  existingProduct={editingProduct}
                  onSuccess={handleProductCreated}
                  onCancel={() => { setShowUploadForm(false); setEditingProduct(null); }}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowUploadForm(true)} className="bg-red-600 hover:bg-red-700">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Upload New Design
                </Button>
              </div>

              {products.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">No designs yet. Upload your first design!</p>
                    <Button onClick={() => setShowUploadForm(true)} className="bg-red-600 hover:bg-red-700">
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Upload Design
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {products.map(product => (
                    <Card key={product.id} className={`border-2 ${
                      product.status === 'rejected' ? 'border-red-300 bg-red-50' : ''
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt={product.name} className="w-24 h-24 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{product.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                                {product.status === 'rejected' && product.admin_feedback && (
                                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                                    <p className="text-sm font-semibold text-red-800">Declined Reason:</p>
                                    <p className="text-sm text-red-700 mt-1">{product.admin_feedback}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  product.status === 'active' ? 'bg-green-500' :
                                  product.status === 'pending' ? 'bg-yellow-500' :
                                  product.status === 'rejected' ? 'bg-red-500' :
                                  'bg-red-500'
                                }>
                                  {product.status === 'rejected' ? 'Declined' : product.status}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  {product.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeletingProduct(product)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {product.status !== 'rejected' && (
                              <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Views</p>
                                    <p className="font-bold">{product.view_count || 0}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ShoppingCart className="w-4 h-4 text-green-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Sales</p>
                                    <p className="font-bold">{product.sales_count || 0}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-teal-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Earned</p>
                                    <p className="font-bold">${((product.sales_count || 0) * product.price * 0.10).toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="financial">
          <BankInfoManager userId={user.id} userRole="designer" />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingKit userRole="designer" />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}