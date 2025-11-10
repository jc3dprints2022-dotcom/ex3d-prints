
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, X, Download, Trash2 } from "lucide-react"; // Added Trash2

const REJECTION_REASONS = [
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "violates_copyright", label: "Violates Copyright" },
  { value: "unreasonable_pricing", label: "Unreasonable Pricing" },
  { value: "violates_terms_of_service", label: "Violates Terms of Service" },
  { value: "other", label: "Other" }
];

export default function AdminDesignReviewModal({ isOpen, onClose, product, onUpdate }) {
  const [editMode, setEditMode] = useState(true); // Added as per outline, but not used in logic
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false); // Added
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    price: product.price,
    print_time_hours: product.print_time_hours || '',
    weight_grams: product.weight_grams || '',
    dimensions: product.dimensions || { length: '', width: '', height: '' },
    category: product.category,
    status: product.status,
    rejection_reason: product.rejection_reason || '',
    admin_feedback: product.admin_feedback || ''
  });
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading(true);
    try {
      await base44.entities.Product.update(product.id, {
        status: 'active',
        rejection_reason: null,
        admin_feedback: null
      });
      toast({ title: "Product approved!" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!formData.rejection_reason) {
      toast({ title: "Please select a rejection reason", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Product.update(product.id, {
        status: 'rejected',
        rejection_reason: formData.rejection_reason,
        admin_feedback: formData.admin_feedback
      });
      toast({ title: "Product rejected" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    // Basic validations
    if (!formData.name) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    if (!formData.description) {
      toast({ title: "Product description is required", variant: "destructive" });
      return;
    }
    if (parseFloat(formData.price) <= 0 || isNaN(parseFloat(formData.price))) {
      toast({ title: "Please enter a valid price", variant: "destructive" });
      return;
    }
    if (parseFloat(formData.print_time_hours) <= 0 || isNaN(parseFloat(formData.print_time_hours))) {
      toast({ title: "Please enter a valid print time", variant: "destructive" });
      return;
    }
    if (parseFloat(formData.weight_grams) <= 0 || isNaN(parseFloat(formData.weight_grams))) {
      toast({ title: "Please enter a valid weight", variant: "destructive" });
      return;
    }
    if (parseFloat(formData.dimensions.length) <= 0 || isNaN(parseFloat(formData.dimensions.length)) ||
        parseFloat(formData.dimensions.width) <= 0 || isNaN(parseFloat(formData.dimensions.width)) ||
        parseFloat(formData.dimensions.height) <= 0 || isNaN(parseFloat(formData.dimensions.height))) {
      toast({ title: "Please enter valid dimensions (length, width, height)", variant: "destructive" });
      return;
    }
    if (!formData.category) {
      toast({ title: "Product category is required", variant: "destructive" });
      return;
    }

    // If status is 'rejected', ensure rejection reason is provided
    if (formData.status === 'rejected' && !formData.rejection_reason) {
      toast({ title: "Please select a rejection reason when status is 'rejected'", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        print_time_hours: parseFloat(formData.print_time_hours),
        weight_grams: parseFloat(formData.weight_grams),
        dimensions: {
          length: parseFloat(formData.dimensions.length),
          width: parseFloat(formData.dimensions.width),
          height: parseFloat(formData.dimensions.height)
        },
        category: formData.category,
        status: formData.status,
        // Only send rejection_reason and admin_feedback if status is 'rejected'
        rejection_reason: formData.status === 'rejected' ? formData.rejection_reason : null,
        admin_feedback: formData.status === 'rejected' ? formData.admin_feedback : null
      };

      await base44.entities.Product.update(product.id, updateData);
      toast({ title: "Product updated successfully!" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to update product", description: error.message || "An unknown error occurred.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDelete = async () => { // Added
    if (!confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await base44.entities.Product.delete(product.id);
      toast({ title: "Product deleted successfully!" });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: "Failed to delete product", description: error.message || "An unknown error occurred.", variant: "destructive" });
    }
    setDeleting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle> {/* Changed title */}
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-gray-900">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-gray-900">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({...formData, category: value})}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home_decor">Home Decor</SelectItem>
                  <SelectItem value="toys_games">Toys & Games</SelectItem>
                  <SelectItem value="jewelry">Jewelry</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="art_sculpture">Art & Sculpture</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="fashion">Fashion</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-900">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price" className="text-gray-900">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="print_time" className="text-gray-900">Print Time (hrs)</Label>
              <Input
                id="print_time"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.print_time_hours}
                onChange={(e) => setFormData({...formData, print_time_hours: e.target.value})}
                placeholder="e.g., 2.5"
              />
            </div>

            <div>
              <Label htmlFor="weight" className="text-gray-900">Weight (g)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight_grams}
                onChange={(e) => setFormData({...formData, weight_grams: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-900">Dimensions (mm)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Input
                type="number"
                placeholder="Length"
                value={formData.dimensions.length}
                onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})}
              />
              <Input
                type="number"
                placeholder="Width"
                value={formData.dimensions.width}
                onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})}
              />
              <Input
                type="number"
                placeholder="Height"
                value={formData.dimensions.height}
                onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status" className="text-gray-900">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Images */}
          {product.images && product.images.length > 0 && (
            <div>
              <Label className="text-gray-900">Images</Label>
              <div className="flex gap-2 mt-2">
                {product.images.map((img, idx) => (
                  <img key={idx} src={img} alt={`Product ${idx + 1}`} className="w-24 h-24 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}

          {/* Materials and Colors */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">Materials</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.materials?.map((mat, idx) => (
                  <Badge key={idx}>{mat}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-900">Colors</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.colors?.map((color, idx) => (
                  <Badge key={idx}>{color}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Print Files */}
          {product.print_files && product.print_files.length > 0 && (
            <div>
              <Label className="text-gray-900">Print Files</Label>
              <div className="space-y-2 mt-2">
                {product.print_files.map((file, idx) => (
                  <a
                    key={idx}
                    href={file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    {file.split('/').pop().split('?')[0]}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Section - shown if current form status is 'rejected' */}
          {formData.status === 'rejected' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="rejection_reason" className="text-gray-900">Rejection Reason</Label>
                <Select value={formData.rejection_reason} onValueChange={(value) => setFormData({...formData, rejection_reason: value})}>
                  <SelectTrigger id="rejection_reason">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin_feedback" className="text-gray-900">Admin Feedback (optional)</Label>
                <Textarea
                  id="admin_feedback"
                  value={formData.admin_feedback}
                  onChange={(e) => setFormData({...formData, admin_feedback: e.target.value})}
                  placeholder="Provide feedback to the designer..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between"> {/* Modified class */}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete Product
          </Button>
          <div className="flex gap-2"> {/* Wrapped existing buttons in a div */}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} {/* Added Check icon */}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
