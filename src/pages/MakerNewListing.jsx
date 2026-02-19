import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

const CATEGORIES = [
  { value: "home_decor", label: "Home Decor" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "accessories", label: "Accessories" },
  { value: "toys_and_games", label: "Toys & Games" },
  { value: "collectibles", label: "Collectibles" },
  { value: "gadgets", label: "Gadgets" },
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const COLORS = ["White", "Black", "Gray", "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink"];

export default function MakerNewListing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    category: "home_decor",
    short_description: "",
    description: "",
    wholesale_price: "",
    suggested_retail_price: "",
    moq: 20,
    lead_time_days: "",
    capacity_per_day: "",
    can_ship: true,
    local_delivery_eligible: false,
    local_delivery_radius_miles: "",
    materials: ["PLA"],
    colors: ["Black"],
    status: "draft"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser.business_roles?.includes('maker')) {
        window.location.href = createPageUrl("Home");
      }
    } catch (error) {
      window.location.href = createPageUrl("Home");
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      toast({ title: "Maximum 10 images allowed", variant: "destructive" });
      return;
    }

    const uploadedUrls = [];
    for (const file of files) {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(data.file_url);
    }

    setImages([...images, ...uploadedUrls]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleMaterial = (material) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material]
    }));
  };

  const toggleColor = (color) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const handleSubmit = async (publishNow = false) => {
    if (!formData.name || !formData.wholesale_price || !formData.lead_time_days) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    if (publishNow && images.length === 0) {
      toast({ title: "At least one image required to publish", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Product.create({
        ...formData,
        marketplace_type: 'business',
        product_type: 'print',
        seller_type: 'maker',
        seller_id: user.id,
        wholesale_price: parseFloat(formData.wholesale_price),
        suggested_retail_price: formData.suggested_retail_price ? parseFloat(formData.suggested_retail_price) : null,
        moq: parseInt(formData.moq),
        lead_time_days: parseInt(formData.lead_time_days),
        capacity_per_day: formData.capacity_per_day ? parseInt(formData.capacity_per_day) : null,
        local_delivery_radius_miles: formData.local_delivery_radius_miles ? parseInt(formData.local_delivery_radius_miles) : null,
        images,
        status: publishNow ? 'active' : 'draft'
      });

      toast({ title: publishNow ? "Listing published!" : "Draft saved!" });
      window.location.href = createPageUrl("MakerBusinessListings");
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast({ title: "Error creating listing", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Create Business Listing</h1>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-bold mb-4">Product Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Custom Widget"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <Input
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="Brief one-liner"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Full Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed product description"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div>
              <h2 className="text-xl font-bold mb-4">Photos (3-10 recommended)</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {images.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button type="button" variant="outline" asChild>
                  <span><Upload className="w-4 h-4 mr-2" />Upload Images</span>
                </Button>
              </label>
            </div>

            {/* Pricing */}
            <div>
              <h2 className="text-xl font-bold mb-4">Pricing</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wholesale Price (per unit) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Suggested Retail Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.suggested_retail_price}
                    onChange={(e) => setFormData({ ...formData, suggested_retail_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Production */}
            <div>
              <h2 className="text-xl font-bold mb-4">Production</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">MOQ (Minimum Order) *</label>
                  <Input
                    type="number"
                    value={formData.moq}
                    onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lead Time (days) *</label>
                  <Input
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity (units/day)</label>
                  <Input
                    type="number"
                    value={formData.capacity_per_day}
                    onChange={(e) => setFormData({ ...formData, capacity_per_day: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Materials & Colors */}
            <div>
              <h2 className="text-xl font-bold mb-4">Materials & Colors</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Materials</label>
                  <div className="flex flex-wrap gap-3">
                    {MATERIALS.map(mat => (
                      <label key={mat} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.materials.includes(mat)}
                          onCheckedChange={() => toggleMaterial(mat)}
                        />
                        <span>{mat}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Colors</label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map(color => (
                      <label key={color} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.colors.includes(color)}
                          onCheckedChange={() => toggleColor(color)}
                        />
                        <span>{color}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <h2 className="text-xl font-bold mb-4">Delivery Options</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.can_ship}
                    onCheckedChange={(val) => setFormData({ ...formData, can_ship: val })}
                  />
                  <span>Can ship to customers</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.local_delivery_eligible}
                    onCheckedChange={(val) => setFormData({ ...formData, local_delivery_eligible: val })}
                  />
                  <span>Local delivery available</span>
                </label>
                {formData.local_delivery_eligible && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-1">Delivery Radius (miles)</label>
                    <Input
                      type="number"
                      value={formData.local_delivery_radius_miles}
                      onChange={(e) => setFormData({ ...formData, local_delivery_radius_miles: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                variant="outline"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Publish Listing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}