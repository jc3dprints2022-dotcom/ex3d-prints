import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Smartphone, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

// Device dimensions database (all in mm)
const DEVICE_DATA = {
  phones: [
    { model: "Apple iPhone 16", width: 71.6, height: 147.6, thickness: 7.8 },
    { model: "Apple iPhone 16 Plus", width: 77.8, height: 160.9, thickness: 7.8 },
    { model: "Apple iPhone 16 Pro", width: 71.5, height: 149.6, thickness: 8.25 },
    { model: "Apple iPhone 16 Pro Max", width: 77.6, height: 163.0, thickness: 8.25 },
    { model: "Apple iPhone 15", width: 71.6, height: 147.6, thickness: 7.8 },
    { model: "Apple iPhone 15 Plus", width: 77.8, height: 160.9, thickness: 7.8 },
    { model: "Apple iPhone 15 Pro", width: 70.6, height: 146.6, thickness: 8.25 },
    { model: "Apple iPhone 15 Pro Max", width: 76.7, height: 159.9, thickness: 8.25 },
    { model: "Apple iPhone 14", width: 71.5, height: 146.7, thickness: 7.8 },
    { model: "Apple iPhone 14 Plus", width: 78.1, height: 160.8, thickness: 7.8 },
    { model: "Apple iPhone 14 Pro", width: 71.5, height: 147.5, thickness: 7.85 },
    { model: "Apple iPhone 14 Pro Max", width: 77.6, height: 160.7, thickness: 7.85 },
    { model: "Apple iPhone 13", width: 71.5, height: 146.7, thickness: 7.65 },
    { model: "Apple iPhone 13 mini", width: 64.2, height: 131.5, thickness: 7.65 },
    { model: "Apple iPhone SE (3rd gen)", width: 67.3, height: 138.4, thickness: 7.3 },
    { model: "Samsung Galaxy S25 Ultra", width: 77.6, height: 162.3, thickness: 8.6 },
    { model: "Samsung Galaxy S25", width: 71.0, height: 146.9, thickness: 7.2 },
    { model: "Samsung Galaxy S25+", width: 75.8, height: 158.9, thickness: 7.3 },
    { model: "Samsung Galaxy S24 Ultra", width: 79.0, height: 162.3, thickness: 8.6 },
    { model: "Samsung Galaxy S24", width: 70.6, height: 147.0, thickness: 7.6 },
    { model: "Samsung Galaxy S24+", width: 75.9, height: 158.5, thickness: 7.7 },
    { model: "Samsung Galaxy S23 Ultra", width: 78.1, height: 163.4, thickness: 8.9 },
    { model: "Samsung Galaxy S23", width: 70.9, height: 146.3, thickness: 7.6 },
    { model: "Samsung Galaxy S23+", width: 76.2, height: 157.8, thickness: 7.6 },
    { model: "Samsung Galaxy A16 5G", width: 77.9, height: 164.4, thickness: 7.9 },
    { model: "Samsung Galaxy A56", width: 77.4, height: 161.1, thickness: 7.9 },
    { model: "Google Pixel 9", width: 72.0, height: 152.8, thickness: 8.5 },
    { model: "Google Pixel 9a", width: 73.0, height: 154.0, thickness: 8.9 },
    { model: "Google Pixel 8", width: 70.8, height: 150.5, thickness: 8.9 },
    { model: "Google Pixel 8a", width: 72.7, height: 152.1, thickness: 8.9 },
    { model: "Google Pixel 7a", width: 72.9, height: 152.0, thickness: 9.0 },
    { model: "OnePlus 13", width: 76.5, height: 162.9, thickness: 8.5 },
    { model: "Motorola Moto G (recent gen)", width: 74.0, height: 161.0, thickness: 8.5 }
  ],
  laptops: [
    { model: "Apple MacBook Air 13-inch (M4, 2025)", width: 304.1, depth: 215.0, thickness: 11.3 },
    { model: "Apple MacBook Air 15-inch (M4)", width: 340.4, depth: 237.4, thickness: 11.5 },
    { model: "Apple MacBook Pro 14-inch (M4/M5)", width: 312.6, depth: 221.2, thickness: 15.5 },
    { model: "Apple MacBook Pro 16-inch (M4/M5)", width: 355.7, depth: 248.1, thickness: 16.8 },
    { model: "Dell XPS 13", width: 295.4, depth: 199.0, thickness: 15.3 },
    { model: "Dell XPS 14 Plus / 14", width: 315.0, depth: 227.0, thickness: 18.0 },
    { model: "Dell XPS 15", width: 344.7, depth: 230.1, thickness: 18.0 },
    { model: "Dell Precision 5690", width: 357.8, depth: 251.9, thickness: 20.5 },
    { model: "HP EliteBook Ultra G1i", width: 307.9, depth: 219.9, thickness: 14.5 },
    { model: "HP Spectre x360 14", width: 298.5, depth: 220.5, thickness: 16.5 },
    { model: "HP Omen / Omen Transcend (recent gen)", width: 357.0, depth: 260.0, thickness: 22.9 },
    { model: "Lenovo ThinkPad X1 Carbon Gen 13", width: 315.6, depth: 222.5, thickness: 14.95 },
    { model: "Lenovo ThinkPad X9 14 Aura", width: 312.0, depth: 218.0, thickness: 13.5 },
    { model: "Lenovo Yoga 9i 14", width: 313.0, depth: 226.0, thickness: 15.3 },
    { model: "Lenovo IdeaPad Slim 5", width: 312.4, depth: 221.4, thickness: 16.9 },
    { model: "Lenovo Legion Pro 7i / 7i Gen 9", width: 362.5, depth: 260.4, thickness: 21.95 },
    { model: "Asus Zenbook 14 OLED", width: 310.0, depth: 220.0, thickness: 14.9 },
    { model: "Asus ProArt PX13 / P16", width: 299.0, depth: 209.0, thickness: 17.5 },
    { model: "Asus ROG Zephyrus (recent gen)", width: 354.0, depth: 246.0, thickness: 19.9 },
    { model: "Acer Aspire 3 (A315 series)", width: 362.3, depth: 238.5, thickness: 19.9 },
    { model: "Acer Swift 14 / Swift 14 AI", width: 312.9, depth: 217.9, thickness: 14.9 },
    { model: "Acer Nitro V 15", width: 362.3, depth: 255.0, thickness: 22.9 },
    { model: "Razer Blade 16 (recent gen)", width: 355.0, depth: 244.0, thickness: 21.99 },
    { model: "Microsoft Surface Laptop 7", width: 301.0, depth: 220.0, thickness: 17.5 },
    { model: "Acer Chromebook Plus 514 / Spin 714", width: 314.0, depth: 221.0, thickness: 17.9 }
  ]
};

export default function DeviceSelector({ deviceType, selectedModel, selectedDimensions, onChange }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customDims, setCustomDims] = useState({
    width: "",
    height: "",
    depth: "",
    thickness: ""
  });

  const devices = deviceType === "phone" ? DEVICE_DATA.phones : DEVICE_DATA.laptops;
  const isPhone = deviceType === "phone";

  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    return devices.filter(device =>
      device.model.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, devices]);

  const handleDeviceSelect = (device) => {
    if (device === "custom") {
      setCustomMode(true);
      onChange({ model: "Custom / Not listed", dimensions: null });
    } else {
      setCustomMode(false);
      setCustomDims({ width: "", height: "", depth: "", thickness: "" });
      onChange({
        model: device.model,
        dimensions: isPhone
          ? { width: device.width, height: device.height, thickness: device.thickness }
          : { width: device.width, depth: device.depth, thickness: device.thickness }
      });
    }
    setOpen(false);
  };

  const handleCustomDimensionsChange = (field, value) => {
    const numValue = parseFloat(value) || "";
    const updated = { ...customDims, [field]: numValue };
    setCustomDims(updated);

    if (updated.width && updated.thickness && (isPhone ? updated.height : updated.depth)) {
      onChange({
        model: "Custom / Not listed",
        dimensions: isPhone
          ? { width: parseFloat(updated.width), height: parseFloat(updated.height), thickness: parseFloat(updated.thickness) }
          : { width: parseFloat(updated.width), depth: parseFloat(updated.depth), thickness: parseFloat(updated.thickness) }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2">
          {isPhone ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
          Select your {deviceType} *
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between mt-1"
            >
              {selectedModel || `Select ${deviceType} model...`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder={`Search ${deviceType} models...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No {deviceType} found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="custom"
                    onSelect={() => handleDeviceSelect("custom")}
                    className="font-semibold text-teal-600"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedModel === "Custom / Not listed" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Custom / Not listed
                  </CommandItem>
                  {filteredDevices.map((device) => (
                    <CommandItem
                      key={device.model}
                      value={device.model}
                      onSelect={() => handleDeviceSelect(device)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModel === device.model ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {device.model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {customMode && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm font-semibold text-blue-900">Enter custom {deviceType} dimensions (mm)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="custom-width" className="text-xs">Width (mm) *</Label>
              <Input
                id="custom-width"
                type="number"
                step="0.1"
                value={customDims.width}
                onChange={(e) => handleCustomDimensionsChange("width", e.target.value)}
                placeholder="71.6"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`custom-${isPhone ? 'height' : 'depth'}`} className="text-xs">
                {isPhone ? 'Height' : 'Depth'} (mm) *
              </Label>
              <Input
                id={`custom-${isPhone ? 'height' : 'depth'}`}
                type="number"
                step="0.1"
                value={isPhone ? customDims.height : customDims.depth}
                onChange={(e) => handleCustomDimensionsChange(isPhone ? "height" : "depth", e.target.value)}
                placeholder={isPhone ? "147.6" : "215"}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="custom-thickness" className="text-xs">Thickness (mm) *</Label>
              <Input
                id="custom-thickness"
                type="number"
                step="0.1"
                value={customDims.thickness}
                onChange={(e) => handleCustomDimensionsChange("thickness", e.target.value)}
                placeholder="7.8"
                required
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-blue-700">
            💡 Measure your device or check manufacturer specs for accurate dimensions
          </p>
        </div>
      )}

      {selectedDimensions && !customMode && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-semibold text-green-900 mb-1">Auto-detected dimensions:</p>
          <div className="text-xs text-green-800">
            {isPhone ? (
              <>Width: {selectedDimensions.width}mm • Height: {selectedDimensions.height}mm • Thickness: {selectedDimensions.thickness}mm</>
            ) : (
              <>Width: {selectedDimensions.width}mm • Depth: {selectedDimensions.depth}mm • Thickness: {selectedDimensions.thickness}mm</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}