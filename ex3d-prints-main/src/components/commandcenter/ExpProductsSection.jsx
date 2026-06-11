import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Gift, Plus, Edit, Trash2, Loader2, Upload, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ExpProductsSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exp_cost: '',
    category: 'misc',
    materials: ['PLA'],
    colors: ['Black'],
    multi_color: false,
    number_of_colors: 1,
    images: [],
    print_files: [],
    dimensions: { length: '', width: '', height: '' },
    weight_grams: '',
    print_time_hours: '',
    status: 'active',
    is_exp_product: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const allProducts = await base44.entities.Product.filter({ is_exp_product: true });
      setProducts(allProducts.sort((a, b) => b.created_date.localeCompare(a.created_date)));
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({ title: "Failed to load products", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.functions.invoke('uploadFile', { file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.data?.file_url).filter(Boolean);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
      toast({ title: "Images uploaded successfully!" });
    } catch (error) {
      toast({ title: "Failed to upload images", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(file => 
        base44.functions.invoke('uploadFile', { file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.data?.file_url).filter(Boolean);
      
      setFormData(prev => ({
        ...prev,
        print_files: [...prev.print_files, ...urls]
      }));
      toast({ title: "Print files uploaded successfully!" });
    } catch (error) {
      toast({ title: "Failed to upload print files", variant: "destructive" });
    }
    setUploadingFiles(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.exp_cost) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const user = await base44.auth.me();
      const productData = {
        ...formData,
        exp_cost: parseInt(formData.exp_cost),
        weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : undefined,
        print_time_hours: formData.print_time_hours ? parseFloat(formData.print_time_hours) : undefined,
        dimensions: {
          length: formData.dimensions.length ? parseFloat(formData.dimensions.length) : undefined,
          width: formData.dimensions.width ? parseFloat(formData.dimensions.width) : undefined,
          height: formData.dimensions.height ? parseFloat(formData.dimensions.height) : undefined
        },
        number_of_colors: formData.multi_color ? parseInt(formData.number_of_colors) : undefined,
        designer_id: user.id,
        designer_name: user.full_name,
        is_exp_product: true,
        price: 0 // EXP products have $0 price
      };

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, productData);
        toast({ title: "Product updated successfully!" });
      } else {
        await base44.entities.Product.create(productData);
        toast({ title: "Product created successfully!" });
      }

      setShowDialog(false);
      setEditingProduct(null);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast({ title: "Failed to save product", variant: "destructive" });
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      exp_cost: product.exp_cost?.toString() || '',
      category: product.category,
      materials: product.materials || ['PLA'],
      colors: product.colors || ['Black'],
      multi_color: product.multi_color || false,
      number_of_colors: product.number_of_colors || 1,
      images: product.images || [],
      print_files: product.print_files || [],
      dimensions: product.dimensions || { length: '', width: '', height: '' },
      weight_grams: product.weight_grams?.toString() || '',
      print_time_hours: product.print_time_hours?.toString() || '',
      status: product.status,
      is_exp_product: true
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await base44.entities.Product.delete(productId);
      toast({ title: "Product deleted successfully!" });
      await loadProducts();
    } catch (error) {
      toast({ title: "Failed to delete product", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      exp_cost: '',
      category: 'misc',
      materials: ['PLA'],
      colors: ['Black'],
      multi_color: false,
      number_of_colors: 1,
      images: [],
      print_files: [],
      dimensions: { length: '', width: '', height: '' },
      weight_grams: '',
      print_time_hours: '',
      status: 'active',
      is_exp_product: true
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      print_files: prev.print_files.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">EXP Products</h2>
          <p className="text-cyan-400">Manage products users can redeem with EXP points</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowDialog(true);
          }}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">All EXP Products</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No EXP products yet. Create your first!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Product</TableHead>
                  <TableHead className="text-slate-300">EXP Cost</TableHead>
                  <TableHead className="text-slate-300">Category</TableHead>
                  <TableHead className="text-slate-300">Materials</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id} className="border-slate-700">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-12 h-12 rounded object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-slate-400 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500">{product.exp_cost} EXP</Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{product.category}</TableCell>
                    <TableCell className="text-slate-300">
                      {product.materials?.join(', ') || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                          className="bg-slate-700 text-white border-slate-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product.id)}
                          className="bg-red-900 text-white border-red-700 hover:bg-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? 'Edit EXP Product' : 'Create EXP Product'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Products users can redeem with EXP points instead of money
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Custom Keychain"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">EXP Cost *</Label>
                <Input
                  type="number"
                  value={formData.exp_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, exp_cost: e.target.value }))}
                  placeholder="500"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the product..."
                rows={3}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="misc" className="text-white">Miscellaneous</SelectItem>
                    <SelectItem value="desk" className="text-white">Desk Accessories</SelectItem>
                    <SelectItem value="art" className="text-white">Art & Decor</SelectItem>
                    <SelectItem value="toys&games" className="text-white">Toys & Games</SelectItem>
                    <SelectItem value="dorm_essentials" className="text-white">Dorm Essentials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white">Active</SelectItem>
                    <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Materials & Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Materials (comma-separated)</Label>
                <Input
                  value={formData.materials.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, materials: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="PLA, ABS, PETG"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Colors (comma-separated)</Label>
                <Input
                  value={formData.colors.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, colors: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="Black, White, Red"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Multi-color */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multi_color"
                  checked={formData.multi_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, multi_color: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="multi_color" className="text-white cursor-pointer">
                  Multi-color print required
                </Label>
              </div>
              {formData.multi_color && (
                <div className="flex-1">
                  <Input
                    type="number"
                    value={formData.number_of_colors}
                    onChange={(e) => setFormData(prev => ({ ...prev, number_of_colors: e.target.value }))}
                    placeholder="Number of colors"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              )}
            </div>

            {/* Dimensions & Weight */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-white">Length (mm)</Label>
                <Input
                  type="number"
                  value={formData.dimensions.length}
                  onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, length: e.target.value } }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Width (mm)</Label>
                <Input
                  type="number"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, width: e.target.value } }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Height (mm)</Label>
                <Input
                  type="number"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, height: e.target.value } }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Weight (g)</Label>
                <Input
                  type="number"
                  value={formData.weight_grams}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight_grams: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Est. Print Time (hours)</Label>
              <Input
                type="number"
                value={formData.print_time_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, print_time_hours: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Images */}
            <div>
              <Label className="text-white">Product Images</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('imageUpload').click()}
                  disabled={uploading}
                  className="bg-slate-700 text-white border-slate-600"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Images
                </Button>
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {formData.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded" />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Files */}
            <div>
              <Label className="text-white">Print Files (.stl, .obj, etc.)</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('fileUpload').click()}
                  disabled={uploadingFiles}
                  className="bg-slate-700 text-white border-slate-600"
                >
                  {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Files
                </Button>
                <input
                  id="fileUpload"
                  type="file"
                  accept=".stl,.obj,.3mf,.amf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {formData.print_files.length > 0 && (
                <div className="space-y-2">
                  {formData.print_files.map((url, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-900 p-2 rounded">
                      <span className="text-sm text-slate-300">File {index + 1}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFile(index)}
                        className="h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-700 text-white border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}