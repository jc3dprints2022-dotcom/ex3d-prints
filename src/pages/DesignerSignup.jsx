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
import { Loader2, Palette, Plus, X } from "lucide-react";

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];
const DESIGN_CATEGORIES = [
  "Art & Sculptures",
  "Fashion & Accessories", 
  "Home & Garden",
  "Toys & Games",
  "Tools & Gadgets",
  "Educational",
  "Miniatures",
  "Other"
];

export default function DesignerSignup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [portfolioLinks, setPortfolioLinks] = useState(['']);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [formData, setFormData] = useState({
    designer_name: '',
    bio: '',
    experience_level: ''
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

  const handleAddPortfolioLink = () => {
    setPortfolioLinks([...portfolioLinks, '']);
  };

  const handleRemovePortfolioLink = (index) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const handlePortfolioLinkChange = (index, value) => {
    const updated = [...portfolioLinks];
    updated[index] = value;
    setPortfolioLinks(updated);
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

    if (selectedCategories.length === 0) {
      toast({ title: "Please select at least one design category", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const validLinks = portfolioLinks.filter(link => link.trim());

      const application = await base44.entities.DesignerApplication.create({
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        designer_name: formData.designer_name,
        bio: formData.bio,
        experience_level: formData.experience_level,
        design_categories: selectedCategories,
        portfolio_links: validLinks,
        status: 'pending'
      });

      await base44.auth.updateMe({
        designer_application_id: application.id,
        designer_application_status: 'pending'
      });

      toast({
        title: "Sign up submitted!",
        description: "We'll review your information and get back to you soon."
      });

      window.location.href = '/ConsumerDashboard';
    } catch (error) {
      console.error("Failed to submit sign up:", error);
      toast({
        title: "Failed to submit sign up",
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

        <Card className="border-2 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-red-600" />
              Designer Sign Up Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      <SelectItem key={level} value={level}>
                        {level}
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
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Portfolio Links (Optional)</Label>
                <p className="text-sm text-gray-600 mb-3">Share links to your portfolio, social media, or previous work</p>
                <div className="space-y-2">
                  {portfolioLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={link}
                        onChange={(e) => handlePortfolioLinkChange(index, e.target.value)}
                        placeholder="https://"
                      />
                      {portfolioLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemovePortfolioLink(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPortfolioLink}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Link
                </Button>
              </div>

              <div className="pt-6 border-t">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Sign Up...
                    </>
                  ) : (
                    'Submit Sign Up'
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