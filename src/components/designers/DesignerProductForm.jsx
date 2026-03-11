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
  const [customPrice, setCustomPrice] = useState(null);
  const { toast } = useToast();

  const ALL_COLORS = [
    "White", "Black", "Gray", "Silver", "Gold", "Brown",
    "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink",
    "Copper", "Bronze", "Silk Rainbow", "Marble",
  ];

  const [formData, setFormData] = useState(
    existingProduct
      ? {
          name: existingProduct.name,
          description: existingProduct.description,
          print_time_hours: existingProduct.print_time_hours.toString(),
          weight_grams: existingProduct.weight_grams.toString(),
          custom_price: existingProduct.price || null,
          category: existingProduct.category,
          images: existingProduct.images || [],
          print_files: existingProduct.print_files || [],
          assembly_instructions: existingProduct.assembly_instructions || [],
        }
      : {
          name: '',
          description: '',
          print_time_hours: '',
          weight_grams: '',
          custom_price: null,
          category: '',
          images: [],
          print_files: [],
          assembly_instructions: [],
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



    const grams = parseFloat(formData.weight_grams);
    const printTime = parseFloat(formData.print_time_hours);
    const rawPrice = (((grams / 1000) * 20) + (printTime / 5)) * 4.5;
    const calculatedPrice = formData.custom_price !== null && formData.custom_price !== '' 
      ? parseFloat(formData.custom_price) 
      : Math.ceil(rawPrice);

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
        category: formData.category,
        materials: ['PLA'],
        colors: ALL_COLORS,
        tags: [],
        images: formData.images,
        print_files: formData.print_files,
        assembly_instructions: formData.assembly_instructions,
        designer_id: designerId,
        designer_name: designerName,
        status: 'pending',
        multi_color: false,
        custom_scale: 100,
        infill_percentage: 15,
        use_shown_colors: false,
        shown_color_specs: [],
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
          <Label htmlFor="price">Price ($) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={
              formData.custom_price !== null && formData.custom_price !== ''
                ? formData.custom_price
                : formData.weight_grams && formData.print_time_hours
                ? Math.ceil((((parseFloat(formData.weight_grams) / 1000) * 20) + (parseFloat(formData.print_time_hours) / 5)) * 4.5)
                : ''
            }
            onChange={(e) => setFormData({...formData, custom_price: e.target.value ? parseFloat(e.target.value) : null})}
            placeholder="Auto-calculated"
            className={formData.custom_price !== null && formData.custom_price !== '' ? '' : 'bg-gray-50'}
          />
          <p className="text-xs text-gray-500 mt-1">Auto-calculated, or set custom</p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
        ℹ️ Materials will be set to PLA, all colors will be available, and scale/infill/dimensions will be configured by the admin during approval.
      </div>

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
              <SelectItem value="1">1 week - $5 or 350 EXP</SelectItem>
              <SelectItem value="2">2 weeks - $10 or 700 EXP</SelectItem>
              <SelectItem value="3">3 weeks - $15 or 1000 EXP</SelectItem>
              <SelectItem value="4">4 weeks - $20 or 1350 EXP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {boostWeeks > 0 && (
          <p className="text-xs text-gray-600 mt-2">
            Total: ${boostWeeks * 5} or {Math.ceil(boostWeeks * 350)} EXP • Payment after approval
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