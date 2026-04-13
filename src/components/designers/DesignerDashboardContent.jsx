import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, TrendingUp, Eye, ShoppingCart, PlusCircle, Loader2, Pencil, Trash2, Settings } from "lucide-react";
import DesignerProductForm from "./DesignerProductForm";
import DesignerSettingsTab from "./DesignerSettingsTab";
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

export default function DesignerDashboardContent({ user, onUpdate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.list();
      const myProducts = allProducts.filter(p => p.designer_id === user?.designer_id);
      setProducts(myProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
    setLoading(false);
  };

  const handleProductCreated = () => {
    setShowUploadForm(false);
    setEditingProduct(null);
    loadProducts();
    if (onUpdate) onUpdate();
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
      loadProducts();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({ title: "Failed to delete product", variant: "destructive" });
    }
  };

  const totalOrders = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + ((p.sales_count || 0) * p.price * 0.10), 0);

  const stats = {
    total: products.length,
    orders: totalOrders,
    totalRevenue: totalRevenue,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Designer Hub</h2>

      <Tabs defaultValue="designs">
        <TabsList>
          <TabsTrigger value="designs">
            <Package className="w-4 h-4 mr-2" />
            My Designs
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <DesignerSettingsTab user={user} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="designs" className="mt-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Designs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-green-600">{stats.orders}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-teal-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? 'Edit Design' : 'Upload New Design'}</CardTitle>
          </CardHeader>
          <CardContent>
            <DesignerProductForm 
              designerId={user?.designer_id}
              designerName={user?.designer_name || user?.full_name}
              existingProduct={editingProduct}
              onSuccess={handleProductCreated}
              onCancel={() => { setShowUploadForm(false); setEditingProduct(null); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {!showUploadForm && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowUploadForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="w-5 h-5 mr-2" />
              Upload New Design
            </Button>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No designs yet. Upload your first design!</p>
                <Button onClick={() => setShowUploadForm(true)} className="bg-blue-600 hover:bg-blue-700">
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
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-full md:w-24 h-24 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg truncate">{product.name}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                            {product.status === 'rejected' && product.admin_feedback && (
                              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                                <p className="text-sm font-semibold text-red-800">Declined Reason:</p>
                                <p className="text-sm text-red-700 mt-1">{product.admin_feedback}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-row md:flex-col gap-2">
                            <Badge className={
                              product.status === 'active' ? 'bg-green-500' :
                              product.status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }>
                              {product.status === 'rejected' ? 'Declined' : product.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="flex-1 md:flex-none"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
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