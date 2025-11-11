
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Image, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "No preference"];
const COLORS = [
  "White", "Black", "Gray", "Silver", "Gold", "Brown", "Beige",
  "Red", "Blue", "Yellow", "Green", "Orange", "Purple", "Pink",
  "Copper", "Bronze",
  "Silk Rainbow", "Marble",
  "No preference"
];

export default function CustomPrintRequest() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    files: [],
    images: [],
    material_preference: 'PLA',
    color_preference: 'Black',
    quantity: 1,
    timeline: 'normal',
    budget_range: '',
    is_class_project: false
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        toast({
          title: "Please sign in",
          description: "You need to be logged in to submit a custom print request.",
          variant: "destructive"
        });
        await base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(currentUser);
      // Removed loadCustomRequests(currentUser.id) as it was not defined and
      // loading existing requests doesn't fit the purpose of a submission form.
    } catch (error) {
      console.error("Authentication check failed:", error);
      toast({
        title: "Authentication required",
        description: "Please sign in to continue.",
        variant: "destructive"
      });
      await base44.auth.redirectToLogin(window.location.href);
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadFiles = async (files) => {
    if (!files || files.length === 0) {
      return [];
    }
    try {
      const uploadPromises = Array.from(files).map(file =>
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      return results.map(res => res.file_url);
    } catch (error) {
      console.error("File upload error:", error);
      throw new Error("Failed to upload files: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // The user check is now handled by checkAuthAndLoad on page load,
    // so this specific check here is redundant if the page requires authentication to be accessed.
    // However, if the page is public but submission requires login, this can be re-enabled.
    // For now, assuming checkAuthAndLoad enforces login upfront.

    if (!formData.title || !formData.description) {
      toast({ title: "Please fill in all required fields", description: "Title and Description are mandatory.", variant: "destructive" });
      return;
    }

    if (formData.files.length === 0) {
      toast({ title: "Please upload at least one 3D file", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let fileUrls = [];
      let imageUrls = [];

      try {
        fileUrls = await uploadFiles(formData.files);
      } catch (uploadError) {
        throw new Error("Failed to upload 3D files: " + uploadError.message);
      }

      if (formData.images.length > 0) {
        try {
          imageUrls = await uploadFiles(formData.images);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          // Continue without images if they fail
        }
      }

      // Dimensions parsing logic removed as the field is no longer in the UI
      // let formattedDimensions = null;
      // if (formData.dimensions && typeof formData.dimensions === 'string' && formData.dimensions.trim() !== '') {
      //   const numbers = formData.dimensions.match(/(\d+(\.\d+)?)/g);
      //
      //   if (numbers && numbers.length >= 3) {
      //     formattedDimensions = {
      //       length: parseFloat(numbers[0]),
      //       width: parseFloat(numbers[1]),
      //       height: parseFloat(numbers[2])
      //     };
      //   } else if (numbers && numbers.length === 1) {
      //     formattedDimensions = {
      //       length: parseFloat(numbers[0]),
      //       width: parseFloat(numbers[0]),
      //       height: parseFloat(numbers[0])
      //     };
      //   }
      // }

      const requestData = {
        customer_id: user.id,
        title: formData.title,
        description: formData.description,
        files: fileUrls,
        images: imageUrls,
        material_preference: formData.material_preference,
        color_preference: formData.color_preference,
        quantity: parseInt(formData.quantity) || 1,
        timeline: formData.timeline,
        budget_range: formData.budget_range,
        is_class_project: formData.is_class_project,
        // special_requirements and dimensions removed from requestData as fields are no longer in UI
        status: 'pending'
      };

      const newRequest = await base44.entities.CustomPrintRequest.create(requestData);

      try {
        await base44.functions.invoke('sendEmail', {
          to: user.email,
          subject: 'Custom Print Request Received - EX3D Prints',
          body: `Hi ${user.full_name || user.email},\n\nWe've received your custom print request!\n\nRequest Details:\n- Title: ${formData.title}\n- Quantity: ${formData.quantity}\n- Material: ${formData.material_preference || 'Not specified'}\n- Color: ${formData.color_preference || 'Not specified'}\n- Timeline: ${formData.timeline || 'Flexible'}\n- Class Project: ${formData.is_class_project ? 'Yes' : 'No'}\n\nOur team will review your request and provide a quote within 24-48 hours. You'll receive an email notification once your quote is ready.\n\nYou can track your request status in your dashboard.\n\nThank you for choosing EX3D Prints!\n\nBest regards,\nThe EX3D Prints Team`
        });
      } catch (emailError) {
        console.error("Failed to send customer confirmation email:", emailError);
      }

      try {
        await base44.functions.invoke('sendEmail', {
          to: 'support@ex3dprints.com',
          subject: 'New Custom Print Request - Action Required',
          body: `New custom print request received:\n\nCustomer: ${user.full_name || user.email} (${user.email})\nTitle: ${formData.title}\nQuantity: ${formData.quantity}\nBudget Range: ${formData.budget_range || 'Not specified'}\nTimeline: ${formData.timeline || 'Flexible'}\nClass Project: ${formData.is_class_project ? 'Yes' : 'No'}\n\nDescription:\n${formData.description}\n\nRequest ID: ${newRequest.id}\n\nPlease log in to the admin portal to review and provide a quote.`
        });
      } catch (adminEmailError) {
        console.error("Failed to send admin notification email:", adminEmailError);
      }

      toast({
        title: "Request submitted successfully!",
        description: "We'll review your request and get back to you with a quote within 24-48 hours."
      });

      navigate(createPageUrl("ConsumerDashboard"));

    } catch (error) {
      console.error("Failed to submit request:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Upload Custom Print Files</h1>
          <p className="text-xl text-gray-600">Have your own 3D files? Upload them here and we'll print them for you!</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Your Print Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Custom Phone Case, Prototype Part, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description & Requirements *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your project, intended use, any special requirements, finishing preferences, etc."
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="printFiles">3D Files (STL, OBJ, 3MF) *</Label>
                  <Input
                    id="printFiles"
                    type="file"
                    multiple
                    onChange={(e) => handleInputChange('files', e.target.files)}
                    accept=".stl,.obj,.3mf"
                    className="mt-2"
                    required
                  />
                  <p className="text-sm text-slate-500 mt-1">Upload your 3D model files</p>
                </div>

                <div>
                  <Label htmlFor="referenceImages">Reference Images (Optional)</Label>
                  <Input
                    id="referenceImages"
                    type="file"
                    multiple
                    onChange={(e) => handleInputChange('images', e.target.files)}
                    accept="image/*"
                    className="mt-2"
                  />
                  <p className="text-sm text-slate-500 mt-1">Photos showing desired result</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material">Material Choice *</Label>
                  <Select value={formData.material_preference} onValueChange={(value) => handleInputChange('material_preference', value)} >
                    <SelectTrigger id="material">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="color">Color Choice *</Label>
                  <Select value={formData.color_preference} onValueChange={(value) => handleInputChange('color_preference', value)}>
                    <SelectTrigger id="color">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="timeline">Desired Timeline</Label>
                  <Select value={formData.timeline} onValueChange={(value) => handleInputChange('timeline', value)}>
                    <SelectTrigger id="timeline">
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expedited">1-2 Days (Expedited)</SelectItem>
                      <SelectItem value="normal">3-5 Days (Standard)</SelectItem>
                      <SelectItem value="long">7-9 Days (Economy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget_range">Target Budget (Optional)</Label>
                  <Input
                    id="budget_range"
                    value={formData.budget_range}
                    onChange={(e) => handleInputChange('budget_range', e.target.value)}
                    placeholder="e.g., $50 - $100 or 'flexible'"
                  />
                </div>
              </div>

              {/* Class Project Checkbox */}
              <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="is_class_project"
                  checked={formData.is_class_project}
                  onChange={(e) => handleInputChange('is_class_project', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <Label htmlFor="is_class_project" className="cursor-pointer text-blue-900 font-medium">
                  This is for a class project or capstone (Get 25% off!)
                </Label>
              </div>

              <div className="flex justify-end pt-6">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Submit Custom Print Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
