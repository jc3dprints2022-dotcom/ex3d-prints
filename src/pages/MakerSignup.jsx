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
    campus_location: '',
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
                campus_location: existingApplication.campus_location || '',
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
    if (!formData.campus_location) {
      toast({ title: "Campus Location required", description: "Please select your campus location.", variant: "destructive" });
      return;
    }
    
    setFormState('submitting');
    try {
      const applicationData = {
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        experience_level: formData.experience_level,
        weekly_capacity: parseInt(formData.weekly_capacity, 10),
        campus_location: formData.campus_location,
        materials: formData.materials,
        status: 'pending'
      };

      let currentApplication;
      // If user had a rejected application, update it. Otherwise, create new.
      // We check user.maker_application_id and also current formState for rejected_maker
      // to ensure we update only if it was a re-submission of a rejected app,
      // and not if somehow user has ID but no app (which is now handled in useEffect to clear ID).
      if (user.maker_application_id && formState === 'rejected_maker') {
        currentApplication = await base44.entities.MakerApplication.update(user.maker_application_id, applicationData);
        await base44.auth.updateMe({ 
          account_status: 'pending_approval' 
        });
        toast({ title: "Application Re-submitted", description: "Your application has been re-submitted for review.", variant: "success" });
      } else {
        currentApplication = await base44.entities.MakerApplication.create(applicationData);
        await base44.auth.updateMe({ 
          maker_application_id: currentApplication.id,
          account_status: 'pending_approval' 
        });
        toast({ title: "Application Submitted", description: "Your application has been submitted for review.", variant: "success" });
      }

      // Send application received email
      try {
        const emailResult = await base44.functions.invoke('sendEmail', {
          to: user.email,
          subject: 'Maker Application Received - EX3D Prints',
          body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f97316; font-size: 32px; margin-bottom: 10px;">Maker Application Received ✓</h1>
        <p style="color: #6b7280; font-size: 18px;">Hi ${user.full_name}!</p>
    </div>

    <div style="margin-bottom: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We've received your application to become a maker on EX3D Prints.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your application is currently under review. Our team will carefully review your information and get back to you within <strong>2-3 business days</strong>.
        </p>
    </div>

    <div style="background: #fef3f2; border-left: 4px solid #f97316; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px 0;">Application Details</h2>
        <div style="color: #6b7280; font-size: 15px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>Campus Location:</strong> ${CAMPUS_LOCATIONS.find(c => c.value === formData.campus_location)?.label || formData.campus_location}</p>
            <p style="margin: 8px 0;"><strong>Experience Level:</strong> ${formData.experience_level}</p>
            <p style="margin: 8px 0;"><strong>Weekly Capacity:</strong> ${formData.weekly_capacity} hours</p>
            <p style="margin: 8px 0;"><strong>Materials:</strong> ${formData.materials.join(', ')}</p>
        </div>
    </div>

    <div style="margin-bottom: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for your interest in joining our maker community!
        </p>
    </div>

    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
            Best regards,<br>
            The EX3D Team<br>
            <a href="mailto:ex3dprint.@gmail.com" style="color: #f97316; text-decoration: none;">ex3dprint.@gmail.com</a>
        </p>
    </div>
</div>
          `.trim()
        });

        console.log('Application email result:', JSON.stringify(emailResult.data));
        
        if (!emailResult || !emailResult.data || !emailResult.data.success) {
          console.error("Application email may have failed or returned unexpected structure:", emailResult);
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
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

  if (formState === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-xl text-center shadow-2xl">
          <CardContent className="p-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h1>
            <p className="text-slate-600 mb-6">
              Thank you for applying! Our team will review your application and you'll receive an email within 2-3 business days.
            </p>
            <Button asChild>
              <Link to={createPageUrl("ConsumerDashboard")}>Go to My Dashboard</Link>
            </Button>
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Maker Application</h1>
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

              {/* Campus Location */}
              <div>
                <Label htmlFor="campus_location">Campus Location *</Label>
                <Select required value={formData.campus_location} onValueChange={(value) => handleInputChange('campus_location', value)}>
                  <SelectTrigger><SelectValue placeholder="Select your campus" /></SelectTrigger>
                  <SelectContent>
                    {CAMPUS_LOCATIONS.map(campus => (
                      <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {formState === 'submitting' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Submitting...</> : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}