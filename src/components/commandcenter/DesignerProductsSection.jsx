import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, Eye, ShoppingCart, DollarSign, Package, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function DesignerProductsSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'week', '30days', 'all'
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.list();
      const designerProducts = allProducts.filter(p => p.designer_id && p.designer_id !== 'admin');
      
      // Get all completed orders for stats
      const allOrders = await base44.entities.Order.list();
      const completedOrders = allOrders.filter(o =>
        ['completed', 'delivered', 'dropped_off'].includes(o.status) && o.payment_status === 'paid'
      );

      // Calculate stats for each product
      const productsWithStats = designerProducts.map(product => {
        let views = product.view_count || 0;
        let sales = 0;
        let profit = 0;

        // Calculate sales and profit from orders
        completedOrders.forEach(order => {
          order.items?.forEach(item => {
            if (item.product_id === product.id) {
              const itemDate = new Date(order.created_date);
              const now = new Date();
              const daysDiff = (now - itemDate) / (1000 * 60 * 60 * 24);

              // Filter by time range
              let includeInStats = true;
              if (timeRange === 'week' && daysDiff > 7) includeInStats = false;
              if (timeRange === '30days' && daysDiff > 30) includeInStats = false;

              if (includeInStats) {
                sales += item.quantity;
                profit += item.total_price * 0.10; // 10% designer commission
              }
            }
          });
        });

        return {
          ...product,
          stats: { views, sales, profit }
        };
      });

      setProducts(productsWithStats.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error("Failed to load products:", error);
      toast({ title: "Failed to load products", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [timeRange]);

  const handleApprove = async (product) => {
    setProcessing(true);
    try {
      await base44.entities.Product.update(product.id, {
        status: 'active',
        admin_feedback: adminNotes || null
      });

      // Send email to designer
      try {
        const allUsers = await base44.entities.User.list();
        const designer = allUsers.find(u => u.id === product.designer_id);
        
        if (designer) {
          await base44.integrations.Core.SendEmail({
            to: designer.email,
            subject: 'Your Design Has Been Approved! - EX3D Prints',
            body: `Hi ${designer.full_name},

Great news! Your design "${product.name}" has been approved and is now live on the marketplace!

${adminNotes ? `Admin Notes: ${adminNotes}\n\n` : ''}You can now start earning 10% royalties on every sale of this design.

View your product: ${window.location.origin}/ProductDetail?id=${product.id}

Thank you for contributing to EX3D Prints!

Best regards,
The EX3D Team`
          });
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }

      toast({ title: "Product approved successfully!" });
      setReviewingProduct(null);
      setAdminNotes('');
      loadProducts();
    } catch (error) {
      console.error("Approval error:", error);
      toast({ title: "Failed to approve product", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleReject = async (product) => {
    if (!adminNotes.trim()) {
      toast({ title: "Please provide rejection feedback", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      await base44.entities.Product.update(product.id, {
        status: 'rejected',
        admin_feedback: adminNotes,
        rejection_reason: 'other'
      });

      // Send email to designer
      try {
        const allUsers = await base44.entities.User.list();
        const designer = allUsers.find(u => u.id === product.designer_id);
        
        if (designer) {
          await base44.integrations.Core.SendEmail({
            to: designer.email,
            subject: 'Update on Your Design Submission - EX3D Prints',
            body: `Hi ${designer.full_name},

Thank you for submitting "${product.name}" to EX3D Prints.

Unfortunately, we're unable to approve this design at this time. Here's our feedback:

${adminNotes}

You're welcome to make revisions and resubmit. We appreciate your effort and creativity!

If you have questions, please reply to this email.

Best regards,
The EX3D Team`
          });
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }

      toast({ title: "Product rejected and designer notified" });
      setReviewingProduct(null);
      setAdminNotes('');
      loadProducts();
    } catch (error) {
      console.error("Rejection error:", error);
      toast({ title: "Failed to reject product", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'active');
  const rejectedProducts = products.filter(p => p.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Designer Products Review</h2>
          <p className="text-gray-400 mt-1">
            {pendingProducts.length} pending • {approvedProducts.length} approved • {rejectedProducts.length} rejected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="timeRange" className="text-white">Stats Period:</Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger id="timeRange" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pending Products */}
      {pendingProducts.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-400">Pending Review ({pendingProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingProducts.map(product => (
                <div key={product.id} className="p-4 bg-slate-800 rounded-lg border border-yellow-500/20">
                  <div className="flex gap-4">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-24 h-24 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-white">{product.name}</h3>
                          <p className="text-sm text-gray-400 mt-1">{product.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Designer: {product.designer_name} • Submitted: {new Date(product.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewingProduct(product)}
                          className="ml-4"
                        >
                          Review
                        </Button>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                          ${product.price?.toFixed(2)}
                        </Badge>
                        <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                          {product.print_time_hours}h print
                        </Badge>
                        {product.multi_color && (
                          <Badge variant="outline" className="text-pink-400 border-pink-500/30">
                            Multi-Color
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Products */}
      <Card className="bg-green-900/20 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400">Approved Products ({approvedProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {approvedProducts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No approved products yet</p>
          ) : (
            <div className="space-y-4">
              {approvedProducts.map(product => (
                <div key={product.id} className="p-4 bg-slate-800 rounded-lg border border-green-500/20">
                  <div className="flex gap-4">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-20 h-20 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">Designer: {product.designer_name}</p>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mt-3">
                       <div className="flex items-center gap-2">
                         <Eye className="w-4 h-4 text-blue-400" />
                         <div>
                           <p className="text-xs text-gray-400">Views</p>
                           <p className="font-bold text-white">{product.stats.views}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <ShoppingCart className="w-4 h-4 text-green-400" />
                         <div>
                           <p className="text-xs text-gray-400">Sales</p>
                           <p className="font-bold text-white">{product.stats.sales}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <DollarSign className="w-4 h-4 text-teal-400" />
                         <div>
                           <p className="text-xs text-gray-400">Designer Profit</p>
                           <p className="font-bold text-white">${product.stats.profit.toFixed(2)}</p>
                         </div>
                       </div>
                      </div>
                      </div>
                      <div className="flex gap-2">
                      <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setReviewingProduct(product)}
                      >
                       Edit
                      </Button>
                      <Button
                       variant="destructive"
                       size="sm"
                       onClick={async () => {
                         if (confirm(`Are you sure you want to decline "${product.name}"?`)) {
                           setProcessing(true);
                           try {
                             await base44.entities.Product.update(product.id, {
                               status: 'inactive'
                             });
                             toast({ title: "Product declined successfully" });
                             loadProducts();
                           } catch (error) {
                             toast({ title: "Failed to decline product", variant: "destructive" });
                           }
                           setProcessing(false);
                         }
                       }}
                      >
                       Decline
                      </Button>
                      </div>
                      </div>
                      </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Products */}
      {rejectedProducts.length > 0 && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Rejected Products ({rejectedProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rejectedProducts.map(product => (
                <div key={product.id} className="p-4 bg-slate-800 rounded-lg border border-red-500/20">
                  <div className="flex gap-4">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-20 h-20 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-xs text-gray-400">Designer: {product.designer_name}</p>
                      {product.admin_feedback && (
                        <p className="text-sm text-red-400 mt-2">
                          <strong>Rejection Reason:</strong> {product.admin_feedback}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingProduct} onOpenChange={() => { setReviewingProduct(null); setAdminNotes(''); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Design: {reviewingProduct?.name}</DialogTitle>
          </DialogHeader>

          {reviewingProduct && (
            <div className="space-y-6">
              {/* Product Images */}
              {reviewingProduct.images?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Images</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {reviewingProduct.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`Image ${idx + 1}`} className="w-full h-32 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Designer:</strong> {reviewingProduct.designer_name}
                </div>
                <div>
                  <strong>Price:</strong> ${reviewingProduct.price?.toFixed(2)}
                </div>
                <div>
                  <strong>Print Time:</strong> {reviewingProduct.print_time_hours}h
                </div>
                <div>
                  <strong>Weight:</strong> {reviewingProduct.weight_grams}g
                </div>
                <div>
                  <strong>Category:</strong> {reviewingProduct.category}
                </div>
              </div>

              <div>
                <strong>Description:</strong>
                <p className="text-sm text-gray-600 mt-1">{reviewingProduct.description}</p>
              </div>

              {/* Admin-set fields during approval */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-4">
                <h4 className="font-semibold text-yellow-900">Admin Configuration (set during approval)</h4>
                
                <div>
                  <Label>Dimensions (mm)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Input
                      type="number" placeholder="Length"
                      value={reviewingProduct.dimensions?.length || ''}
                      onChange={(e) => setReviewingProduct(prev => ({ ...prev, dimensions: { ...(prev.dimensions || {}), length: parseFloat(e.target.value) || '' } }))}
                    />
                    <Input
                      type="number" placeholder="Width"
                      value={reviewingProduct.dimensions?.width || ''}
                      onChange={(e) => setReviewingProduct(prev => ({ ...prev, dimensions: { ...(prev.dimensions || {}), width: parseFloat(e.target.value) || '' } }))}
                    />
                    <Input
                      type="number" placeholder="Height"
                      value={reviewingProduct.dimensions?.height || ''}
                      onChange={(e) => setReviewingProduct(prev => ({ ...prev, dimensions: { ...(prev.dimensions || {}), height: parseFloat(e.target.value) || '' } }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="admin_multi_color"
                      checked={reviewingProduct.multi_color || false}
                      onChange={(e) => setReviewingProduct(prev => ({ ...prev, multi_color: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="admin_multi_color">Requires multi-color printing</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="admin_shown_colors"
                      checked={reviewingProduct.use_shown_colors || false}
                      onChange={(e) => setReviewingProduct(prev => ({ ...prev, use_shown_colors: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="admin_shown_colors">Use shown colors</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes / Feedback</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  placeholder="Add feedback for the designer (required for rejection)..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setReviewingProduct(null); setAdminNotes(''); }}
              disabled={processing}
            >
              Cancel
            </Button>
            {reviewingProduct?.status === 'pending' ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(reviewingProduct)}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(reviewingProduct)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleApprove(reviewingProduct)}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}