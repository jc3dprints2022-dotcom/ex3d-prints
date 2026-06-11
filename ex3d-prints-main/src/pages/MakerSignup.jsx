import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, CheckCircle, Loader2, Plus, Trash2, Info, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AgreementModal from "@/components/shared/AgreementModal";

const PRINTER_MATERIALS = ["PLA", "PETG", "ABS", "TPU"];
const FILAMENT_COLORS = [
  "White", "Black", "Gray", "Silver", "Red", "Blue", "Yellow",
  "Green", "Orange", "Purple", "Pink", "Brown", "Gold", "Copper", "Silk Rainbow", "Marble",
];

const FILAMENT_MATERIALS = ["PLA", "PETG", "ABS", "TPU", "PC"];

const emptyPrinter = () => ({
  name: "", brand: "", model: "",
  print_volume: { length: "", width: "", height: "" },
  supported_materials: [], multi_color_capable: false,
});

export default function MakerSignup() {
  const [user, setUser] = useState(null);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [formState, setFormState] = useState('form');
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '',
    experience_level: '', weekly_capacity: '',
    street: '', city: '', state: '', zip: '',
    agree_terms: false,
  });
  const [printers, setPrinters] = useState([emptyPrinter()]);
  // filaments stored as { material_type, colors: [], quantity_kg }
  const [filamentRows, setFilamentRows] = useState([{ material_type: 'PLA', colors: [], quantity_kg: '1' }]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.business_roles?.includes('maker')) {
          window.location.href = createPageUrl("ConsumerDashboard") + "?tab=maker";
          return;
        }
        if (currentUser.maker_application_id) {
          try {
            const app = await base44.entities.MakerApplication.get(currentUser.maker_application_id);
            if (app) {
              setFormData(prev => ({
                ...prev,
                full_name: currentUser.full_name || '',
                email: currentUser.email || '',
                phone: app.phone || '',
                experience_level: app.experience_level || '',
                weekly_capacity: app.weekly_capacity ? String(app.weekly_capacity) : '',
                street: app.campus_location?.split('|')[0] || '',
                city: app.campus_location?.split('|')[1] || '',
                state: app.campus_location?.split('|')[2] || '',
                zip: app.campus_location?.split('|')[3] || '',
              }));
              if (app.printers?.length > 0) setPrinters(app.printers);
              if (app.filaments?.length > 0) {
                // Group filaments by material_type for display
                const grouped = {};
                app.filaments.forEach(f => {
                  if (!grouped[f.material_type]) grouped[f.material_type] = { material_type: f.material_type, colors: [], quantity_kg: String(f.quantity_kg || 1) };
                  if (f.color) grouped[f.material_type].colors.push(f.color);
                });
                setFilamentRows(Object.values(grouped));
              }
              if (app.status === 'rejected') setFormState('rejected_maker');
              else if (app.status === 'pending') setFormState('submitted');
            }
          } catch {
            await base44.auth.updateMe({ maker_application_id: null });
            setFormData(prev => ({ ...prev, full_name: currentUser.full_name || '', email: currentUser.email || '' }));
          }
        } else {
          setFormData(prev => ({ ...prev, full_name: currentUser.full_name || '', email: currentUser.email || '' }));
        }
      } catch {
        await base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setLoading(false);
    };
    init();
  }, []);

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // --- Printer helpers ---
  const updatePrinter = (idx, field, value) => {
    setPrinters(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const updatePrinterVolume = (idx, dim, value) => {
    setPrinters(prev => prev.map((p, i) => i === idx ? { ...p, print_volume: { ...p.print_volume, [dim]: value } } : p));
  };
  const togglePrinterMaterial = (idx, mat) => {
    setPrinters(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const mats = p.supported_materials.includes(mat)
        ? p.supported_materials.filter(m => m !== mat)
        : [...p.supported_materials, mat];
      return { ...p, supported_materials: mats };
    }));
  };
  const addPrinter = () => setPrinters(prev => [...prev, emptyPrinter()]);
  const removePrinter = (idx) => setPrinters(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  // --- Filament row helpers ---
  const updateFilamentRow = (idx, field, value) => {
    setFilamentRows(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };
  const toggleFilamentRowColor = (idx, color) => {
    setFilamentRows(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const colors = f.colors.includes(color) ? f.colors.filter(c => c !== color) : [...f.colors, color];
      return { ...f, colors };
    }));
  };
  const addFilamentRow = () => setFilamentRows(prev => [...prev, { material_type: 'PLA', colors: [], quantity_kg: '1' }]);
  const removeFilamentRow = (idx) => setFilamentRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree_terms) { toast({ title: "Please agree to the terms", variant: "destructive" }); return; }
    if (!formData.experience_level) { toast({ title: "Experience Level required", variant: "destructive" }); return; }
    if (!formData.weekly_capacity || parseInt(formData.weekly_capacity) < 1) { toast({ title: "Weekly hours required", variant: "destructive" }); return; }
    if (!formData.street || !formData.city || !formData.state || !formData.zip) { toast({ title: "Complete address required", variant: "destructive" }); return; }

    // Validate printers
    for (let i = 0; i < printers.length; i++) {
      const p = printers[i];
      if (!p.model.trim()) { toast({ title: `Printer ${i + 1}: model required`, variant: "destructive" }); return; }
      if (p.supported_materials.length === 0) { toast({ title: `Printer ${i + 1}: select at least one material`, variant: "destructive" }); return; }
    }

    // Validate filament rows
    for (let i = 0; i < filamentRows.length; i++) {
      const f = filamentRows[i];
      if (f.colors.length === 0) { toast({ title: `Filament row ${i + 1}: select at least one color`, variant: "destructive" }); return; }
      if (!f.quantity_kg || parseFloat(f.quantity_kg) <= 0) { toast({ title: `Filament row ${i + 1}: quantity required`, variant: "destructive" }); return; }
    }

    // Expand filament rows into individual filament entries
    const expandedFilaments = filamentRows.flatMap(row =>
      row.colors.map(color => ({
        material_type: row.material_type,
        color,
        quantity_kg: parseFloat(row.quantity_kg),
      }))
    );

    setFormState('submitting');
    try {
      const fullAddress = `${formData.street}|${formData.city}|${formData.state}|${formData.zip}`;
      const applicationData = {
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        experience_level: formData.experience_level,
        weekly_capacity: parseInt(formData.weekly_capacity),
        campus_location: fullAddress,
        materials: [...new Set(expandedFilaments.map(f => f.material_type))],
        printers: printers.map(p => ({
          ...p,
          name: p.name || p.model,
          print_volume: {
            length: parseFloat(p.print_volume.length) || 0,
            width: parseFloat(p.print_volume.width) || 0,
            height: parseFloat(p.print_volume.height) || 0,
          },
        })),
        filaments: expandedFilaments,
        status: 'pending',
      };

      let app;
      if (user.maker_application_id && formState === 'rejected_maker') {
        app = await base44.entities.MakerApplication.update(user.maker_application_id, { ...applicationData, status: 'pending' });
      } else {
        app = await base44.entities.MakerApplication.create(applicationData);
        await base44.auth.updateMe({
          maker_application_id: app.id,
          address: { street: formData.street, city: formData.city, state: formData.state, zip: formData.zip },
          phone: formData.phone,
        });
      }

      // Notify admin
      await base44.functions.invoke('sendEmail', {
        to: 'jc3dprints2022@gmail.com',
        subject: 'New Maker Application - EX3D Prints',
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h1 style="color:#f97316;">New Maker Application</h1>
<p><strong>Name:</strong> ${formData.full_name}</p>
<p><strong>Email:</strong> ${formData.email}</p>
<p><strong>Phone:</strong> ${formData.phone}</p>
<p><strong>Address:</strong> ${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}</p>
<p><strong>Experience:</strong> ${formData.experience_level}</p>
<p><strong>Weekly Capacity:</strong> ${formData.weekly_capacity} hours</p>
<p><strong>Printers:</strong> ${printers.map(p => p.model).join(', ')}</p>
<p><strong>Filaments:</strong> ${expandedFilaments.map(f => `${f.material_type} ${f.color}`).join(', ')}</p>
</div>`.trim()
      }).catch(() => {});

      setFormState('submitted');
    } catch (error) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
      setFormState('form');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (formState === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-xl text-center shadow-2xl">
          <CardContent className="p-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h1>
            <p className="text-slate-600 mb-6">
              Thank you for applying. Review typically takes under an hour. Check your email for updates.
            </p>
            <Link to={createPageUrl("Home")}><Button variant="outline">Return Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formState === 'rejected_maker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-xl text-center shadow-2xl">
          <CardContent className="p-10">
            <Printer className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Rejected</h1>
            <p className="text-slate-600 mb-6">Your previous application was not approved. You can review and re-submit.</p>
            <Button onClick={() => setFormState('form')}>Re-submit Application</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl mb-6">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Apply to Become a Maker</h1>
          <p className="text-xl text-slate-600">Submit your application to join our network of 3D printing professionals. Review takes under an hour.</p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 font-medium">We currently only accept makers in the United States.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <Card className="shadow-xl border-0">
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={formData.full_name} disabled className="bg-gray-50"/></div>
                <div><Label>Email Address *</Label><Input type="email" value={formData.email} disabled className="bg-gray-50"/></div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 123-4567" required />
                <p className="text-xs text-slate-500 mt-1">10-digit US phone number</p>
              </div>
              <div>
                <Label>Street Address *</Label>
                <Input value={formData.street} onChange={e => updateField('street', e.target.value)} placeholder="123 Main St" required />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>City *</Label><Input value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="City" required /></div>
                <div><Label>State *</Label><Input value={formData.state} onChange={e => updateField('state', e.target.value)} placeholder="AZ" required /></div>
                <div><Label>ZIP Code *</Label><Input value={formData.zip} onChange={e => updateField('zip', e.target.value)} placeholder="12345" required /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Experience Level *</Label>
                  <Select value={formData.experience_level} onValueChange={v => updateField('experience_level', v)}>
                    <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-1 yrs)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (2-5 yrs)</SelectItem>
                      <SelectItem value="advanced">Advanced (5+ yrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Weekly Printing Hours *</Label>
                  <Input type="number" value={formData.weekly_capacity} onChange={e => updateField('weekly_capacity', e.target.value)} required min="1"/>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Printers */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5 text-orange-500" />Your Printer(s) *</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Add all printers you'll use for orders. All fields required.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPrinter}>
                  <Plus className="w-4 h-4 mr-1" />Add Printer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {printers.map((printer, idx) => (
                <div key={idx} className="p-4 border-2 border-orange-100 rounded-xl space-y-4 relative">
                  {printers.length > 1 && (
                    <button type="button" onClick={() => removePrinter(idx)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <p className="font-semibold text-orange-700 text-sm">Printer {idx + 1}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Printer Model *</Label>
                      <Input value={printer.model} onChange={e => updatePrinter(idx, 'model', e.target.value)} placeholder="e.g. Ender 3 V2, Bambu X1C" required />
                    </div>
                    <div>
                      <Label>Nickname (optional)</Label>
                      <Input value={printer.name} onChange={e => updatePrinter(idx, 'name', e.target.value)} placeholder="e.g. My Main Printer" />
                    </div>
                  </div>
                  <div>
                    <Label>Supported Materials *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {PRINTER_MATERIALS.map(mat => (
                        <div key={mat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pm-${idx}-${mat}`}
                            checked={printer.supported_materials.includes(mat)}
                            onCheckedChange={() => togglePrinterMaterial(idx, mat)}
                          />
                          <Label htmlFor={`pm-${idx}-${mat}`} className="font-normal">{mat}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mc-${idx}`}
                      checked={printer.multi_color_capable}
                      onCheckedChange={checked => updatePrinter(idx, 'multi_color_capable', checked)}
                    />
                    <Label htmlFor={`mc-${idx}`} className="font-normal">This printer can do multi-color prints</Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filaments */}
          <Card className="shadow-xl border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-orange-500" />Your Filament Inventory *</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Select multiple colors at once for each material type.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFilamentRow}>
                  <Plus className="w-4 h-4 mr-1" />Add Material
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filamentRows.map((row, idx) => (
                <div key={idx} className="p-4 border-2 border-orange-100 rounded-xl relative space-y-4">
                  {filamentRows.length > 1 && (
                    <button type="button" onClick={() => removeFilamentRow(idx)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Material Type *</Label>
                      <Select value={row.material_type} onValueChange={v => updateFilamentRow(idx, 'material_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILAMENT_MATERIALS.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity per color (kg) *</Label>
                      <Input type="number" step="0.1" min="0.1" value={row.quantity_kg} onChange={e => updateFilamentRow(idx, 'quantity_kg', e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Select Colors * ({row.colors.length} selected)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                      {FILAMENT_COLORS.map(color => (
                        <div key={color} className="flex items-center space-x-2">
                          <Checkbox
                            id={`fc-${idx}-${color}`}
                            checked={row.colors.includes(color)}
                            onCheckedChange={() => toggleFilamentRowColor(idx, color)}
                          />
                          <Label htmlFor={`fc-${idx}-${color}`} className="text-sm font-normal cursor-pointer">{color}</Label>
                        </div>
                      ))}
                    </div>
                    {row.colors.length > 0 && (
                      <p className="text-xs text-orange-600 mt-1">Selected: {row.colors.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Terms & Submit */}
          <Card className="shadow-xl border-0">
            <CardContent className="p-6 space-y-4">
              <AgreementModal type="maker" open={agreementOpen} onClose={() => setAgreementOpen(false)} />
              <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
                <Checkbox
                  id="terms"
                  checked={formData.agree_terms}
                  onCheckedChange={checked => updateField('agree_terms', checked)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                  * I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setAgreementOpen(true)}
                    className="text-orange-600 hover:text-orange-700 underline font-semibold"
                  >
                    Maker Agreement
                  </button>{' '}and understand the requirements for becoming a maker on EX3D Prints.
                </Label>
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-orange-500 to-red-600" disabled={formState === 'submitting'}>
                {formState === 'submitting' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Submitting...</> : 'Submit Application'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}