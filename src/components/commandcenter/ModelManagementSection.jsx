import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, X, Package, Link as LinkIcon, PlusCircle, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AdminDesignReviewModal from "../admin/AdminDesignReviewModal";

const CATEGORIES = [
  { value: "kit_cards", label: "Kit Cards" },
  { value: "plane_models", label: "Plane Models" },
  { value: "rocket_models", label: "Rocket Models" },
  { value: "halloween", label: "Halloween" },
  { value: "embry_riddle", label: "Embry-Riddle" },
  { value: "dorm_essentials", label: "Dorm Essentials"},
  { value: "desk", label: "Desk"},
  { value: "art", label: "Art"},
  { value: "fashion", label: "Fashion"},
  { value: "gadgets", label: "Gadgets"},
  { value: "toys&games", label: "Toys&Games"},
  { value: "holidays", label: "Holidays"},
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink",
  "Copper", "Bronze", "Silk Rainbow", "Marble",
];

const statusColors = {
  active: "bg-green-600 text-white",
  pending: "bg-yellow-500 text-white",
  rejected: "bg-red-500 text-white",
  draft: "bg-gray-500 text-white",
};

export default function ModelManagementSection() {
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const { toast } = useToast();

  // New states for dashboard consolidation
  const [products, setProducts] = useState([]); // Manage products internally
  const [showForm, setShowForm] = useState(false); // To toggle product creation/edit form
  const [editingProduct, setEditingProduct] = useState(null); // Product being edited
  const [saving, setSaving] = useState(false); // Used for any ongoing file ops or form submission

  const initialFormData = {
    name: '',
    description: '',
    price: '', // Will be auto-calculated
    print_time_hours: '',
    weight_grams: '',
    dimensions: { length: '', width: '', height: '' },
    category: '',
    materials: [],
    colors: [],
    tags: [], // Preserving tags
    images: [],
    print_files: [],
    multi_color: false,
    number_of_colors: 2,
    custom_scale: null, // Added custom_scale field
    use_shown_colors: false,
    shown_color_specs: [],
    // 'status' removed from formData as it's hardcoded to 'active' in handleSubmit
  };

  const [formData, setFormData] = useState(initialFormData);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const fetchedProducts = await base44.entities.Product.list();
      setProducts(fetchedProducts || []);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast({ title: "Failed to load products", description: error.message, variant: "destructive" });
    }
  };

  // Helper function to calculate profit per hour
  const calculateProfitPerHour = (product) => {
    if (!product.price || !product.print_time_hours || parseFloat(product.print_time_hours) <= 0) {
      return 0;
    }
    return (parseFloat(product.price) / parseFloat(product.print_time_hours)).toFixed(2);
  };

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      case 'most_rejected':
        return (b.rejection_count || 0) - (a.rejection_count || 0);
      case 'most_viewed':
        return (b.view_count || 0) - (a.view_count || 0);
      case 'most_sales':
        return (b.sales_count || 0) - (a.sales_count || 0);
      case 'least_viewed':
        return (a.view_count || 0) - (b.view_count || 0);
      case 'least_sales':
        return (a.sales_count || 0) - (b.sales_count || 0);
      default:
        return 0;
    }
  });

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const { data } = await base44.functions.invoke('importFrom3DPlatform', { url: importUrl });

      if (data.success) {
        const importedData = data.data;
        setFormData(prev => ({
          ...prev,
          name: importedData.title || prev.name,
          description: importedData.description || prev.description,
          images: [...prev.images, ...(importedData.images || [])],
          print_files: [...prev.print_files, ...(importedData.print_files || [])],
          tags: importedData.tags || prev.tags,
          category: importedData.category || prev.category
        }));
        toast({
          title: "Import successful!",
          description: `Imported from ${importedData.platform}. Review and complete the listing details below.`
        });
        setShowForm(true); // Show form after successful import
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Image file too large",
        description: `Some images exceed 10MB limit and will not be uploaded: ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
    }

    const filesToUpload = files.filter(file => file.size <= MAX_IMAGE_SIZE);
    if (filesToUpload.length === 0) {
        e.target.value = null; // Clear input if no files are left to upload
        return;
    }

    setSaving(true);
    try {
      const uploadPromises = filesToUpload.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.file_url);

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));

      toast({ title: `${filesToUpload.length} image(s) uploaded successfully` });
      e.target.value = null; // Clear input
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handlePrintFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSaving(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.file_url);

      setFormData(prev => ({
        ...prev,
        print_files: [...prev.print_files, ...urls]
      }));

      toast({ title: `${files.length} 3D file(s) uploaded successfully` });
      e.target.value = null; // Clear input
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSelectAllColors = (checked) => {
    setFormData(prev => ({
      ...prev,
      colors: checked ? COLORS.filter(c => !c.includes('Color-Change')) : []
    }));
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(), // Convert to string for input
      print_time_hours: product.print_time_hours.toString(),
      weight_grams: product.weight_grams.toString(),
      dimensions: product.dimensions || { length: '', width: '', height: '' },
      category: product.category,
      materials: product.materials || [],
      colors: product.colors || [],
      tags: product.tags || [], // Preserve tags
      images: product.images || [],
      print_files: product.print_files || [],
      multi_color: product.multi_color || false,
      number_of_colors: product.number_of_colors || 2,
      custom_scale: product.custom_scale || null, // Populate custom_scale
      use_shown_colors: product.use_shown_colors || false,
      shown_color_specs: product.shown_color_specs || [],
      // Status not needed here as it's hardcoded to 'active' on save
    });
    setLicenseVerified(true); // Assume verified for existing products
    setShowForm(true);
    // Scroll to top or to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setLicenseVerified(false);
    setShowForm(false);
    setImportUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.description || !formData.category) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!formData.print_time_hours || parseFloat(formData.print_time_hours) <= 0) {
      toast({ title: "Please enter a valid print time in hours", variant: "destructive" });
      return;
    }

    if (!formData.weight_grams || parseFloat(formData.weight_grams) <= 0) {
      toast({ title: "Please enter a valid weight in grams", variant: "destructive" });
      return;
    }

    if (!formData.dimensions.length || !formData.dimensions.width || !formData.dimensions.height) {
      toast({ title: "Please enter all dimensions (L x W x H)", variant: "destructive" });
      return;
    }

    if (formData.materials.length === 0) {
      toast({ title: "Please select at least one material", variant: "destructive" });
      return;
    }

    if (formData.colors.length === 0) {
      toast({ title: "Please select at least one color", variant: "destructive" });
      return;
    }

    if (formData.images.length === 0) {
      toast({ title: "Please upload at least one product image", variant: "destructive" });
      return;
    }

    if (formData.print_files.length === 0) {
      toast({ title: "Please upload at least one 3D model file", variant: "destructive" });
      return;
    }

    if (!licenseVerified) {
      toast({
        title: "License verification required",
        description: "You must verify that this design does NOT have a non-commercial license restriction",
        variant: "destructive"
      });
      return;
    }

    if (formData.multi_color) {
      if (!formData.number_of_colors || parseInt(formData.number_of_colors) < 2 || parseInt(formData.number_of_colors) > 6) {
        toast({ 
          title: "Invalid number of colors", 
          description: "Multi-color prints must have between 2-6 colors",
          variant: "destructive" 
        });
        return;
      }
    }

    // Auto-calculate price based on formula: (((grams/1000)*20)+1+(print_time/5))*4
    let calculatedPrice = 0;
    if (formData.weight_grams && formData.print_time_hours) {
      const grams = parseFloat(formData.weight_grams);
      const printTime = parseFloat(formData.print_time_hours);

      const rawPrice = (((grams / 1000) * 20) + 1 + (printTime / 5)) * 4;
      calculatedPrice = Math.ceil(rawPrice);
    } else {
        toast({ title: "Weight and Print Time are required for price calculation.", variant: "destructive" });
        return;
    }

    setSaving(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: calculatedPrice,
        print_time_hours: parseFloat(formData.print_time_hours),
        weight_grams: parseFloat(formData.weight_grams),
        dimensions: {
          length: parseFloat(formData.dimensions.length),
          width: parseFloat(formData.dimensions.width),
          height: parseFloat(formData.dimensions.height)
        },
        category: formData.category,
        materials: formData.materials,
        colors: formData.colors,
        tags: formData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0), // Clean tags
        images: formData.images,
        print_files: formData.print_files,
        designer_id: 'admin',
        designer_name: 'EX3D Admin', // Updated designer name
        status: 'active', // Hardcoded status
        multi_color: formData.multi_color,
        number_of_colors: formData.multi_color ? parseInt(formData.number_of_colors) : null,
        custom_scale: formData.custom_scale ? parseFloat(formData.custom_scale) : null, // Include custom_scale
        use_shown_colors: formData.use_shown_colors,
        shown_color_specs: formData.use_shown_colors ? formData.shown_color_specs : [],
        rating: editingProduct ? editingProduct.rating : 0, // Preserve rating on update
        review_count: editingProduct ? editingProduct.review_count : 0, // Preserve on update
        view_count: editingProduct ? editingProduct.view_count : 0, // Preserve on update
        sales_count: editingProduct ? editingProduct.sales_count : 0, // Preserve on update
        rejection_count: editingProduct ? editingProduct.rejection_count : 0, // Preserve on update
      };

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, productData);
        toast({ title: "Product updated successfully!" });
      } else {
        await base44.entities.Product.create(productData);
        toast({ title: "Product created successfully!" });
      }

      // Reset form
      setFormData(initialFormData); // Use initialFormData for reset
      setEditingProduct(null);
      setLicenseVerified(false);
      setImportUrl('');
      setShowForm(false); // Hide form after submission
      loadProducts(); // Refresh products list
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Failed to save product", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Product Management</h2>
        <Button onClick={() => {
          setShowForm(true);
          setEditingProduct(null); // Clear editing state when adding new
          setFormData(initialFormData); // Reset form for new product
          setLicenseVerified(false);
          setImportUrl('');
        }} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <PlusCircle className="w-4 h-4 mr-2" /> Add New Product
        </Button>
      </div>

      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400">Import Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1">
              <Label htmlFor="importUrl" className="text-sm font-medium text-gray-900 mb-2 block">
                <LinkIcon className="w-4 h-4 inline mr-2" />
                Import from 3D Platform
              </Label>
              <p className="text-xs text-gray-600 mb-2">
                Supports: Thingiverse, Printables, MyMiniFactory, Cults3D, Thangs
              </p>
              <Input
                id="importUrl"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.thingiverse.com/thing/... or https://www.printables.com/model/..."
                className="mb-0"
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="mt-6"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


      {showForm && (
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-cyan-400">
              {editingProduct ? 'Edit Product' : 'Upload New Product'}
            </CardTitle>
            <Button variant="ghost" onClick={handleCancelEdit} className="text-red-400 hover:text-red-500">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className = "text-white"
                  />
                </div>
                <div className="flex flex-col">
                    <Label htmlFor="category" className="text-white">Category *</Label>

                    <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                    >
                    <SelectTrigger
                        id="category"
                        className="text-white border-white bg-transparent !text-white"
                    >
                        <SelectValue
                        placeholder="Select category"
                        className="text-white placeholder-white"
                        />
                    </SelectTrigger>

                    <SelectContent className="bg-gray-900 text-white border border-gray-700">
                        {CATEGORIES.map(cat => (
                        <SelectItem
                            key={cat.value}
                            value={cat.value}
                            className="text-white focus:text-white hover:text-white"
                        >
                            {cat.label}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  required
                  className = "text-white"
                />
              </div>

              {/* Tags Input - Added to preserve existing functionality */}
              <div>
                <Label htmlFor="tags" className="text-white">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')} // Display as comma-separated string
                  onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)})}
                  className="bg-slate-800 border-cyan-500/30 text-white"
                  placeholder="e.g., cosplay, helmet, character, fanart"
                  className = "text-white"
                />
              </div>

              {/* Updated grid for new custom_scale input */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="print_time" className="text-white">Print Time (hrs) *</Label>
                  <Input
                    id="print_time"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.print_time_hours}
                    onChange={(e) => setFormData({...formData, print_time_hours: e.target.value})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    placeholder="e.g., 2.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="weight" className="text-white">Weight (g) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.weight_grams}
                    onChange={(e) => setFormData({...formData, weight_grams: e.target.value})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    required
                  />
                </div>

                {/* New input for custom_scale */}
                <div>
                  <Label htmlFor="scale" className="text-white">Scale (%)</Label>
                  <Input
                    id="scale"
                    type="number"
                    step="1"
                    min="1"
                    max="1000"
                    value={formData.custom_scale || ''} // Display empty string for null
                    onChange={(e) => setFormData({...formData, custom_scale: e.target.value ? parseFloat(e.target.value) : null})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    placeholder="Optional (default 100)"
                  />
                </div>

                <div>
                  <Label htmlFor="price" className="text-white">Price ($) - Auto-Calculated *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      formData.weight_grams && formData.print_time_hours
                        ? Math.ceil((((parseFloat(formData.weight_grams) / 1000) * 20) + 1 + (parseFloat(formData.print_time_hours) / 5)) * 4)
                        : '' // Display empty if not calculable
                    }
                    readOnly
                    className="bg-slate-700 border-cyan-500/30 text-white read-only:bg-gray-700 read-only:text-gray-300"
                    placeholder="Auto-calculated from weight and time"
                  />
                  <p className="text-xs text-gray-400 mt-1">Formula: (((grams/1000)*20)+1+(hrs/5))*4</p>
                </div>
              </div>

              <div>
                <Label className="text-white">Dimensions (mm) *</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Length"
                    step="1"
                    min="1"
                    value={formData.dimensions.length}
                    onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Width"
                    step="1"
                    min="1"
                    value={formData.dimensions.width}
                    onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Height"
                    step="1"
                    min="1"
                    value={formData.dimensions.height}
                    onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})}
                    className="bg-slate-800 border-cyan-500/30 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-white">Materials *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MATERIALS.map(material => (
                      <div key={material} className="flex items-center space-x-2">
                        <Checkbox
                          id={`material-${material}`}
                          checked={formData.materials.includes(material)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({...prev, materials: [...prev.materials, material]}));
                            } else {
                              setFormData(prev => ({...prev, materials: prev.materials.filter(m => m !== material)}));
                            }
                          }}
                        />
                        <Label htmlFor={`material-${material}`} className="text-sm font-normal cursor-pointer text-white">{material}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-white">Colors *</Label>
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="select-all-colors"
                      checked={formData.colors.length === COLORS.filter(c => !c.includes('Color-Change')).length && COLORS.filter(c => !c.includes('Color-Change')).every(c => formData.colors.includes(c))}
                      onCheckedChange={handleSelectAllColors}
                    />
                    <Label htmlFor="select-all-colors" className="font-bold cursor-pointer text-white">Select All Colors</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {COLORS.filter(c => !c.includes('Color-Change')).map(color => (
                      <div key={color} className="flex items-center space-x-2">
                        <Checkbox
                          id={`color-${color}`}
                          checked={formData.colors.includes(color)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({...prev, colors: [...prev.colors, color]}));
                            } else {
                              setFormData(prev => ({...prev, colors: prev.colors.filter(c => c !== color)}));
                            }
                          }}
                        />
                        <Label htmlFor={`color-${color}`} className="text-sm text-white font-normal cursor-pointer">{color}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg border border-purple-500/30">
                <Checkbox
                  id="multi_color"
                  checked={formData.multi_color}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, multi_color: checked}))}
                />
                <Label htmlFor="multi_color" className="text-white font-medium cursor-pointer">
                  This design requires multi-color printing
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-lg border border-blue-500/30">
                <Checkbox
                  id="use_shown_colors"
                  checked={formData.use_shown_colors}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, use_shown_colors: checked}))}
                />
                <Label htmlFor="use_shown_colors" className="text-white font-medium cursor-pointer">
                  Use Shown Colors (print with exact colors shown in listing images)
                </Label>
              </div>

              {formData.multi_color && (
                <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                  <Label htmlFor="number_of_colors" className="text-white">
                    Number of Colors Required (2-6) *
                  </Label>
                  <Input
                    id="number_of_colors"
                    type="number"
                    min="2"
                    max="6"
                    value={formData.number_of_colors}
                    onChange={(e) => setFormData(prev => ({...prev, number_of_colors: e.target.value}))}
                    className="bg-slate-800 border-purple-500/30 text-white mt-2"
                    required={formData.multi_color}
                  />
                  <p className="text-xs text-purple-300 mt-2">
                    Customers will need to select exactly this many colors when ordering
                  </p>
                </div>
              )}

              {formData.use_shown_colors && (
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <Label className="mb-3 block text-white">Specify Colors for Each File *</Label>
                  <p className="text-xs text-blue-300 mb-3">
                    Map each print file to a specific color and quantity. File names will help makers identify which color to use.
                  </p>
                  {formData.print_files.map((file, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-slate-800 rounded border border-blue-500/20">
                      <p className="text-sm font-medium text-white mb-2">File {idx + 1}: {file.split('/').pop()}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`color-spec-${idx}`} className="text-xs text-white">Color</Label>
                          <Select
                            value={formData.shown_color_specs[idx]?.color || ''}
                            onValueChange={(value) => {
                              const newSpecs = [...formData.shown_color_specs];
                              newSpecs[idx] = { ...newSpecs[idx], file_index: idx, color: value, quantity: newSpecs[idx]?.quantity || 1 };
                              setFormData(prev => ({...prev, shown_color_specs: newSpecs}));
                            }}
                          >
                            <SelectTrigger id={`color-spec-${idx}`} className="bg-slate-700 text-white">
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 text-white border border-gray-700">
                              {COLORS.map(color => (
                                <SelectItem key={color} value={color} className="text-white focus:text-white hover:text-white">{color}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`qty-spec-${idx}`} className="text-xs text-white">Quantity</Label>
                          <Input
                            id={`qty-spec-${idx}`}
                            type="number"
                            min="1"
                            value={formData.shown_color_specs[idx]?.quantity || 1}
                            onChange={(e) => {
                              const newSpecs = [...formData.shown_color_specs];
                              newSpecs[idx] = { ...newSpecs[idx], file_index: idx, quantity: parseInt(e.target.value) || 1 };
                              setFormData(prev => ({...prev, shown_color_specs: newSpecs}));
                            }}
                            className="bg-slate-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
                <Checkbox
                  id="license_verified"
                  checked={licenseVerified}
                  onCheckedChange={(checked) => setLicenseVerified(checked)}
                  required
                />
                <Label htmlFor="license_verified" className="text-sm font-bold text-gray-900 cursor-pointer">
                  * I verify this design does NOT have a non-commercial license restriction (REQUIRED)
                </Label>
              </div>

              {/* Image Upload - Multiple */}
              <div>
                <Label htmlFor="images" className="text-white">Product Images * (Multiple allowed)</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={saving}
                  className="mb-2 text-white"
                />
                <p className="text-xs text-gray-500 mb-2">At least one image required</p>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Product ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="print_files" className="text-white">3D Model Files (STL, OBJ, etc.) *</Label>
                <Input
                  id="print_files"
                  type="file"
                  accept=".stl,.obj,.3mf"
                  multiple
                  onChange={handlePrintFileUpload}
                  disabled={saving}
                  className="mb-2 text-white"
                />
                <p className="text-xs text-gray-500 mb-2">At least one 3D model file required</p>
                {formData.print_files.length > 0 && (
                  <div className="space-y-2">
                    {formData.print_files.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                        <span className="text-sm truncate flex-1">{url.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, print_files: prev.print_files.filter((_, i) => i !== idx)}))}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {editingProduct && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this product?')) {
                        try {
                          await base44.entities.Product.delete(editingProduct.id);
                          toast({ title: "Product deleted successfully" });
                          handleCancelEdit();
                          loadProducts();
                        } catch (error) {
                          toast({ title: "Failed to delete product", variant: "destructive" });
                        }
                      }
                    }}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Delete Product
                  </Button>
                )}
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingProduct ? 'Updating Product...' : 'Creating Product...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Products ({sortedProducts.length})</CardTitle>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="most_rejected">Most Rejected</SelectItem>
              <SelectItem value="most_viewed">Most Viewed</SelectItem>
              <SelectItem value="most_sales">Most Sales</SelectItem>
              <SelectItem value="least_viewed">Least Viewed</SelectItem>
              <SelectItem value="least_sales">Least Sales</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {sortedProducts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No products yet. Create your first one above!</p>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map((product) => {
                const profitPerHour = calculateProfitPerHour(product);
                
                return (
                  <div key={product.id} className="p-4 bg-slate-800 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center gap-4 mb-3">
                      {product.images?.[0] ? (
                        <div className="relative flex-shrink-0">
                          <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover rounded" />
                          {product.images.length > 1 && (
                            <Badge className="absolute -bottom-1 -right-1 h-5 text-xs px-1 py-0.5 bg-gray-700 text-white rounded-full">+{product.images.length - 1}</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0"> {/* Use min-w-0 to allow content to shrink */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 pr-4 min-w-0">
                            <h3 className="font-semibold text-white text-lg truncate">{product.name}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mt-1">{product.description}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge className={statusColors[product.status]}>{product.status}</Badge>
                          {product.price && (
                            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                              ${product.price?.toFixed(2)}
                            </Badge>
                          )}
                          {product.print_time_hours && (
                            <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                              {product.print_time_hours}h print
                            </Badge>
                          )}
                          {profitPerHour > 0 && (
                            <Badge variant="outline" className="text-green-400 border-green-500/30">
                              ${profitPerHour}/hr
                            </Badge>
                          )}
                          {product.multi_color && (
                            <Badge variant="outline" className="text-pink-400 border-pink-500/30">
                              Multi-Color ({product.number_of_colors || 2})
                            </Badge>
                          )}
                          {product.custom_scale && ( // Display custom_scale if available
                            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                              Scale: {product.custom_scale}%
                            </Badge>
                          )}
                          {product.tags && product.tags.length > 0 && (
                                <Badge variant="outline" className="text-xs text-gray-400 border-gray-500/30">{product.tags[0]}...</Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                          <span>Views: <span className="font-medium text-white">{product.view_count || 0}</span></span>
                          <span>Sales: <span className="font-medium text-white">{product.sales_count || 0}</span></span>
                          <span>Rejections: <span className="font-medium text-white">{product.rejection_count || 0}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {reviewingProduct && (
        <AdminDesignReviewModal
          isOpen={!!reviewingProduct}
          onClose={() => setReviewingProduct(null)}
          product={reviewingProduct}
          onUpdate={loadProducts} // Use loadProducts to refresh the list
        />
      )}
    </div>
  );
}