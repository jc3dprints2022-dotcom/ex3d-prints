import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { toast } = useToast();

  useEffect(() => { loadConversation(); }, [submissionId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      const submissions = await base44.entities.ContactSubmission.filter({ id: submissionId }).catch(() => []);
      const sub = submissions[0];
      if (!sub) { toast({ title: "Conversation not found", variant: "destructive" }); setLoading(false); return; }
      if (currentUser && sub.user_id && sub.user_id !== currentUser.id) {
        toast({ title: "Access denied", variant: "destructive" }); setLoading(false); return;
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
<div style="text-align:center;margin:24px 0;">
  <a href="https://ex3dprints.com/jc3dcommandcenter?section=messages" style="background:#0891b2;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Reply in Command Center →</a>
</div>
<p style="color:#666;font-size:12px;">Submission ID: ${submission.id}</p>
</div>`
      }).catch(() => {});
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
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
            <p className="text-xs text-gray-500 mb-2 font-medium">Your original message</p>
            <p className="text-gray-700 whitespace-pre-wrap">{submission.message}</p>
          </div>
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
          <div className="pt-2 border-t space-y-3">
            <Label>Your Reply</Label>
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply..." rows={4} />
            <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="bg-teal-600 hover:bg-teal-700">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Contact form ──────────────────────────────────────────────────────────────
function ContactForm({ user }) {
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const submission = await base44.entities.ContactSubmission.create({
        user_id: user?.id || null,
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: "new",
      });
      const conversationUrl = `https://ex3dprints.com/Contact?submission_id=${submission.id}`;
      await base44.functions.invoke("sendEmail", {
        to: "jc3dprints2022@gmail.com",
        subject: `📬 New Contact Message from ${form.name}: "${form.subject}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">New Contact Message</h2>
<p><strong>From:</strong> ${form.name} (${form.email})</p>
<p><strong>Subject:</strong> ${form.subject}</p>
<div style="background:#f5f5f5;padding:15px;border-left:3px solid #0891b2;margin:15px 0;">
  <p>${form.message.trim().replace(/\n/g, '<br/>')}</p>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="https://ex3dprints.com/jc3dcommandcenter?section=messages" style="background:#0891b2;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Reply in Command Center →</a>
</div>
<p style="color:#666;font-size:12px;">Submission ID: ${submission.id}</p>
</div>`
      }).catch(() => {});
      setSubmittedId(submission.id);
    } catch (err) {
      toast({ title: "Failed to send message. Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (submittedId) {
    const conversationUrl = `/Contact?submission_id=${submittedId}`;
    return (
      <div className="text-center py-10 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-2">
          <Send className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Message Sent!</h3>
        <p className="text-gray-600 max-w-sm mx-auto">We've received your message and will reply to <strong>{form.email}</strong> as soon as possible.</p>
        <p className="text-gray-500 text-sm">When we reply, you'll get an email with a link to view and continue the conversation.</p>
        <a href={conversationUrl} className="inline-block mt-2 text-teal-600 underline text-sm font-medium">
          View your conversation →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="mt-1" required />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="mt-1" required />
        </div>
      </div>
      <div>
        <Label>Subject</Label>
        <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's this about?" className="mt-1" required />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us how we can help..." rows={6} className="mt-1" required />
      </div>
      <Button type="submit" disabled={submitting} className="w-full bg-teal-600 hover:bg-teal-700">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
        Send Message
      </Button>
    </form>
  );
}

// ── Main Contact page ─────────────────────────────────────────────────────────
export default function Contact() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get("submission_id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (submissionId) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <ConversationView submissionId={submissionId} onBack={() => window.location.href = '/Contact'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-100 rounded-full mb-4">
            <MessageSquare className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Get in Touch</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        <Card className="shadow-xl border-teal-100 border-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <MessageSquare className="w-5 h-5" />
              Contact Us
            </CardTitle>
            <p className="text-sm text-gray-500">We typically reply within 24 hours</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ContactForm user={user} />
          </CardContent>
        </Card>

        <div className="mt-10 bg-gradient-to-r from-teal-50 to-blue-50 p-8 rounded-xl">
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
            <div>
              <h4 className="font-medium text-slate-900">Still need help?</h4>
              <p className="text-slate-600 text-sm">Email us directly at <a href="mailto:EX3Dprint@gmail.com" className="text-teal-600 underline">EX3Dprint@gmail.com</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}