import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Globe, Edit2, CheckCircle } from "lucide-react";

// Common countries for international shipping
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "IL", name: "Israel" },
  { code: "ZA", name: "South Africa" },
];

export default function ShippingAddressEditor({ order, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addr, setAddr] = useState({
    name: order.shipping_address?.name || "",
    phone: order.shipping_address?.phone || "",
    street: order.shipping_address?.street || "",
    street2: order.shipping_address?.street2 || "",
    city: order.shipping_address?.city || "",
    state: order.shipping_address?.state || "",
    zip: order.shipping_address?.zip || "",
    country: order.shipping_address?.country || "US",
    country_name: order.shipping_address?.country_name || "United States",
  });
  const { toast } = useToast();

  const handleCountryChange = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    setAddr(p => ({ ...p, country: code, country_name: country?.name || code }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Order.update(order.id, {
        shipping_address: addr,
        is_international: addr.country !== "US",
      });
      toast({ title: "Shipping address updated!" });
      setEditing(false);
      if (onSaved) onSaved();
    } catch (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (!editing) {
    const a = order.shipping_address;
    return (
      <div className="text-sm space-y-1">
        <p className="text-white">{a.name}</p>
        <p className="text-slate-300">{a.street}{a.street2 ? `, ${a.street2}` : ""}</p>
        <p className="text-slate-300">{a.city}{a.state ? `, ${a.state}` : ""} {a.zip}</p>
        {a.country && a.country !== "US" && (
          <p className="text-yellow-400 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {a.country_name || a.country} ({a.country})
          </p>
        )}
        {a.phone && <p className="text-slate-400">{a.phone}</p>}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="mt-2 border-slate-600 text-slate-300">
          <Edit2 className="w-3 h-3 mr-1" /> Edit Address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-2">
        <Globe className="w-4 h-4" /> Edit Shipping Address (supports international)
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-slate-300 text-xs">Country</Label>
          <Select value={addr.country} onValueChange={handleCountryChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
              {COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code} className="text-white">
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Full Name</Label>
          <Input value={addr.name} onChange={e => setAddr(p => ({ ...p, name: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Phone</Label>
          <Input value={addr.phone} onChange={e => setAddr(p => ({ ...p, phone: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-slate-300 text-xs">Street Address</Label>
          <Input value={addr.street} onChange={e => setAddr(p => ({ ...p, street: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-slate-300 text-xs">Street Line 2 (optional)</Label>
          <Input value={addr.street2} onChange={e => setAddr(p => ({ ...p, street2: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" placeholder="Apt, suite, unit, etc." />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">City</Label>
          <Input value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">{addr.country === "US" ? "State" : "Province / Region"}</Label>
          <Input value={addr.state} onChange={e => setAddr(p => ({ ...p, state: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">{addr.country === "US" ? "ZIP Code" : "Postal Code"}</Label>
          <Input value={addr.zip} onChange={e => setAddr(p => ({ ...p, zip: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
        </div>
      </div>
      {addr.country !== "US" && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 text-yellow-300 text-xs">
          🌍 International shipping label will be generated via Shippo with carrier options for {addr.country_name}.
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><CheckCircle className="w-4 h-4 mr-1" />Save Address</>}
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)} className="border-slate-600 text-slate-300">Cancel</Button>
      </div>
    </div>
  );
}