import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, TrendingUp, Eye, ShoppingCart, PlusCircle, Loader2, Pencil, Trash2, Settings, HelpCircle } from "lucide-react";
import DesignerProductForm from "../components/designers/DesignerProductForm";
import BankInfoManager from "../components/shared/BankInfoManager";
import ExpRedeemTab from "../components/consumer/ExpRedeemTab";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoFormData, setInfoFormData] = useState({
    email: '',
    phone: '',
    designer_name: '',
    bio: '',
    profile_image: ''
  });
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const { toast } = useToast();

  const tabs = [
    { value: 'products', label: 'My Designs', icon: Package },
    { value: 'exp', label: 'Redeem EXP', icon: PlusCircle },
    { value: 'guide', label: 'Guide', icon: HelpCircle },
    { value: 'settings', label: 'Settings', icon: Settings },
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
      
      // Initialize info form data
      setInfoFormData({
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        designer_name: currentUser.designer_name || '',
        bio: currentUser.bio || '',
        profile_image: currentUser.profile_image || ''
      });
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

  // Calculate stats
  const totalOrders = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + ((p.sales_count || 0) * p.price * 0.10), 0);
  
  // Calculate monthly revenue
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = 0; // Would need order history to calculate accurately
  
  const stats = {
    total: products.length,
    orders: totalOrders,
    monthlyRevenue: monthlyRevenue,
    totalRevenue: totalRevenue,
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
                <p className="text-sm text-gray-600">Orders</p>
                <p className="text-3xl font-bold text-green-600">{stats.orders}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-teal-600">${stats.monthlyRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-600" />
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
                              <div className="flex flex-col gap-2">
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
                               {product.status === 'active' && product.boost_pending_payment && product.boost_duration_weeks && (
                                 <Button
                                   variant="default"
                                   size="sm"
                                   className="bg-yellow-600 hover:bg-yellow-700 w-full"
                                   onClick={async () => {
                                     try {
                                       const { data } = await base44.functions.invoke('createBoostCheckout', {
                                         productId: product.id,
                                         boostWeeks: product.boost_duration_weeks
                                       });
                                       if (data.url) {
                                         window.location.href = data.url;
                                       }
                                     } catch (error) {
                                       toast({ title: 'Failed to create checkout', variant: 'destructive' });
                                     }
                                   }}
                                 >
                                   💳 Pay ${product.boost_duration_weeks * 5} to Boost for {product.boost_duration_weeks}w
                                 </Button>
                               )}
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

        <TabsContent value="exp">
          <ExpRedeemTab user={user} onUpdate={loadDashboardData} />
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
                    When you enable "Use Shown Colors" (ideal for multi-part models like rockets or spacecraft), you can assign specific colors to each file. Proper naming helps makers know exactly how to print your design.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold mb-2">File Naming Best Practices:</p>
                    <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                      <li><strong>Include color in the filename:</strong> Starship_Booster_White.stl, SLS_Core_Orange.stl</li>
                      <li><strong>Indicate quantity if printing multiple:</strong> Wing_Red_x2.stl → prints 2 copies in red</li>
                      <li><strong>Be descriptive:</strong> Rocket_Fins_Black_x4.stl → clearly communicates instructions</li>
                      <li><strong>Number parts:</strong> Part1_Body_White.stl, Part2_Nose_Red.stl, etc.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">🎨 When to Use "Shown Colors"</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-700 mb-2"><strong>This mode is perfect for:</strong></p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                      <li>Multi-part models with specific color schemes (e.g., SpaceX Starship, NASA SLS)</li>
                      <li>Designs where color is essential to the final look</li>
                      <li>Models that require precise color combinations for accuracy</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">✅ Design Upload Checklist</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm font-semibold mb-2">Before uploading, make sure your design meets these standards:</p>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>✓ Clear, high-quality images showing the finished print</li>
                      <li>✓ Accurate print time and weight measurements</li>
                      <li>✓ Correct dimensions (L × W × H in mm)</li>
                      <li>✓ All 3D files included (.stl, .obj, or .3mf)</li>
                      <li>✓ Descriptive filenames and detailed descriptions</li>
                      <li>✓ Appropriate category selected</li>
                      <li>✓ License verified (must allow commercial use)</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">🚀 Boost Your Listings</h3>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm font-semibold text-purple-900 mb-2">Increase visibility for your designs by boosting them in the marketplace. Boosted listings appear at the top and get more views.</p>
                    <div className="bg-white p-3 rounded-lg border border-purple-200 mb-3">
                      <p className="text-sm font-semibold mb-2">Pricing:</p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                        <li>1 Week: $5</li>
                        <li>2 Weeks: $10</li>
                        <li>3 Weeks: $15</li>
                        <li>4 Weeks: $20</li>
                      </ul>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>How it works:</strong>
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                      <li>Check "Boost this listing" when uploading your design</li>
                      <li>After approval, pay for your boost directly from your dashboard</li>
                      <li>Your listing is boosted immediately for the selected duration</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">💡 Tips for Success</h3>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                      <li>Test print your designs to ensure quality</li>
                      <li>Use clear, well-lit photos from multiple angles</li>
                      <li>Write detailed descriptions, including assembly instructions if needed</li>
                      <li>Select all compatible materials and colors</li>
                      <li>Tag your designs for better discoverability</li>
                      <li>Respond to feedback and update designs based on user reviews</li>
                      <li>Boost your best-performing designs to maximize visibility</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Your public profile details
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
                    <p className="text-sm text-gray-600">Profile Image</p>
                    {user?.profile_image ? (
                      <img src={user.profile_image} alt="Profile" className="w-20 h-20 rounded-full object-cover mt-2" />
                    ) : (
                      <p className="font-medium">Not set</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Designer Name</p>
                    <p className="font-medium">{user?.designer_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bio</p>
                    <p className="font-medium">{user?.bio || 'Not set'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profile_image">Profile Image</Label>
                    {infoFormData.profile_image && (
                      <img src={infoFormData.profile_image} alt="Profile" className="w-20 h-20 rounded-full object-cover mt-2 mb-2" />
                    )}
                    <Input
                      id="profile_image"
                      type="file"
                      accept="image/*"
                      disabled={uploadingProfileImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setUploadingProfileImage(true);
                        try {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file });
                          setInfoFormData({...infoFormData, profile_image: file_url});
                        } catch (error) {
                          toast({ title: "Failed to upload image", variant: "destructive" });
                        }
                        setUploadingProfileImage(false);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="designer_name">Designer Name</Label>
                    <Input
                      id="designer_name"
                      value={infoFormData.designer_name}
                      onChange={(e) => setInfoFormData({...infoFormData, designer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={infoFormData.bio}
                      onChange={(e) => setInfoFormData({...infoFormData, bio: e.target.value})}
                      rows={3}
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
                          designer_name: user?.designer_name || '',
                          bio: user?.bio || '',
                          profile_image: user?.profile_image || ''
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          await base44.auth.updateMe({
                            designer_name: infoFormData.designer_name,
                            bio: infoFormData.bio,
                            profile_image: infoFormData.profile_image
                          });
                          toast({ title: "Profile information updated!" });
                          setEditingInfo(false);
                          await loadDashboardData();
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Information</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Your email and phone number
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
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingInfo(false);
                        setInfoFormData({
                          email: user?.email || '',
                          phone: user?.phone || '',
                          designer_name: user?.designer_name || '',
                          bio: user?.bio || '',
                          profile_image: user?.profile_image || ''
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
                            phone: infoFormData.phone
                          });
                          toast({ title: "Contact information updated!" });
                          setEditingInfo(false);
                          await loadDashboardData();
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

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your banking information for receiving payouts and making payments
              </p>
            </CardHeader>
            <CardContent>
              <BankInfoManager user={user} onUpdate={loadDashboardData} />
            </CardContent>
          </Card>
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