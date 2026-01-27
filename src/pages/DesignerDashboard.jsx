import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, TrendingUp, Eye, ShoppingCart, PlusCircle, Loader2, Palette, Pencil, Trash2, FileText, Upload } from "lucide-react";
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
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const { toast } = useToast();

  const tabs = [
    { value: 'products', label: 'My Designs', icon: Package },
    /*{ value: 'assembly', label: 'Assembly Guides', icon: FileText },*/
    { value: 'guide', label: 'Designer Guide', icon: TrendingUp },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Designer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.full_name}!</p>
          </div>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Next Payout</p>
                  <p className="font-semibold text-blue-900">
                    {(() => {
                      const today = new Date();
                      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      return lastDayOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
          {showUploadForm && (
            <Card className="mb-6">
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
          
          {!showUploadForm && (
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

        <TabsContent value="assembly">
          <Card>
            <CardHeader>
              <CardTitle>Assembly Guides</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Upload PDF assembly guides for your designs to help customers build complex models
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload Assembly Guide</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a PDF, Word document, or image file with assembly instructions
                </p>
                <input
                  type="file"
                  id="assembly-guide-upload"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={uploadingGuide}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setUploadingGuide(true);
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      
                      // Store the guide URL in user profile
                      const currentGuides = user.assembly_guides || [];
                      await base44.auth.updateMe({
                        assembly_guides: [...currentGuides, { 
                          file_url, 
                          file_name: file.name,
                          uploaded_at: new Date().toISOString()
                        }]
                      });

                      toast({ title: "Assembly guide uploaded successfully!" });
                      await loadDashboardData();
                    } catch (error) {
                      console.error("Upload failed:", error);
                      toast({ 
                        title: "Upload failed", 
                        description: error.message,
                        variant: "destructive" 
                      });
                    } finally {
                      setUploadingGuide(false);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  onClick={() => document.getElementById('assembly-guide-upload').click()}
                  disabled={uploadingGuide}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {uploadingGuide ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>

              {user?.assembly_guides && user.assembly_guides.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Your Assembly Guides</h3>
                  {user.assembly_guides.map((guide, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium">{guide.file_name}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded {new Date(guide.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(guide.file_url, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const updatedGuides = user.assembly_guides.filter((_, i) => i !== index);
                              await base44.auth.updateMe({ assembly_guides: updatedGuides });
                              toast({ title: "Assembly guide deleted" });
                              await loadDashboardData();
                            } catch (error) {
                              toast({ title: "Delete failed", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>Designer Guide</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Essential information for uploading and managing your designs
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">📐 File Naming for "Shown Colors" Mode</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    When you enable "Use Shown Colors" for a design (perfect for multi-part models like rockets and spacecraft), 
                    you can specify exactly which color each file should be printed in. Here's how to make it easy for makers:
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold mb-2">File Naming Best Practices:</p>
                    <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                      <li><strong>Include color in filename:</strong> "Starship_Booster_White.stl" or "SLS_Core_Orange.stl"</li>
                      <li><strong>Indicate quantity if multiple:</strong> "Wing_Red_x2.stl" means print 2 copies in red</li>
                      <li><strong>Be descriptive:</strong> "Rocket_Fins_Black_x4.stl" tells makers exactly what to do</li>
                      <li><strong>Number parts:</strong> "Part1_Body_White.stl", "Part2_Nose_Red.stl", etc.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">🎨 When to Use "Shown Colors"</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-700 mb-2"><strong>Perfect for:</strong></p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                      <li>Multi-part models with specific color schemes (SpaceX Starship, NASA SLS, etc.)</li>
                      <li>Designs where colors are essential to the final look</li>
                      <li>Models that need specific color combinations to look accurate</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">✅ Design Upload Checklist</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>✓ Clear, high-quality images showing the finished print</li>
                      <li>✓ Accurate print time and weight measurements</li>
                      <li>✓ Correct dimensions (L × W × H in mm)</li>
                      <li>✓ All 3D files uploaded (.stl, .obj, or .3mf)</li>
                      <li>✓ Descriptive name and detailed description</li>
                      <li>✓ Appropriate category selected</li>
                      <li>✓ License verification (must allow commercial use)</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">💡 Tips for Success</h3>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                      <li>Test print your designs before uploading to ensure quality</li>
                      <li>Use clear, well-lit photos that show the print from multiple angles</li>
                      <li>Write detailed descriptions explaining assembly if needed</li>
                      <li>Select all compatible materials and colors to increase sales</li>
                      <li>Tag your designs appropriately for better discoverability</li>
                      <li>Respond to feedback and update designs based on user reviews</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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