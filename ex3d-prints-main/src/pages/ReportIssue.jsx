import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Send, Loader2, ArrowLeft, MessageSquare, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ADMIN_EMAIL = "jc3dprints2022@gmail.com";
const APP_ORIGIN = "https://ex3dprints.com";

// ── Conversation thread view (linked from admin reply emails) ─────────────────
function ConversationView({ reportId, onBack }) {
  const [report, setReport] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadConversation(); }, [reportId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.FeedbackReport.filter({ id: reportId }).catch(() => []);
      const r = all[0];
      if (!r) { toast({ title: "Conversation not found", variant: "destructive" }); setLoading(false); return; }
      setReport(r);
      const msgs = await base44.entities.MessageReply.filter({ submission_id: reportId }).catch(() => []);
      msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setReplies(msgs);
    } catch {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !report) return;
    setSending(true);
    try {
      const reply = await base44.entities.MessageReply.create({
        submission_id: report.id,
        sender_type: "user",
        content: replyText.trim(),
      });
      setReplies(prev => [...prev, reply]);
      setReplyText("");

      // Email admin about the reply
      await base44.functions.invoke("sendEmail", {
        to: ADMIN_EMAIL,
        subject: `💬 New Reply from ${report.user_name}: "${report.title}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#dc2626;">User Reply — ${report.report_type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request'}</h2>
<p><strong>From:</strong> ${report.user_name} (${report.user_email})</p>
<p><strong>Issue:</strong> ${report.title}</p>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px;margin:15px 0;">
  <p style="margin:0;">${replyText.trim().replace(/\n/g, '<br/>')}</p>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="${APP_ORIGIN}/jc3dcommandcenter?section=messages" style="background:#0891b2;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Reply in Command Center →</a>
</div>
<p style="color:#666;font-size:12px;">Report ID: ${report.id}</p>
</div>`
      }).catch(() => {});

      toast({ title: "Reply sent!" });
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>;
  if (!report) return (
    <div className="text-center py-12">
      <p className="text-gray-600">Conversation not found.</p>
      <Button variant="outline" className="mt-4" onClick={onBack}>Back</Button>
    </div>
  );

  const typeLabel = { bug: "🐛 Bug Report", feature_request: "💡 Feature Request", improvement: "⬆️ Improvement", other: "Other" }[report.report_type] || report.report_type;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" onClick={onBack} className="text-red-600">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <Card className="shadow-xl border-red-100 border-2">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Bug className="w-5 h-5" />
            {report.title}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mt-1">
            <span>{typeLabel}</span>
            <span>·</span>
            <span>Priority: {report.priority}</span>
            <span>·</span>
            <span>{new Date(report.created_date).toLocaleString()}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Original report */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
            <p className="text-xs text-gray-500 mb-2 font-medium">Your original report</p>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{report.description}</p>
          </div>

          {/* Thread */}
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
            <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="bg-red-600 hover:bg-red-700">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Submission form ───────────────────────────────────────────────────────────
function ReportForm({ user }) {
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    report_type: "bug",
    priority: "medium",
    title: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.title.trim() || !form.description.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const report = await base44.entities.FeedbackReport.create({
        user_id: user?.id || null,
        user_name: form.name.trim(),
        user_email: form.email.trim(),
        report_type: form.report_type,
        priority: form.priority,
        title: form.title.trim(),
        description: form.description.trim(),
        page_url: window.location.href,
        status: "new",
      });

      const conversationUrl = `${APP_ORIGIN}/ReportIssue?submission_id=${report.id}`;
      const typeLabel = { bug: "🐛 Bug", feature_request: "💡 Feature Request", improvement: "⬆️ Improvement", other: "Other" }[form.report_type];

      await base44.functions.invoke("sendEmail", {
        to: ADMIN_EMAIL,
        subject: `${typeLabel} [${form.priority.toUpperCase()}] from ${form.name}: "${form.title}"`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#dc2626;">New ${typeLabel}</h2>
<p><strong>From:</strong> ${form.name} (${form.email})</p>
<p><strong>Priority:</strong> ${form.priority}</p>
<p><strong>Title:</strong> ${form.title}</p>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px;margin:15px 0;">
  <p style="white-space:pre-wrap;">${form.description.replace(/\n/g, '<br/>')}</p>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="${APP_ORIGIN}/jc3dcommandcenter?section=messages" style="background:#0891b2;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Reply in Command Center →</a>
</div>
<p style="color:#666;font-size:12px;">Report ID: ${report.id}</p>
</div>`
      }).catch(() => {});

      setSubmittedId(report.id);
    } catch {
      toast({ title: "Failed to submit. Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (submittedId) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-2">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Report Submitted!</h3>
        <p className="text-gray-600 max-w-sm mx-auto">We've received your report and will respond to <strong>{form.email}</strong> as soon as possible.</p>
        <p className="text-gray-500 text-sm">When we reply, you'll get an email with a link to view and continue the conversation.</p>
        <a href={`/ReportIssue?submission_id=${submittedId}`} className="inline-block mt-2 text-red-600 underline text-sm font-medium">
          View your report thread →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!user && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Your Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="mt-1" />
          </div>
          <div>
            <Label>Your Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="mt-1" />
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={form.report_type} onValueChange={v => setForm(f => ({ ...f, report_type: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐛 Bug Report</SelectItem>
              <SelectItem value="feature_request">💡 Feature Request</SelectItem>
              <SelectItem value="improvement">⬆️ Improvement</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Title / Summary</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue or request" className="mt-1" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Please describe what happened, what you expected, and any steps to reproduce..."
          rows={6}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
        Submit Report
      </Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportIssuePage() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get("submission_id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (submissionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <ConversationView reportId={submissionId} onBack={() => window.location.href = '/ReportIssue'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
            <Bug className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Report an Issue or Request a Feature</h1>
          <p className="text-lg text-gray-600">
            We read every report. You'll get a response directly via email.
          </p>
        </div>

        <Card className="shadow-xl border-red-100 border-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <MessageSquare className="w-5 h-5" />
              Submit a Report
            </CardTitle>
            <p className="text-sm text-gray-500">Goes directly to our team · We reply via email</p>
          </CardHeader>
          <CardContent className="pt-6">
            <ReportForm user={user} />
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>For urgent issues: <a href="mailto:EX3Dprint@gmail.com" className="text-red-600 underline">EX3Dprint@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}