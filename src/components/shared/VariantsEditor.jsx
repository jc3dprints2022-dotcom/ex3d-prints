import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";

/**
 * VariantsEditor
 * Props:
 *   variants: array of { type: string, same_price: bool, base_price: number, options: [{name, price}] }
 *   onChange: (variants) => void
 *   dark: bool - dark mode styling (admin command center)
 */
export default function VariantsEditor({ variants = [], onChange, dark = false }) {
  const text = dark ? "text-white" : "text-gray-900";
  const inputCls = dark
    ? "bg-slate-800 border-cyan-500/30 text-white"
    : "bg-white border-gray-300 text-gray-900";
  const subText = dark ? "text-gray-400" : "text-gray-500";
  const borderCls = dark ? "border-slate-600" : "border-gray-200";

  const addVariantType = () => {
    onChange([...variants, { type: "", same_price: true, base_price: "", options: [{ name: "", price: "" }] }]);
  };

  const removeVariantType = (vi) => {
    onChange(variants.filter((_, i) => i !== vi));
  };

  const updateVariantType = (vi, field, value) => {
    const updated = variants.map((v, i) => {
      if (i !== vi) return v;
      const newV = { ...v, [field]: value };
      // When toggling same_price on, sync all option prices to base_price
      if (field === "same_price" && value === true) {
        newV.options = newV.options.map(o => ({ ...o, price: newV.base_price }));
      }
      return newV;
    });
    onChange(updated);
  };

  const updateBasePrice = (vi, price) => {
    const updated = variants.map((v, i) => {
      if (i !== vi) return v;
      const newV = { ...v, base_price: price };
      if (v.same_price) {
        newV.options = v.options.map(o => ({ ...o, price }));
      }
      return newV;
    });
    onChange(updated);
  };

  const addOption = (vi) => {
    const updated = variants.map((v, i) => {
      if (i !== vi) return v;
      return { ...v, options: [...v.options, { name: "", price: v.same_price ? v.base_price : "" }] };
    });
    onChange(updated);
  };

  const removeOption = (vi, oi) => {
    const updated = variants.map((v, i) => {
      if (i !== vi) return v;
      return { ...v, options: v.options.filter((_, j) => j !== oi) };
    });
    onChange(updated);
  };

  const updateOption = (vi, oi, field, value) => {
    const updated = variants.map((v, i) => {
      if (i !== vi) return v;
      return {
        ...v,
        options: v.options.map((o, j) => j === oi ? { ...o, [field]: value } : o)
      };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {variants.map((variant, vi) => (
        <div key={vi} className={`p-4 rounded-lg border ${borderCls} space-y-3`}>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label className={`text-xs ${subText}`}>Variant Type (e.g. Size, Color, Material)</Label>
              <Input
                value={variant.type}
                onChange={(e) => updateVariantType(vi, "type", e.target.value)}
                placeholder="e.g. Size"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="mt-5 flex-shrink-0"
              onClick={() => removeVariantType(vi)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Same price toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`same-price-${vi}`}
              checked={variant.same_price}
              onCheckedChange={(checked) => updateVariantType(vi, "same_price", checked)}
            />
            <Label htmlFor={`same-price-${vi}`} className={`text-sm cursor-pointer ${text}`}>
              All options have the same price
            </Label>
          </div>

          {variant.same_price && (
            <div>
              <Label className={`text-xs ${subText}`}>Price for all options ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={variant.base_price}
                onChange={(e) => updateBasePrice(vi, e.target.value)}
                placeholder="0.00"
                className={`mt-1 w-40 ${inputCls}`}
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            <Label className={`text-xs ${subText}`}>Options</Label>
            {variant.options.map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <Input
                  value={option.name}
                  onChange={(e) => updateOption(vi, oi, "name", e.target.value)}
                  placeholder="Option name (e.g. Small)"
                  className={`flex-1 ${inputCls}`}
                />
                {!variant.same_price && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={option.price}
                    onChange={(e) => updateOption(vi, oi, "price", e.target.value)}
                    placeholder="Price"
                    className={`w-28 ${inputCls}`}
                  />
                )}
                {!variant.same_price && (
                  <span className={`text-xs ${subText} w-4`}>$</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(vi, oi)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addOption(vi)}
              className={dark ? "border-cyan-500/40 text-cyan-400 hover:bg-slate-700" : ""}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addVariantType}
        className={dark ? "border-cyan-500/40 text-cyan-400 hover:bg-slate-700" : ""}
      >
        <Plus className="w-4 h-4 mr-2" /> Add Variant Type
      </Button>
    </div>
  );
}