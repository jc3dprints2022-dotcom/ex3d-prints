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
import { Printer, CheckCircle, Loader2, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Define available materials and colors for selection
const availableMaterials = [
  { value: "pla", label: "PLA" },
  { value: "abs", label: "ABS" },
  { value: "petg", label: "PETG" },
  { value: "tpu", label: "TPU (Flexible)" },
];

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
  { value: "erau_daytona", label: "ERAU Daytona" },
  { value: "arizona_state", label: "Arizona State University" },
];

export default function MakerSignup() {
  const [user, setUser] = useState(null);
  const [formState, setFormState] = useState('form'); // 'form', 'submitting', 'submitted', 'already_maker', 'rejected_maker'
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    experience_level: '',
    weekly_capacity: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    materials: [],
    agree_terms: false
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndLoadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser.business_roles?.includes('maker')) {
          // Already a maker, redirect to dashboard
          window.location.href = createPageUrl("MakerDashboard");
          return;
        } else if (currentUser.maker_application_id) {
          // User has an application ID, try to fetch it
          try {
            const existingApplication = await base44.entities.MakerApplication.get(currentUser.maker_application_id);
            
            if (existingApplication) {
              setFormData(prev => ({
                ...prev,
                full_name: currentUser.full_name || '',
                email: currentUser.email || '',
                phone: existingApplication.phone || '',
                experience_level: existingApplication.experience_level || '',
                weekly_capacity: existingApplication.weekly_capacity ? String(existingApplication.weekly_capacity) : '',
                street: existingApplication.campus_location?.split('|')[0] || '',
                city: existingApplication.campus_location?.split('|')[1] || '',
                state: existingApplication.campus_location?.split('|')[2] || '',
                zip: existingApplication.campus_location?.split('|')[3] || '',
                materials: existingApplication.materials || [],
                agree_terms: false
              }));

              if (existingApplication.status === 'rejected') {
                setFormState('rejected_maker'); // Allow re-submission
              } else if (existingApplication.status === 'pending') {
                setFormState('submitted'); // Still pending review
              }
            }
          } catch (appError) {
            console.log('Application not found or deleted, clearing maker_application_id:', appError.message);
            // Application doesn't exist but user has the ID - clear it and show form
            try {
              await base44.auth.updateMe({ maker_application_id: null });
              // Re-fetch user to ensure state is consistent, or manually update
              setUser(prevUser => ({ ...prevUser, maker_application_id: null }));
            } catch (updateError) {
              console.error('Failed to clear invalid maker_application_id:', updateError);
            }
            
            setFormData(prev => ({
              ...prev,
              full_name: currentUser.full_name || '',
              email: currentUser.email || '',
            }));
            setFormState('form');
          }
        } else {
          // No maker role, no existing application
          setFormData(prev => ({
            ...prev,
            full_name: currentUser.full_name || '',
            email: currentUser.email || '',
          }));
          setFormState('form');
        }
      } catch (error) {
        // Not logged in, redirect to login which will bring them back here
        console.error("Auth check failed, redirecting to login:", error);
        await base44.auth.redirectToLogin(window.location.href);
        return; // Important: prevent further rendering until redirect
      }
      setLoading(false);
    };
    checkAuthAndLoadUser();
  }, []);

  const handleInputChange = (field, value) => {
    // For direct field updates (string, number, boolean)
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setFormData(prev => {
      const currentArray = prev[field];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleSelectAllMaterials = (checked) => {
    setFormData(prev => ({
      ...prev,
      materials: checked ? availableMaterials.map(m => m.value) : []
    }));
  };


  const validatePhone = (phone) => {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agree_terms) {
      toast({ title: "Please agree to the terms and conditions", variant: "destructive" });
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast({ title: "Invalid phone number", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }

    if (!formData.experience_level) {
      toast({ title: "Experience Level required", description: "Please select your experience level.", variant: "destructive" });
      return;
    }
    if (!formData.weekly_capacity || parseInt(formData.weekly_capacity, 10) <= 0) {
      toast({ title: "Weekly Printing Hours required", description: "Please enter a valid number of weekly printing hours.", variant: "destructive" });
      return;
    }
    if (formData.materials.length === 0) {
      toast({ title: "Materials required", description: "Please select at least one material you can print with.", variant: "destructive" });
      return;
    }
    if (!formData.street || !formData.city || !formData.state || !formData.zip) {
      toast({ title: "Address required", description: "Please enter your complete address.", variant: "destructive" });
      return;
    }
    
    setFormState('submitting');
    try {
      const fullAddress = `${formData.street}|${formData.city}|${formData.state}|${formData.zip}`;
      const applicationData = {
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        experience_level: formData.experience_level,
        weekly_capacity: parseInt(formData.weekly_capacity, 10),
        campus_location: fullAddress,
        materials: formData.materials,
        status: 'pending'
      };

      const addressObj = { street: formData.street, city: formData.city, state: formData.state, zip: formData.zip };

      let currentApplication;
      if (user.maker_application_id && formState === 'rejected_maker') {
        // Re-submitting after rejection - update existing application back to pending
        currentApplication = await base44.entities.MakerApplication.update(user.maker_application_id, {
          ...applicationData,
          status: 'pending'
        });
        await base44.auth.updateMe({
          address: addressObj,
          phone: formData.phone
        });
      } else {
        // New application - create as pending, do NOT grant maker role yet
        currentApplication = await base44.entities.MakerApplication.create(applicationData);
        await base44.auth.updateMe({ 
          maker_application_id: currentApplication.id,
          address: addressObj,
          phone: formData.phone
        });
      }

      // Send admin notification
      try {
        await base44.functions.invoke('sendEmail', {
          to: 'jc3dprints2022@gmail.com',
          subject: 'New Maker Application - EX3D Prints',
          body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f97316;">New Maker Application</h1>
    <p>A new maker has applied to join the network. Please review and approve or reject in the Admin Command Center → Maker Tools → Pending Applications.</p>
    <h2>Application Details:</h2>
    <p><strong>Name:</strong> ${formData.full_name}</p>
    <p><strong>Email:</strong> ${formData.email}</p>
    <p><strong>Phone:</strong> ${formData.phone}</p>
    <p><strong>Address:</strong> ${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}</p>
    <p><strong>Experience Level:</strong> ${formData.experience_level}</p>
    <p><strong>Weekly Capacity:</strong> ${formData.weekly_capacity} hours</p>
    <p><strong>Materials:</strong> ${formData.materials.join(', ')}</p>
</div>
          `.trim()
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }

      setFormState('submitted');

    } catch (error) {
      console.error("Signup error:", error);
      toast({ title: "Application failed", description: "Please try again. " + (error.message || ""), variant: "destructive" });
      setFormState('form');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  
  if (formState === 'rejected_maker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-xl text-center shadow-2xl">
          <CardContent className="p-10">
            <Printer className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Rejected</h1>
            <p className="text-slate-600 mb-6">
              Unfortunately, your previous application to become a Maker was not approved. You can review your information and re-submit your application.
            </p>
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Become a Maker</h1>
          <p className="text-xl text-slate-600">Join our network of professional 3D printers.</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader>
            <CardTitle>Tell Us About Yourself</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div><Label htmlFor="full_name">Full Name *</Label><Input id="full_name" value={formData.full_name} disabled className="bg-gray-50"/></div>
                <div><Label htmlFor="email">Email Address *</Label><Input id="email" type="email" value={formData.email} disabled className="bg-gray-50"/></div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => handleInputChange('phone', e.target.value)} 
                  placeholder="(555) 123-4567"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">10-digit phone number</p>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="street">Street Address *</Label>
                <Input 
                  id="street" 
                  value={formData.street} 
                  onChange={(e) => handleInputChange('street', e.target.value)} 
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input 
                    id="city" 
                    value={formData.city} 
                    onChange={(e) => handleInputChange('city', e.target.value)} 
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input 
                    id="state" 
                    value={formData.state} 
                    onChange={(e) => handleInputChange('state', e.target.value)} 
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input 
                    id="zip" 
                    value={formData.zip} 
                    onChange={(e) => handleInputChange('zip', e.target.value)} 
                    placeholder="12345"
                    required
                  />
                </div>
              </div>

              {/* Experience & Capacity */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="experience_level">Experience Level *</Label>
                  <Select required value={formData.experience_level} onValueChange={(value) => handleInputChange('experience_level', value)}>
                    <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-1 yrs)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (2-5 yrs)</SelectItem>
                      <SelectItem value="advanced">Advanced (5+ yrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weekly_capacity">Weekly Printing Hours *</Label>
                  <Input id="weekly_capacity" type="number" value={formData.weekly_capacity} onChange={(e) => handleInputChange('weekly_capacity', e.target.value)} required min="1"/>
                </div>
              </div>

              {/* Material Selection */}
              <div>
                <Label className="font-semibold mb-2 block">Preferred Printing Materials *</Label>
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="select-all-materials"
                    checked={formData.materials.length === availableMaterials.length && availableMaterials.length > 0}
                    onCheckedChange={handleSelectAllMaterials}
                  />
                  <Label htmlFor="select-all-materials" className="font-bold">Select All Materials</Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableMaterials.map((material) => (
                    <div key={material.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`material-${material.value}`}
                        checked={formData.materials.includes(material.value)}
                        onCheckedChange={(checked) => handleCheckboxChange('materials', material.value, checked)}
                      />
                      <Label htmlFor={`material-${material.value}`}>{material.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
                <Checkbox 
                  id="terms" 
                  checked={formData.agree_terms} 
                  onCheckedChange={(checked) => handleInputChange('agree_terms', checked)}
                  required
                  className="mt-1"
                />
                <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                  * I agree to the{' '}
                  <a 
                    href={createPageUrl("Terms")} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 underline font-semibold"
                  >
                    Terms of Service
                  </a>
                  {' '}and understand the requirements for becoming a maker on EX3D Prints.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-orange-500 to-red-600" disabled={formState === 'submitting'}>
                {formState === 'submitting' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Submitting Application...</> : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}