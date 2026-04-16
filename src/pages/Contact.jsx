import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function Contact() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            setFormData(prev => ({
                ...prev,
                name: currentUser.full_name || '',
                email: currentUser.email || ''
            }));
        } catch (error) {
            // Not logged in, do nothing
        }
    };
    fetchUser();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Using existing 'loading' state for submission

    try {
      const submissionData = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        status: 'new'
      };

      if (user) {
        submissionData.user_id = user.id;
      }

      const submission = await base44.entities.ContactSubmission.create(submissionData);

      // Send confirmation email to user
      try {
        await base44.functions.invoke('sendEmail', {
          to: formData.email,
          subject: 'We Received Your Message - EX3D Prints',
          body: `Hi ${formData.name},\n\nThank you for contacting EX3D Prints!\n\nWe've received your message about "${formData.subject}" and our team will review it shortly. We typically respond within 24-48 hours.\n\nYour Message:\n${formData.message}\n\nIf you have any urgent concerns, please don't hesitate to reach out again.\n\nBest regards,\nThe EX3D Prints Team`
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Do not throw, main submission was successful. Log the error.
      }

      // Send notification to admin
      try {
        await base44.functions.invoke('sendEmail', {
          to: 'jc3dprints2022@gmail.com',
          subject: `New Contact Message: ${formData.subject}`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">New Contact Form Message</h2>
<p><strong>From:</strong> ${formData.name} (${formData.email})</p>
<p><strong>Subject:</strong> ${formData.subject}</p>
<div style="background:#f5f5f5;padding:15px;border-left:3px solid #0891b2;margin-top:15px;">
  <p>${formData.message.replace(/\n/g, '<br/>')}</p>
</div>
<p style="margin-top:15px;color:#666;font-size:12px;">View and respond in the JC3D Command Center → Messages &amp; Feedback → Contact Messages</p>
</div>`
        });
      } catch (adminEmailError) {
        console.error("Failed to send admin notification:", adminEmailError);
      }

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24-48 hours.",
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
      // The outline included `setSubmitted(true);` but no `submitted` state was defined or used,
      // and `loading` effectively manages the submission state, so it's omitted here.
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again or email us directly at support@ex3dprints.com",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Have questions about EXpressPrints? We're here to help! Fill out the form below.
          </p>
        </div>

        <div className="flex justify-center">
          {/* Contact Form */}
          <div className="w-full max-w-4xl">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        disabled={!!user && formData.name === user.full_name} // Disable if user logged in and field matches pre-filled
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        disabled={!!user && formData.email === user.email} // Disable if user logged in and field matches pre-filled
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="What can we help you with?"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message * (Max 500 words)</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => {
                        const words = e.target.value.trim().split(/\s+/);
                        if (words.length <= 500 || e.target.value === '') {
                          handleInputChange('message', e.target.value);
                        }
                      }}
                      placeholder="Please provide as much detail as possible..."
                      rows={6}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.message ? formData.message.trim().split(/\s+/).filter(w => w).length : 0} / 500 words
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FAQ Teaser */}
            <div className="mt-12 bg-gradient-to-r from-teal-50 to-blue-50 p-8 rounded-xl">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900">How long does it take to get my 3D prints?</h4>
                  <p className="text-slate-600 text-sm">Most orders are completed within 7-10 business days, including printing and shipping time.</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">What materials do you support?</h4>
                  <p className="text-slate-600 text-sm">We support PLA, PETG, ABS, TPU, and specialty materials like wood-fill and metal-fill filaments.</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">How do I become a maker or designer?</h4>
                  <p className="text-slate-600 text-sm">Click on "For Makers" or "For Designers" in our navigation to learn more and sign up!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}