import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Loader2, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "PC"];
const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink", 
  "Copper", "Silk Rainbow", "Marble"
];

export default function FilamentManager({ makerId }) {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("PLA");
  const [selectedColors, setSelectedColors] = useState([]);
  const [quantityPerFilament, setQuantityPerFilament] = useState(1);
  const [openToUnownedFilaments, setOpenToUnownedFilaments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFilaments();
  }, [makerId]);

  const loadFilaments = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setOpenToUnownedFilaments(user.open_to_unowned_filaments || false);
      const data = await base44.entities.Filament.filter({ maker_id: makerId });
      setFilaments(data);
    } catch (error) {
      toast({ title: "Failed to load filaments", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleColorToggle = (color) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const handleAddFilaments = async () => {
  if (selectedColors.length === 0) {
    toast({ title: "Please select at least one color", variant: "destructive" });
    return;
  }

  if (!makerId) {
    toast({ title: "Maker ID missing — please refresh and try again", variant: "destructive" });
    return;
  }

  setAdding(true);
  try {
    const createPromises = selectedColors.map(color =>
      base44.entities.Filament.create({
        maker_id: makerId,           // ← this was missing, causing the failure
        material: selectedMaterial,
        color: color,
        quantity: quantityPerFilament,
        is_available: true,
      })
    );
    await Promise.all(createPromises);
    toast({ title: `Added ${selectedColors.length} filament${selectedColors.length > 1 ? "s" : ""}!` });
    setSelectedColors([]);
    setQuantityPerFilament(1);
    await loadFilaments();
  } catch (error) {
    console.error("Filament create error:", error);
    toast({ title: "Failed to add filament", description: error.message, variant: "destructive" });
  }
  setAdding(false);
};

  const handleDelete = async (filamentId) => {
    try {
      await base44.entities.Filament.delete(filamentId);
      toast({ title: "Filament removed" });
      loadFilaments();
    } catch (error) {
      toast({ title: "Failed to delete filament", variant: "destructive" });
    }
  };

  const handleToggleUnownedFilaments = async (checked) => {
    try {
      await base44.auth.updateMe({ open_to_unowned_filaments: checked });
      setOpenToUnownedFilaments(checked);
      toast({ 
        title: checked ? "Open to ordering filaments" : "Closed to ordering filaments",
        description: checked ? "You can now receive orders even if you don't have the required filament" : "You'll only receive orders for filaments you have in stock"
      });
    } catch (error) {
      toast({ title: "Failed to update preference", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filament Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <Label htmlFor="unowned-switch" className="font-semibold cursor-pointer">
                Open to Unowned Filaments
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Accept orders even if you don't have the exact filament (you'll need to order it)
              </p>
            </div>
            <Switch
              id="unowned-switch"
              checked={openToUnownedFilaments}
              onCheckedChange={handleToggleUnownedFilaments}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filaments.map((fil) => (
              <div key={fil.id} className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{fil.material_type}</p>
                    <p className="text-sm text-gray-600">{fil.color}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(fil.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{fil.quantity_kg} kg</span>
                  <Badge className={fil.in_stock ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}>
                    {fil.in_stock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filaments.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No filaments added yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Filaments</CardTitle>
          <p className="text-sm text-gray-600">Select multiple colors to add at once</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Material Type</Label>
              <Select
                value={selectedMaterial}
                onValueChange={setSelectedMaterial}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((mat) => (
                    <SelectItem key={mat} value={mat}>
                      {mat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity per filament (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={quantityPerFilament}
                onChange={(e) => setQuantityPerFilament(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Select Colors ({selectedColors.length} selected)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg">
              {COLORS.map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <Checkbox
                    id={`color-${color}`}
                    checked={selectedColors.includes(color)}
                    onCheckedChange={() => handleColorToggle(color)}
                  />
                  <Label 
                    htmlFor={`color-${color}`} 
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {color}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedColors.length > 0 && (
                <p>Adding {selectedColors.length} filament(s) of {selectedMaterial}</p>
              )}
            </div>
            <Button 
              onClick={handleAddFilaments} 
              disabled={adding || selectedColors.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedColors.length > 0 ? `${selectedColors.length} Filament${selectedColors.length > 1 ? 's' : ''}` : 'Filaments'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}