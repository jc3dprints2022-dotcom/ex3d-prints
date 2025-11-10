import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MATERIAL_TYPES = ["PLA", "PETG", "ABS", "Carbon Fiber", "Nylon", "TPU"];

export default function AddPrinterForm({ printer, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    print_volume: { length: '', width: '', height: '' },
    supported_materials: [],
    multi_color_capable: false,
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (printer) {
      setFormData({
        name: printer.name || '',
        brand: printer.brand || '',
        model: printer.model || '',
        print_volume: printer.print_volume || { length: '', width: '', height: '' },
        supported_materials: printer.supported_materials || [],
        multi_color_capable: printer.multi_color_capable || false,
        status: printer.status || 'active'
      });
    }
  }, [printer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const user = await base44.auth.me();
      
      const printerData = {
        maker_id: user.maker_id,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        print_volume: {
          length: parseFloat(formData.print_volume.length),
          width: parseFloat(formData.print_volume.width),
          height: parseFloat(formData.print_volume.height)
        },
        supported_materials: formData.supported_materials,
        multi_color_capable: formData.multi_color_capable,
        status: formData.status
      };

      if (printer) {
        await base44.entities.Printer.update(printer.id, printerData);
        toast({ title: "Printer updated successfully!" });
      } else {
        await base44.entities.Printer.create(printerData);
        toast({ title: "Printer added successfully!" });
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
    } catch (error) {
      console.error("Error saving printer:", error);
      toast({ 
        title: printer ? "Failed to update printer" : "Failed to add printer", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Printer Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., My Ender 3"
            required
          />
        </div>
        <div>
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({...formData, brand: e.target.value})}
            placeholder="e.g., Creality"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="model">Model *</Label>
        <Input
          id="model"
          value={formData.model}
          onChange={(e) => setFormData({...formData, model: e.target.value})}
          placeholder="e.g., Ender 3 V2"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="length">Build Volume (mm) *</Label>
          <Input
            id="length"
            type="number"
            placeholder="Length"
            value={formData.print_volume.length}
            onChange={(e) => setFormData({...formData, print_volume: {...formData.print_volume, length: e.target.value}})}
            required
          />
        </div>
        <div>
          <Label htmlFor="width">&nbsp;</Label>
          <Input
            id="width"
            type="number"
            placeholder="Width"
            value={formData.print_volume.width}
            onChange={(e) => setFormData({...formData, print_volume: {...formData.print_volume, width: e.target.value}})}
            required
          />
        </div>
        <div>
          <Label htmlFor="height">&nbsp;</Label>
          <Input
            id="height"
            type="number"
            placeholder="Height"
            value={formData.print_volume.height}
            onChange={(e) => setFormData({...formData, print_volume: {...formData.print_volume, height: e.target.value}})}
            required
          />
        </div>
      </div>

      <div>
        <Label>Supported Materials *</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {MATERIAL_TYPES.map(material => (
            <div key={material} className="flex items-center space-x-2">
              <Checkbox
                id={`material-${material}`}
                checked={formData.supported_materials.includes(material)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({...prev, supported_materials: [...prev.supported_materials, material]}));
                  } else {
                    setFormData(prev => ({...prev, supported_materials: prev.supported_materials.filter(m => m !== material)}));
                  }
                }}
              />
              <Label htmlFor={`material-${material}`} className="text-sm font-normal cursor-pointer">{material}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Printer Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <Checkbox
          id="multi_color"
          checked={formData.multi_color_capable}
          onCheckedChange={(checked) => setFormData(prev => ({...prev, multi_color_capable: checked}))}
        />
        <Label htmlFor="multi_color" className="text-sm font-medium cursor-pointer">
          This printer can do multi-color prints
        </Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {printer ? 'Update Printer' : 'Add Printer'}
        </Button>
      </div>
    </form>
  );
}