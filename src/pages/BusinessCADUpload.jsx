import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "ASA", "Nylon", "Not Sure"];
const QUANTITY_RANGES = ["50-100", "100-500", "500-1000", "1000-5000", "5000+"];

export default function BusinessCADUpload() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    projectDescription: "",
    quantityRange: "",
    targetLeadTime: "",
    budget: "",
    material: "",
    additionalNotes: ""
  });
  const [cadFiles, setCadFiles] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData(prev => ({
        ...prev,
        email: currentUser.email,
        contactName: currentUser.full_name || ""
      }));
    } catch (error) {
      // Not logged in - allow form submission anyway
    }
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    setLoading(true);

    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.file_url);

      if (type === 'cad') {
        setCadFiles([...cadFiles, ...urls]);
      } else {
        setReferenceImages([...referenceImages, ...urls]);
      }

      toast({ title: `${files.length} file(s) uploaded successfully` });
    } catch (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const removeFile = (index, type) => {
    if (type === 'cad') {
      setCadFiles(cadFiles.filter((_, i) => i !== index));
    } else {
      setReferenceImages(referenceImages.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactName || !formData.email || !formData.projectDescription) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await base44.entities.CustomPrintRequest.create({
        customer_id: user?.id || 'guest',
        title: `Business CAD Request - ${formData.companyName}`,
        description: `Company: ${formData.companyName}\nContact: ${formData.contactName}\nPhone: ${formData.phone}\nEmail: ${formData.email}\n\nProject: ${formData.projectDescription}\n\nQuantity: ${formData.quantityRange}\nLead Time: ${formData.targetLeadTime}\nBudget: ${formData.budget}\nMaterial: ${formData.material}\n\nAdditional Notes: ${formData.additionalNotes}`,
        files: cadFiles,
        images: referenceImages,
        quantity: parseInt(formData.quantityRange?.split('-')[0]) || 50,
        budget_range: formData.budget,
        timeline: formData.targetLeadTime,
        material_preference: formData.material,
        special_requirements: formData.additionalNotes,
        status: 'pending'
      });

      setSubmitted(true);
      toast({ title: "Quote request submitted successfully!" });
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-2xl mx-4">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Quote Request Received</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your submission. Our manufacturing team will review your requirements and respond within 4 business hours with a detailed quote and production timeline.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <a href={createPageUrl("BusinessMarketplace")}>Return to Business Marketplace</a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href={createPageUrl("Home")}>Back to Home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Custom Manufacturing Quote</h1>
          <p className="text-teal-100">Upload your CAD files and specifications for a detailed production quote</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectDescription">Project Description *</Label>
                <Textarea
                  id="projectDescription"
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  rows={4}
                  placeholder="Describe what you need manufactured..."
                  required
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantityRange">Quantity Range</Label>
                  <select
                    id="quantityRange"
                    value={formData.quantityRange}
                    onChange={(e) => setFormData({ ...formData, quantityRange: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select range</option>
                    {QUANTITY_RANGES.map(range => (
                      <option key={range} value={range}>{range} units</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="targetLeadTime">Target Lead Time</Label>
                  <Input
                    id="targetLeadTime"
                    value={formData.targetLeadTime}
                    onChange={(e) => setFormData({ ...formData, targetLeadTime: e.target.value })}
                    placeholder="e.g., 2 weeks"
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Budget Range</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $5,000-$10,000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="material">Preferred Material</Label>
                <select
                  id="material"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select material</option>
                  {MATERIALS.map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>CAD Files & References</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cadFiles">CAD Files (STL, STEP, OBJ, etc.)</Label>
                <Input
                  id="cadFiles"
                  type="file"
                  multiple
                  accept=".stl,.obj,.step,.stp,.3mf,.igs,.iges"
                  onChange={(e) => handleFileUpload(e, 'cad')}
                  disabled={loading}
                  className="mb-2"
                />
                {cadFiles.length > 0 && (
                  <div className="space-y-2">
                    {cadFiles.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                        <span className="text-sm truncate flex-1">{url.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx, 'cad')}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="referenceImages">Reference Images (Optional)</Label>
                <Input
                  id="referenceImages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'image')}
                  disabled={loading}
                  className="mb-2"
                />
                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {referenceImages.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt="" className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeFile(idx, 'image')}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={3}
                  placeholder="Any special requirements, tolerances, finish preferences, etc."
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Submit Quote Request
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}