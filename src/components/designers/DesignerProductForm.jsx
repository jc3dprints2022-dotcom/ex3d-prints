import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, Crop, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImageCropEditor from "../shared/ImageCropEditor";

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
  { value: "toys_and_games", label: "Toys & Games"},
  { value: "holidays", label: "Holidays"},
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink",
  "Copper", "Bronze", "Silk Rainbow", "Marble",
];

export default function DesignerProductForm({ designerId, designerName, existingProduct, onSuccess, onCancel }) {
  const [licenseVerified, setLicenseVerified] = useState(!!existingProduct);
  const [saving, setSaving] = useState(false);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [currentCropImage, setCurrentCropImage] = useState({ url: "", index: -1 });
  const [boostWeeks, setBoostWeeks] = useState(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState(
    existingProduct
      ? {
          name: existingProduct.name,
          description: existingProduct.description,
          print_time_hours: existingProduct.print_time_hours.toString(),
          weight_grams: existingProduct.weight_grams.toString(),
          dimensions: existingProduct.dimensions || { length: '', width: '', height: '' },
          category: existingProduct.category,
          materials: existingProduct.materials || [],
          colors: existingProduct.colors || [],
          tags: existingProduct.tags || [],
          images: existingProduct.images || [],
          print_files: existingProduct.print_files || [],
          assembly_instructions: existingProduct.assembly_instructions || [],
          multi_color: existingProduct.multi_color || false,
          number_of_colors: existingProduct.number_of_colors || 2,
          custom_scale: existingProduct.custom_scale || null,
          infill_percentage: existingProduct.infill_percentage || 15,
          use_shown_colors: existingProduct.use_shown_colors || false,
          shown_color_specs: existingProduct.shown_color_specs || [],
        }
      : {
          name: '',
          description: '',
          print_time_hours: '',
          weight_grams: '',
          dimensions: { length: '', width: '', height: '' },
          category: '',
          materials: [],
          colors: [],
          tags: [],
          images: [],
          print_files: [],
          assembly_instructions: [],
          multi_color: false,
          number_of_colors: 2,
          custom_scale: null,
          infill_percentage: 15,
          use_shown_colors: false,
          shown_color_specs: [],
        }
  );

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Image file too large",
        description: `Some images exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
    }

    const filesToUpload = files.filter(file => file.size <= MAX_IMAGE_SIZE);
    if (filesToUpload.length === 0) {
      e.target.value = null;
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
      e.target.value = null;
    } catch (error) {
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

  const handleOpenCropEditor = (imageUrl, index) => {
    setCurrentCropImage({ url: imageUrl, index });
    setCropEditorOpen(true);
  };

  const handleSaveCroppedImage = (newImageUrl) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, idx) => 
        idx === currentCropImage.index ? newImageUrl : img
      )
    }));
    setCropEditorOpen(false);
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
      e.target.value = null;
    } catch (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAssemblyInstructionsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSaving(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const instructionFiles = results.map((res, idx) => ({
        file_url: res.file_url,
        file_name: files[idx].name
      }));

      setFormData(prev => ({
        ...prev,
        assembly_instructions: [...prev.assembly_instructions, ...instructionFiles]
      }));

      toast({ title: `${files.length} instruction file(s) uploaded successfully` });
      e.target.value = null;
    } catch (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSelectAllColors = (checked) => {
    setFormData(prev => ({
      ...prev,
      colors: checked ? ["Shown Colors", ...COLORS] : [],
      use_shown_colors: checked,
      shown_color_specs: checked ? prev.shown_color_specs : []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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



    const grams = parseFloat(formData.weight_grams);
    const printTime = parseFloat(formData.print_time_hours);
    const rawPrice = (((grams / 1000) * 20) + (printTime / 5)) * 4.5;
    const calculatedPrice = Math.ceil(rawPrice);

    // Store boost intention for post-approval payment (don't activate boost yet)
    let boostData = {};
    if (boostWeeks > 0) {
      boostData = {
        is_boosted: false, // Will be activated after payment
        boost_duration_weeks: boostWeeks,
        boost_pending_payment: true
      };
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
        tags: formData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
        images: formData.images,
        print_files: formData.print_files,
        assembly_instructions: formData.assembly_instructions,
        designer_id: designerId,
        designer_name: designerName,
        status: 'pending',
        multi_color: formData.multi_color,
        number_of_colors: formData.multi_color ? parseInt(formData.number_of_colors) : null,
        custom_scale: formData.custom_scale ? parseFloat(formData.custom_scale) : null,
        infill_percentage: formData.infill_percentage ? parseFloat(formData.infill_percentage) : 15,
        use_shown_colors: formData.use_shown_colors,
        shown_color_specs: formData.use_shown_colors ? formData.shown_color_specs : [],
        rating: 0,
        review_count: 0,
        view_count: 0,
        sales_count: 0,
        rejection_count: 0,
        ...boostData
      };

      if (existingProduct) {
        // For updates, update with pending status to trigger re-review
        await base44.entities.Product.update(existingProduct.id, {
          ...productData,
          status: 'pending',
          admin_feedback: null // Clear previous feedback
        });
        toast({ title: existingProduct.status === 'rejected' ? "Design resubmitted for review!" : "Changes submitted for review!" });
      } else {
        await base44.entities.Product.create(productData);
        toast({ title: "Product submitted for review!" });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Failed to save product", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <>
      <ImageCropEditor
        isOpen={cropEditorOpen}
        onClose={() => setCropEditorOpen(false)}
        imageUrl={currentCropImage.url}
        onSave={handleSaveCroppedImage}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
            required
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags.join(', ')}
          onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)})}
          placeholder="e.g., cosplay, helmet, character, fanart"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <Label htmlFor="print_time">Print Time (hrs) *</Label>
          <Input
            id="print_time"
            type="number"
            step="0.1"
            min="0.1"
            value={formData.print_time_hours}
            onChange={(e) => setFormData({...formData, print_time_hours: e.target.value})}
            placeholder="e.g., 2.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="weight">Weight (g) *</Label>
          <Input
            id="weight"
            type="number"
            step="1"
            min="1"
            value={formData.weight_grams}
            onChange={(e) => setFormData({...formData, weight_grams: e.target.value})}
            required
          />
        </div>

        <div>
          <Label htmlFor="scale">Scale (%)</Label>
          <Input
            id="scale"
            type="number"
            step="1"
            min="1"
            max="5000"
            value={formData.custom_scale || ''}
            onChange={(e) => setFormData({...formData, custom_scale: e.target.value ? parseFloat(e.target.value) : null})}
            placeholder="Optional (default 100)"
          />
        </div>

        <div>
          <Label htmlFor="infill">Infill (%)</Label>
          <Input
            id="infill"
            type="number"
            step="1"
            min="0"
            max="100"
            value={formData.infill_percentage}
            onChange={(e) => setFormData({...formData, infill_percentage: e.target.value ? parseFloat(e.target.value) : 15})}
            placeholder="Default 15%"
          />
        </div>

        <div>
          <Label htmlFor="price">Price ($) - Auto *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={
              formData.weight_grams && formData.print_time_hours
                ? Math.ceil((((parseFloat(formData.weight_grams) / 1000) * 20) + (parseFloat(formData.print_time_hours) / 5)) * 4.5)
                : ''
            }
            readOnly
            className="bg-gray-100"
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      <div>
        <Label>Dimensions (mm) *</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <Input
            type="number"
            placeholder="Length"
            step="1"
            min="1"
            value={formData.dimensions.length}
            onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})}
            required
          />
          <Input
            type="number"
            placeholder="Width"
            step="1"
            min="1"
            value={formData.dimensions.width}
            onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})}
            required
          />
          <Input
            type="number"
            placeholder="Height"
            step="1"
            min="1"
            value={formData.dimensions.height}
            onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})}
            required
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Materials *</Label>
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
                <Label htmlFor={`material-${material}`} className="text-sm font-normal cursor-pointer">{material}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Colors *</Label>
          <div className="flex items-center space-x-2 mb-3">
            <Checkbox
              id="select-all-colors"
              checked={formData.colors.length === COLORS.length + 1 && formData.colors.includes("Shown Colors") && COLORS.every(c => formData.colors.includes(c))}
              onCheckedChange={handleSelectAllColors}
            />
            <Label htmlFor="select-all-colors" className="font-bold cursor-pointer">Select All Colors</Label>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="color-shown-colors"
                checked={formData.colors.includes("Shown Colors")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({...prev, colors: ["Shown Colors", ...prev.colors], use_shown_colors: true}));
                  } else {
                    setFormData(prev => ({...prev, colors: prev.colors.filter(c => c !== "Shown Colors"), use_shown_colors: false, shown_color_specs: []}));
                  }
                }}
              />
              <Label htmlFor="color-shown-colors" className="text-sm font-bold cursor-pointer text-blue-600">Shown Colors</Label>
            </div>
            {COLORS.map(color => (
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
                <Label htmlFor={`color-${color}`} className="text-sm font-normal cursor-pointer">{color}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {formData.multi_color && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <Label htmlFor="number_of_colors">
            Number of Colors Required (2-6) *
          </Label>
          <Input
            id="number_of_colors"
            type="number"
            min="2"
            max="6"
            value={formData.number_of_colors}
            onChange={(e) => setFormData(prev => ({...prev, number_of_colors: e.target.value}))}
            className="mt-2"
            required={formData.multi_color}
          />
          <p className="text-xs text-gray-600 mt-2">
            Customers will need to select exactly this many colors when ordering
          </p>
        </div>
      )}

      {formData.use_shown_colors && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="mb-3 block">Specify Colors for Each File</Label>
          <p className="text-xs text-gray-600 mb-3">
            Map each print file to a specific color and quantity. File names will help makers identify which color to use.
          </p>
          {formData.print_files.map((file, idx) => (
            <div key={idx} className="mb-3 p-3 bg-white rounded border">
              <p className="text-sm font-medium mb-2">File {idx + 1}: {file.split('/').pop()}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`color-spec-${idx}`} className="text-xs">Color</Label>
                  <Select
                    value={formData.shown_color_specs[idx]?.color || ''}
                    onValueChange={(value) => {
                      const newSpecs = [...formData.shown_color_specs];
                      newSpecs[idx] = { ...newSpecs[idx], file_index: idx, color: value, quantity: newSpecs[idx]?.quantity || 1 };
                      setFormData(prev => ({...prev, shown_color_specs: newSpecs}));
                    }}
                  >
                    <SelectTrigger id={`color-spec-${idx}`}>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`qty-spec-${idx}`} className="text-xs">Quantity</Label>
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
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <Label htmlFor="images">Product Images * (Multiple allowed)</Label>
        <Input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          disabled={saving}
          className="mb-2"
        />
        <p className="text-xs text-gray-500 mb-2">At least one image required</p>
        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {formData.images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={img} alt={`Product ${idx + 1}`} className="w-full h-24 object-cover rounded border cursor-pointer" onClick={() => handleOpenCropEditor(img, idx)} />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCropEditor(img, idx);
                  }}
                >
                  <Crop className="w-3 h-3" />
                </Button>
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
        <Label htmlFor="print_files">3D Model Files (STL, OBJ, etc.) *</Label>
        <Input
          id="print_files"
          type="file"
          accept=".stl,.obj,.3mf"
          multiple
          onChange={handlePrintFileUpload}
          disabled={saving}
          className="mb-2"
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

      <div>
        <Label htmlFor="assembly_instructions">Assembly/Print Instructions (Optional)</Label>
        <Input
          id="assembly_instructions"
          type="file"
          accept=".pdf,.doc,.docx,.txt,image/*"
          multiple
          onChange={handleAssemblyInstructionsUpload}
          disabled={saving}
          className="mb-2"
        />
        <p className="text-xs text-gray-500 mb-2">Upload PDFs, documents, or images with assembly instructions</p>
        {formData.assembly_instructions.length > 0 && (
          <div className="space-y-2">
            {formData.assembly_instructions.map((instruction, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <span className="text-sm truncate flex-1">{instruction.file_name}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, assembly_instructions: prev.assembly_instructions.filter((_, i) => i !== idx)}))}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <Checkbox
          id="multi_color"
          checked={formData.multi_color}
          onCheckedChange={(checked) => setFormData(prev => ({...prev, multi_color: checked}))}
        />
        <Label htmlFor="multi_color" className="font-medium cursor-pointer">
          This design requires multi-color printing
        </Label>
      </div>

      <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
        <Checkbox
          id="license_verified"
          checked={licenseVerified}
          onCheckedChange={(checked) => setLicenseVerified(checked)}
          required
        />
        <Label htmlFor="license_verified" className="text-sm font-bold cursor-pointer">
          * I verify I have the full right to sell this design (REQUIRED)
        </Label>
      </div>

      {/* Boost Listing Option */}
      <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <Label htmlFor="boost_weeks" className="text-sm font-medium">Boost Your Listing 🚀</Label>
          </div>
          <Select
            value={boostWeeks.toString()}
            onValueChange={(value) => setBoostWeeks(parseInt(value))}
          >
            <SelectTrigger id="boost_weeks" className="w-48">
              <SelectValue placeholder="No boost" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No boost (free)</SelectItem>
              <SelectItem value="1">1 week - $5</SelectItem>
              <SelectItem value="2">2 weeks - $10</SelectItem>
              <SelectItem value="3">3 weeks - $15</SelectItem>
              <SelectItem value="4">4 weeks - $20</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {boostWeeks > 0 && (
          <p className="text-xs text-gray-600 mt-2">
            Total: ${boostWeeks * 5} • Payment after approval
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Product...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>
    </form>
    </>
  );
}