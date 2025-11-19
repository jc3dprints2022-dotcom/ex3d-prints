import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

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
  { value: "thanksgiving", label: "Thanksgiving"},
  { value: "christmas", label: "Christmas"},
  { value: "holidays", label: "Holidays"},
  { value: "misc", label: "Misc" }
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"];

export default function FilterSidebar({ filters, onFilterChange }) {
  const handleCategoryToggle = (category) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handleMaterialToggle = (material) => {
    const newMaterials = filters.materials.includes(material)
      ? filters.materials.filter(m => m !== material)
      : [...filters.materials, material];
    onFilterChange({ ...filters, materials: newMaterials });
  };

  const handlePriceChange = (values) => {
    onFilterChange({ 
      ...filters, 
      priceRange: { min: values[0], max: values[1] }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${cat.value}`}
                checked={filters.categories.includes(cat.value)}
                onCheckedChange={() => handleCategoryToggle(cat.value)}
              />
              <Label htmlFor={`cat-${cat.value}`} className="cursor-pointer text-sm">
                {cat.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MATERIALS.map(material => (
            <div key={material} className="flex items-center space-x-2">
              <Checkbox
                id={`mat-${material}`}
                checked={filters.materials.includes(material)}
                onCheckedChange={() => handleMaterialToggle(material)}
              />
              <Label htmlFor={`mat-${material}`} className="cursor-pointer text-sm">
                {material}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Slider
              value={[filters.priceRange.min, filters.priceRange.max]}
              onValueChange={handlePriceChange}
              min={0}
              max={200}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>${filters.priceRange.min}</span>
              <span>${filters.priceRange.max}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {(filters.categories.length > 0 || filters.materials.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filters.categories.map(cat => {
                const category = CATEGORIES.find(c => c.value === cat);
                return (
                  <Badge key={cat} variant="secondary" className="cursor-pointer" onClick={() => handleCategoryToggle(cat)}>
                    {category?.label} ×
                  </Badge>
                );
              })}
              {filters.materials.map(mat => (
                <Badge key={mat} variant="secondary" className="cursor-pointer" onClick={() => handleMaterialToggle(mat)}>
                  {mat} ×
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}