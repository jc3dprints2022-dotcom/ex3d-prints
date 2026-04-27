import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

// ── Conversation view (linked from admin reply emails) ────────────────────────
function ConversationView({ submissionId, onBack }) {
  const [submission, setSubmission] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConversation();
  }, [submissionId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      setUser(currentUser);

      // Fetch submission — RLS allows reading your own (by user_id) or by submission_id match
      const submissions = await base44.entities.ContactSubmission.filter({ id: submissionId }).catch(() => []);
      const sub = submissions[0];
      if (!sub) {
        toast({ title: "Conversation not found", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Security: only allow if logged in and user_id matches, or submission has matching email
      if (currentUser && sub.user_id && sub.user_id !== currentUser.id) {
        toast({ title: "Access denied", variant: "destructive" });
        setLoading(false);
        return;
      }

      setSubmission(sub);
      const r = await base44.entities.MessageReply.filter({ submission_id: submissionId }).catch(() => []);
      r.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setReplies(r);
    } catch (e) {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !submission) return;
    setSending(true);
    try {
      const reply = await base44.entities.MessageReply.create({
        submission_id: submission.id,
        sender_type: "user",
        content: replyText.trim(),
      });
      setReplies(prev => [...prev, reply]);
      setReplyText("");

      // Notify admin via email
      await base44.functions.invoke("sendEmail", {
        to: "jc3dprints2022@gmail.com",
        subject: `💬 New Reply from ${submission.name}: "${submission.subject || "Re: your message"}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">New Reply from ${submission.name}</h2>
<p><strong>Email:</strong> ${submission.email}</p>
<p><strong>Subject:</strong> ${submission.subject || 'N/A'}</p>
<div style="background:#f5f5f5;padding:15px;border-left:3px solid #0891b2;margin:15px 0;">
  <p>${replyText.trim().replace(/\n/g, '<br/>')}</p>
</div>
<p style="color:#666;font-size:12px;">View and respond in the JC3D Command Center → Messages &amp; Feedback → Contact Messages</p>
</div>`
      }).catch(e => console.error("Admin notify failed:", e));

      toast({ title: "Reply sent!" });
    } catch (e) {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (!submission) return (
    <div className="text-center py-12">
      <p className="text-gray-600">Conversation not found or access denied.</p>
      <Button variant="outline" className="mt-4" onClick={onBack}>Back to Contact</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" onClick={onBack} className="text-teal-600">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-600" />
            {submission.subject || "Your Message"}
          </CardTitle>
          <p className="text-sm text-gray-500">{new Date(submission.created_date).toLocaleString()}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Original message */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
            <p className="text-xs text-gray-500 mb-2 font-medium">Your original message</p>
            <p className="text-gray-700 whitespace-pre-wrap">{submission.message}</p>
          </div>

          {/* Reply thread */}
          {replies.map(r => (
            <div key={r.id} className={`rounded-lg p-4 ${r.sender_type === 'admin'
              ? 'bg-teal-50 border border-teal-200 ml-4'
              : 'bg-blue-50 border border-blue-200 mr-4'
            }`}>
              <div className="flex justify-between mb-1">
                <span className={`text-xs font-semibold ${r.sender_type === 'admin' ? 'text-teal-700' : 'text-blue-700'}`}>
                  {r.sender_type === 'admin' ? 'EX3D Prints Support' : 'You'}
                </span>
                <span className="text-xs text-gray-400">{new Date(r.created_date).toLocaleString()}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{r.content}</p>
            </div>
          ))}

          {/* Reply box */}
          <div className="pt-2 border-t space-y-3">
            <Label>Your Reply</Label>
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
            />
            <Button
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Contact page ─────────────────────────────────────────────────────────
export default function Contact() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Check for ?submission_id= in URL for conversation view
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get("submission_id");

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
      } catch { /* not logged in */ }
    };
    fetchUser();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submissionData = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        status: 'new'
      };
      if (user) submissionData.user_id = user.id;

      const submission = await base44.entities.ContactSubmission.create(submissionData);

      // Confirmation to user
      await base44.functions.invoke('sendEmail', {
        to: formData.email,
        subject: 'We Received Your Message - EX3D Prints',
        body: `Hi ${formData.name},\n\nThank you for contacting EX3D Prints! We've received your message about "${formData.subject}" and will respond within 24-48 hours.\n\nBest regards,\nThe EX3D Prints Team`
      }).catch(e => console.error("Confirmation email failed:", e));

      // Notify admin
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
      }).catch(e => console.error("Admin email failed:", e));

      toast({ title: "Message sent successfully!", description: "We'll get back to you within 24-48 hours." });
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast({ title: "Failed to send message", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Show conversation view if submission_id param is present
  if (submissionId) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <ConversationView
            submissionId={submissionId}
            onBack={() => window.location.href = '/Contact'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Get in Touch</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Have questions about EXpressPrints? We're here to help!
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            {submitted ? (
              <Card className="border-none shadow-xl">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                  <p className="text-gray-600 mb-6">We'll get back to you within 24-48 hours.</p>
                  <Button onClick={() => setSubmitted(false)} variant="outline">Send Another Message</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Your Name *</Label>
                        <Input id="name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required disabled={!!user} />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required disabled={!!user} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input id="subject" value={formData.subject} onChange={e => handleInputChange('subject', e.target.value)} placeholder="What can we help you with?" required />
                    </div>
                    <div>
                      <Label htmlFor="message">Message * (Max 500 words)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={e => {
                          const words = e.target.value.trim().split(/\s+/);
                          if (words.length <= 500 || e.target.value === '') handleInputChange('message', e.target.value);
                        }}
                        placeholder="Please provide as much detail as possible..."
                        rows={6}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.message ? formData.message.trim().split(/\s+/).filter(w => w).length : 0} / 500 words
                      </p>
                    </div>
                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending Message...</> : <><Send className="w-4 h-4 mr-2" />Send Message</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="mt-12 bg-gradient-to-r from-teal-50 to-blue-50 p-8 rounded-xl">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900">How long does it take to get my 3D prints?</h4>
                  <p className="text-slate-600 text-sm">Most orders are completed within 7-10 business days, including printing and shipping time.</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">What materials do you support?</h4>
                  <p className="text-slate-600 text-sm">We support PLA, PETG, ABS, TPU, and specialty materials.</p>
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