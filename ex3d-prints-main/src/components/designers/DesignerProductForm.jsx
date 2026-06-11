import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, Crop, Link, Sparkles } from "lucide-react";
import AgreementModal from "@/components/shared/AgreementModal";
import { useToast } from "@/components/ui/use-toast";
import ImageCropEditor from "../shared/ImageCropEditor";

const CATEGORIES = [
  { value: "kit_cards", label: "Kit Cards" },
  { value: "rocket_models", label: "Rocket Models" },
  { value: "halloween", label: "Halloween" },
  { value: "easter", label: "Easter" },
  { value: "april_fools", label: "April Fools" },
  { value: "independence_day", label: "Independence Day" },
  { value: "thanksgiving", label: "Thanksgiving" },
  { value: "christmas", label: "Christmas" },
  { value: "valentines_day", label: "Valentine's Day" },
  { value: "dorm_essentials", label: "Dorm Essentials" },
  { value: "desk", label: "Desk" },
  { value: "art", label: "Art" },
  { value: "gadgets", label: "Gadgets" },
  { value: "toys_and_games", label: "Toys & Games" },
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink",
  "Copper", "Bronze", "Silk Rainbow", "Marble",
];

export default function DesignerProductForm({ designerId, designerName, existingProduct, onSuccess, onCancel, currentUser }) {
  const [licenseVerified, setLicenseVerified] = useState(!!existingProduct);
  const [saving, setSaving] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [currentCropImage, setCurrentCropImage] = useState({ url: "", index: -1 });
  const { toast } = useToast();

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    if (!importUrl.includes('thingiverse.com')) {
      toast({ title: "Only Thingiverse URLs are supported", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await base44.functions.invoke('importFromThingiverse', { url: importUrl.trim() });
      const data = res?.data?.data;
      if (!data) throw new Error('No data returned');
      setFormData(prev => ({
        ...prev,
        name: data.title || prev.name,
        description: data.description || prev.description,
        images: data.images?.length ? data.images : prev.images,
        print_files: data.print_files?.length ? data.print_files : prev.print_files,
      }));
      setImportUrl('');
      toast({ title: "Design imported!", description: `Pulled "${data.title}" from Thingiverse. Review and fill in the remaining fields.` });
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
  };

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
          listing_type_physical: existingProduct.availability_type !== 'digital',
          listing_type_digital: existingProduct.availability_type === 'digital' || existingProduct.availability_type === 'both',
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
          materials: ['PLA'],
          colors: [...COLORS],
          listing_type_physical: true,
          listing_type_digital: false,
        }
  );

  const isVideoUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogg');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB to accommodate videos
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);

    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Some files exceed 100MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
    }

    const filesToUpload = files.filter(file => file.size <= MAX_SIZE);
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

      toast({ title: `${filesToUpload.length} file(s) uploaded successfully` });
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

    setSaving(true);
    try {
      // Derive availability_type from checkboxes
      let availabilityType = 'physical';
      if (formData.listing_type_physical && formData.listing_type_digital) availabilityType = 'both';
      else if (formData.listing_type_digital) availabilityType = 'digital';
      else availabilityType = 'physical';

      const productData = {
        name: formData.name,
        description: formData.description,
        price: calculatedPrice,
        print_time_hours: parseFloat(formData.print_time_hours),
        weight_grams: parseFloat(formData.weight_grams),
        category: formData.category,
        materials: ['PLA'],
        colors: ALL_COLORS,
        variants: [],
        tags: [],
        images: formData.images,
        print_files: formData.print_files,
        assembly_instructions: formData.assembly_instructions,
        designer_id: designerId,
        designer_name: designerName,
        designer_user_id: currentUser?.id || null,
        status: 'pending',
        availability_type: availabilityType,
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
      };

      if (existingProduct) {
        // For updates, preserve original designer ownership
        const preservedDesignerFields = {
          designer_id: existingProduct.designer_id || designerId,
          designer_name: existingProduct.designer_name || designerName,
          designer_user_id: existingProduct.designer_user_id,
        };
        await base44.entities.Product.update(existingProduct.id, {
          ...productData,
          ...preservedDesignerFields,
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

      {/* URL Import */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Import from Thingiverse
        </p>
        <p className="text-xs text-blue-600">Paste a Thingiverse link to auto-fill name, description, images, and 3D files.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <Input
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="https://www.thingiverse.com/thing:..."
              className="pl-9"
              disabled={importing}
            />
          </div>
          <Button type="button" onClick={handleImportUrl} disabled={importing || !importUrl.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
          </Button>
        </div>
      </div>

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

      <div className="grid md:grid-cols-2 gap-4">
        {/* Product Images */}
        <div>
          <Label htmlFor="images">Product Images & Videos *</Label>
          <p className="text-xs text-gray-500 mb-1">Upload images (JPG, PNG, etc.) or videos (MP4, MOV, WebM). Videos will play in the product carousel.</p>
          <Input
            id="images"
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,video/ogg"
            multiple
            onChange={handleImageUpload}
            disabled={saving}
            className="mb-2"
          />
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  {isVideoUrl(img) ? (
                    <div className="w-full h-24 rounded border bg-gray-900 flex items-center justify-center relative overflow-hidden">
                      <video src={img} className="w-full h-full object-contain" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded">VIDEO</span>
                      </div>
                    </div>
                  ) : (
                    <img src={img} alt={`Product ${idx + 1}`} className="w-full h-24 object-contain rounded border cursor-pointer bg-gray-50" onClick={() => handleOpenCropEditor(img, idx)} />
                  )}
                  {!isVideoUrl(img) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleOpenCropEditor(img, idx); }}
                    >
                      <Crop className="w-3 h-3" />
                    </Button>
                  )}
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

        {/* 3D Model Files */}
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
          {formData.print_files.length > 0 && (
            <div className="space-y-2 mt-2">
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
      </div>

      {/* Listing Type */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Listing Type *</p>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="type_physical"
              checked={formData.listing_type_physical}
              onCheckedChange={(checked) => setFormData({ ...formData, listing_type_physical: !!checked })}
            />
            <Label htmlFor="type_physical" className="cursor-pointer text-sm">
              Physical Product <span className="text-xs text-gray-500">(routed to makers)</span>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="type_digital"
              checked={formData.listing_type_digital}
              onCheckedChange={(checked) => setFormData({ ...formData, listing_type_digital: !!checked })}
            />
            <Label htmlFor="type_digital" className="cursor-pointer text-sm">
              Digital File <span className="text-xs text-gray-500">(instant download)</span>
            </Label>
          </div>
        </div>
        {formData.listing_type_physical && formData.listing_type_digital && (
          <p className="text-xs text-blue-600">Both selected — listing will offer physical print AND digital download.</p>
        )}
      </div>

      <AgreementModal type="designer" open={agreementOpen} onClose={() => setAgreementOpen(false)} />
      <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
        <Checkbox
          id="license_verified"
          checked={licenseVerified}
          onCheckedChange={(checked) => setLicenseVerified(!!checked)}
          required
        />
        <Label htmlFor="license_verified" className="text-sm font-bold cursor-pointer leading-relaxed">
          * I agree to the{' '}
          <button
            type="button"
            onClick={() => setAgreementOpen(true)}
            className="text-blue-600 hover:text-blue-700 underline font-bold"
          >
            Designer Agreement
          </button>{' '}and verify I have the full right to sell this design (REQUIRED)
        </Label>
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