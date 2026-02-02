import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Palette, Upload as UploadIcon, User } from "lucide-react";
import { createPageUrl } from "@/utils";

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner (0-1 yrs)" },
  { value: "intermediate", label: "Intermediate (2-5 yrs)" },
  { value: "advanced", label: "Advanced (5+ yrs)" }
];

const DESIGN_CATEGORIES = [
  "kit_cards",
  "plane_models",
  "rocket_models",
  "halloween",
  "embry_riddle",
  "dorm_essentials",
  "desk",
  "art",
  "fashion",
  "gadgets",
  "toys_and_games",
  "thanksgiving",
  "christmas",
  "holidays",
  "misc"
];

const getCategoryLabel = (value) => {
  const labels = {
    "kit_cards": "Kit Cards",
    "plane_models": "Plane Models",
    "rocket_models": "Rocket Models",
    "halloween": "Halloween",
    "embry_riddle": "Embry-Riddle",
    "dorm_essentials": "Dorm Essentials",
    "desk": "Desk",
    "art": "Art",
    "fashion": "Fashion",
    "gadgets": "Gadgets",
    "toys_and_games": "Toys & Games",
    "thanksgiving": "Thanksgiving",
    "christmas": "Christmas",
    "holidays": "Holidays",
    "misc": "Misc"
  };
  return labels[value] || value;
};

export default function DesignerSignup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    designer_name: '',
    bio: '',
    experience_level: '',
    phone: '',
    agree_terms: false
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        await base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(currentUser);
    } catch (error) {
      await base44.auth.redirectToLogin(window.location.href);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileImageUrl(file_url);
      setProfileImage(file);
      toast({ title: "Profile image uploaded!" });
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
    setUploadingImage(false);
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.designer_name.trim()) {
      toast({ title: "Please enter your designer name", variant: "destructive" });
      return;
    }

    if (!formData.bio.trim()) {
      toast({ title: "Please enter your bio", variant: "destructive" });
      return;
    }

    if (!formData.experience_level) {
      toast({ title: "Please select your experience level", variant: "destructive" });
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }

    if (!formData.agree_terms) {
      toast({ title: "Please agree to the terms and conditions", variant: "destructive" });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({ title: "Please select at least one design category", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const application = await base44.entities.DesignerApplication.create({
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        designer_name: formData.designer_name,
        bio: formData.bio,
        experience_level: formData.experience_level,
        design_categories: selectedCategories,
        portfolio_links: [],
        status: 'approved'
      });

      await base44.auth.updateMe({
        designer_application_id: application.id,
        designer_name: formData.designer_name,
        bio: formData.bio,
        profile_image: profileImageUrl || user.profile_image,
        business_roles: [...(user.business_roles || []).filter(r => r !== 'designer'), 'designer'],
        designer_id: application.id
      });

      toast({
        title: "Success!",
        description: "Welcome to the designer network!"
      });

      window.location.href = createPageUrl('DesignerDashboard');
    } catch (error) {
      console.error("Failed to submit:", error);
      toast({
        title: "Failed to submit",
        description: error.message,
        variant: "destructive"
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-red-600">Designer</span> Sign Up
          </h1>
          <p className="text-gray-600">Share your 3D designs with the world and earn from every print</p>
        </div>

        <Card className="border-2 border-red-200 shadow-2xl">
          <CardHeader>
            <CardTitle>Tell Us About Yourself</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" value={user?.full_name || ''} disabled className="bg-gray-50"/>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={user?.email || ''} disabled className="bg-gray-50"/>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  placeholder="(555) 123-4567"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">10-digit phone number</p>
              </div>

              {/* Profile Image */}
              <div>
                <Label>Profile Image</Label>
                <div className="mt-2 flex items-center gap-4">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profile-image-upload').click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-2" />}
                      Upload Photo
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="designer_name">Designer Name / Brand *</Label>
                <Input
                  id="designer_name"
                  value={formData.designer_name}
                  onChange={(e) => setFormData({...formData, designer_name: e.target.value})}
                  placeholder="Your creative name or brand"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bio">About You *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about your design experience, style, and what inspires you..."
                  rows={5}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="experience">Experience Level *</Label>
                <Select
                  value={formData.experience_level}
                  onValueChange={(value) => setFormData({...formData, experience_level: value})}
                >
                  <SelectTrigger id="experience" className="mt-1">
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Design Categories * (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DESIGN_CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label
                        htmlFor={`cat-${category}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {getCategoryLabel(category)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
                <Checkbox 
                  id="terms" 
                  checked={formData.agree_terms} 
                  onCheckedChange={(checked) => setFormData({...formData, agree_terms: checked})}
                  required
                  className="mt-1"
                />
                <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                  * I agree to the{' '}
                  <a 
                    href={createPageUrl("Terms")} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 underline font-semibold"
                  >
                    Terms of Service
                  </a>
                  {' '}and understand the requirements for becoming a designer on EX3D Prints.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-red-500 to-pink-600" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Submitting...</> : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}