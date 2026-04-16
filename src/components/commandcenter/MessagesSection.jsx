import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send, StickyNote, MessageSquare, Bug } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ADMIN_EMAIL = "jc3dprints2022@gmail.com";

// ─── Contact Submissions Tab ───────────────────────────────────────────────
function ContactMessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ContactSubmission.list("-created_date", 200);
      setMessages(all);
    } catch (e) {
      toast({ title: "Failed to load messages", variant: "destructive" });
    }
    setLoading(false);
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    // Mark as in_progress if new
    if (msg.status === "new") {
      await base44.entities.ContactSubmission.update(msg.id, { status: "in_progress" }).catch(() => {});
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "in_progress" } : m));
    }
    try {
      const [r, n] = await Promise.all([
        base44.entities.MessageReply.filter({ submission_id: msg.id }),
        base44.entities.MessageNote.filter({ submission_id: msg.id }),
      ]);
      r.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      n.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setReplies(r);
      setNotes(n);
    } catch (e) {
      setReplies([]); setNotes([]);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const reply = await base44.entities.MessageReply.create({
        submission_id: selected.id,
        sender_type: "admin",
        content: replyText.trim(),
      });
      // Send email to user with reply + original message
      try {
        await base44.functions.invoke("sendEmail", {
          to: selected.email,
          subject: `Re: ${selected.subject || "Your message"} - EX3D Prints`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<p>Hi ${selected.name},</p>
<p>${replyText.trim().replace(/\n/g, '<br/>')}</p>
<br/>
<div style="background:#f5f5f5;padding:15px;border-left:3px solid #ccc;margin-top:20px;">
  <p style="color:#666;font-size:12px;margin-bottom:8px;">Your original message:</p>
  <p style="color:#444;">${selected.message?.replace(/\n/g, '<br/>')}</p>
</div>
<br/>
<p style="color:#888;font-size:12px;">— EX3D Prints Support</p>
</div>`
        });
      } catch (_) {}
      setReplies((prev) => [...prev, reply]);
      setReplyText("");
      if (selected.status === "resolved") {
        await base44.entities.ContactSubmission.update(selected.id, { status: "in_progress" });
        setSelected((prev) => ({ ...prev, status: "in_progress" }));
        setMessages((prev) => prev.map((m) => m.id === selected.id ? { ...m, status: "in_progress" } : m));
      }
      toast({ title: "Reply sent" });
    } catch (e) {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
    setSendingReply(false);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const note = await base44.entities.MessageNote.create({
        submission_id: selected.id,
        content: noteText.trim(),
        created_by_name: "Admin",
      });
      setNotes((prev) => [...prev, note]);
      setNoteText("");
      toast({ title: "Note saved" });
    } catch (e) {
      toast({ title: "Failed to save note", variant: "destructive" });
    }
    setSavingNote(false);
  };

  const toggleStatus = async () => {
    const newStatus = selected.status === "resolved" ? "in_progress" : "resolved";
    await base44.entities.ContactSubmission.update(selected.id, { status: newStatus });
    setSelected((prev) => ({ ...prev, status: newStatus }));
    setMessages((prev) => prev.map((m) => m.id === selected.id ? { ...m, status: newStatus } : m));
  };

  const filtered = messages.filter((m) => {
    if (statusFilter === "open") return m.status !== "resolved";
    if (statusFilter === "resolved") return m.status === "resolved";
    return true;
  });

  const openCount = messages.filter((m) => m.status !== "resolved").length;

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); loadMessages(); }} className="text-cyan-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={toggleStatus}
            className={selected.status === "resolved" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
            {selected.status === "resolved" ? "Mark as Open" : "Mark as Resolved"}
          </Button>
        </div>
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-lg">{selected.name}</p>
              <Badge className={selected.status === "resolved" ? "bg-gray-700 text-gray-300" : "bg-cyan-700 text-white"}>
                {selected.status === "resolved" ? "Resolved" : "Open"}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">{selected.email}</p>
            {selected.subject && <p className="text-gray-300 font-medium">{selected.subject}</p>}
            <p className="text-gray-500 text-xs">{new Date(selected.created_date).toLocaleString()}</p>
            <div className="mt-3 p-4 bg-slate-800 rounded-lg">
              <p className="text-gray-200 whitespace-pre-wrap">{selected.message}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-white text-base">Replies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {replies.length === 0 && <p className="text-gray-500 text-sm">No replies yet.</p>}
            {replies.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg text-sm ${r.sender_type === "admin" ? "bg-teal-900/40 border border-teal-700/30 ml-8" : "bg-slate-800 border border-slate-700"}`}>
                <div className="flex justify-between mb-1">
                  <span className={`font-semibold ${r.sender_type === "admin" ? "text-teal-400" : "text-gray-300"}`}>
                    {r.sender_type === "admin" ? "You (Admin)" : selected.name}
                  </span>
                  <span className="text-gray-500 text-xs">{new Date(r.created_date).toLocaleString()}</span>
                </div>
                <p className="text-gray-200 whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
            <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..." rows={3}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-500" />
            <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="bg-teal-600 hover:bg-teal-700 text-white">
              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Admin Notes (Internal)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 && <p className="text-gray-500 text-sm">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-yellow-400 font-semibold">{n.created_by_name || "Admin"}</span>
                  <span className="text-gray-500 text-xs">{new Date(n.created_date).toLocaleString()}</span>
                </div>
                <p className="text-gray-200 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note..." rows={2}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-500" />
            <Button onClick={addNote} disabled={savingNote || !noteText.trim()} variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20">
              {savingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Note
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Contact Messages</h3>
          {openCount > 0 && <p className="text-cyan-400 text-sm">{openCount} open</p>}
        </div>
        <div className="flex gap-2">
          {["all", "open", "resolved"].map((f) => (
            <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"}
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? "bg-cyan-600 text-white" : "border-cyan-500/30 text-cyan-400"}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="p-8 text-center text-gray-500">No messages found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <Card key={msg.id}
              className={`bg-slate-900 border-cyan-500/20 cursor-pointer hover:border-cyan-500/50 transition-colors ${msg.status === "resolved" ? "opacity-60" : ""}`}
              onClick={() => openMessage(msg)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold truncate">{msg.name}</p>
                    <Badge className={msg.status === "resolved" ? "bg-gray-700 text-gray-400 text-xs" : "bg-cyan-700 text-white text-xs"}>
                      {msg.status === "resolved" ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{msg.email}</p>
                  {msg.subject && <p className="text-gray-300 text-sm font-medium truncate">{msg.subject}</p>}
                  <p className="text-gray-500 text-xs truncate mt-1">{msg.message?.slice(0, 80)}{msg.message?.length > 80 ? "…" : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-500 text-xs">{new Date(msg.created_date).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feedback / Issue Reports Tab ─────────────────────────────────────────
function FeedbackReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.FeedbackReport.list("-created_date", 200);
      setReports(all);
    } catch (e) {
      toast({ title: "Failed to load reports", variant: "destructive" });
    }
    setLoading(false);
  };

  const openReport = async (report) => {
    setSelected(report);
    if (report.status === "new") {
      await base44.entities.FeedbackReport.update(report.id, { status: "in_progress" }).catch(() => {});
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "in_progress" } : r));
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSendingReply(true);
    try {
      // Save reply as admin_notes
      await base44.entities.FeedbackReport.update(selected.id, {
        admin_notes: (selected.admin_notes ? selected.admin_notes + "\n\n---\nAdmin reply: " : "Admin reply: ") + replyText.trim(),
        status: "in_progress"
      });

      // Send email to user if they have an email
      if (selected.user_email && selected.user_email !== "anonymous@example.com") {
        await base44.functions.invoke("sendEmail", {
          to: selected.user_email,
          subject: `Re: Your feedback "${selected.title}" - EX3D Prints`,
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<p>Hi ${selected.user_name || "there"},</p>
<p>Thank you for your feedback. Here's our response:</p>
<p>${replyText.trim().replace(/\n/g, '<br/>')}</p>
<br/>
<div style="background:#f5f5f5;padding:15px;border-left:3px solid #ccc;margin-top:20px;">
  <p style="color:#666;font-size:12px;margin-bottom:8px;">Your original report: "${selected.title}"</p>
  <p style="color:#444;">${selected.description?.replace(/\n/g, '<br/>')}</p>
</div>
<br/>
<p style="color:#888;font-size:12px;">— EX3D Prints Team</p>
</div>`
        });
      }

      setSelected(prev => ({
        ...prev,
        admin_notes: (prev.admin_notes ? prev.admin_notes + "\n\n---\nAdmin reply: " : "Admin reply: ") + replyText.trim()
      }));
      setReports(prev => prev.map(r => r.id === selected.id ? {
        ...r,
        admin_notes: (r.admin_notes ? r.admin_notes + "\n\n---\nAdmin reply: " : "Admin reply: ") + replyText.trim()
      } : r));
      setReplyText("");
      toast({ title: "Reply sent" });
    } catch (e) {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
    setSendingReply(false);
  };

  const toggleResolved = async () => {
    const newStatus = selected.status === "resolved" ? "in_progress" : "resolved";
    await base44.entities.FeedbackReport.update(selected.id, { status: newStatus });
    setSelected(prev => ({ ...prev, status: newStatus }));
    setReports(prev => prev.map(r => r.id === selected.id ? { ...r, status: newStatus } : r));
  };

  const priorityColor = (p) => ({ critical: "bg-red-600", high: "bg-orange-500", medium: "bg-yellow-600", low: "bg-gray-600" }[p] || "bg-gray-600");
  const typeLabel = (t) => ({ bug: "🐛 Bug", feature_request: "💡 Feature", improvement: "⬆️ Improvement", other: "Other" }[t] || t);

  const filtered = reports.filter(r => {
    if (statusFilter === "open") return r.status !== "resolved";
    if (statusFilter === "resolved") return r.status === "resolved";
    return true;
  });

  const openCount = reports.filter(r => r.status !== "resolved").length;

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); loadReports(); }} className="text-cyan-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={toggleResolved}
            className={selected.status === "resolved" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
            {selected.status === "resolved" ? "Reopen" : "Mark Resolved"}
          </Button>
        </div>
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-white font-bold text-lg">{selected.title}</p>
              <div className="flex gap-2">
                <Badge className={priorityColor(selected.priority)}>{selected.priority}</Badge>
                <Badge className="bg-purple-700">{typeLabel(selected.report_type)}</Badge>
                <Badge className={selected.status === "resolved" ? "bg-gray-700 text-gray-300" : "bg-cyan-700 text-white"}>
                  {selected.status}
                </Badge>
              </div>
            </div>
            <p className="text-gray-400 text-sm">{selected.user_name} — {selected.user_email}</p>
            <p className="text-gray-500 text-xs">{new Date(selected.created_date).toLocaleString()}</p>
            <div className="mt-3 p-4 bg-slate-800 rounded-lg">
              <p className="text-gray-200 whitespace-pre-wrap">{selected.description}</p>
            </div>
            {selected.admin_notes && (
              <div className="mt-3 p-4 bg-teal-900/20 border border-teal-700/30 rounded-lg">
                <p className="text-teal-400 text-xs font-semibold mb-2">Admin Notes / Replies:</p>
                <p className="text-gray-200 whitespace-pre-wrap text-sm">{selected.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-white text-base">Reply to Submitter</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply (will be emailed to the submitter)..." rows={4}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-500" />
            <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="bg-teal-600 hover:bg-teal-700 text-white">
              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Issue Reports & Feature Requests</h3>
          {openCount > 0 && <p className="text-cyan-400 text-sm">{openCount} open</p>}
        </div>
        <div className="flex gap-2">
          {["all", "open", "resolved"].map((f) => (
            <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"}
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? "bg-cyan-600 text-white" : "border-cyan-500/30 text-cyan-400"}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="p-8 text-center text-gray-500">No reports found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => (
            <Card key={report.id}
              className={`bg-slate-900 border-cyan-500/20 cursor-pointer hover:border-cyan-500/50 transition-colors ${report.status === "resolved" ? "opacity-60" : ""}`}
              onClick={() => openReport(report)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-white font-semibold truncate">{report.title}</p>
                    <Badge className={priorityColor(report.priority)}>{report.priority}</Badge>
                    <Badge className="bg-purple-700 text-xs">{typeLabel(report.report_type)}</Badge>
                    <Badge className={report.status === "resolved" ? "bg-gray-700 text-gray-400 text-xs" : "bg-cyan-700 text-white text-xs"}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{report.user_name} — {report.user_email}</p>
                  <p className="text-gray-500 text-xs truncate mt-1">{report.description?.slice(0, 80)}{report.description?.length > 80 ? "…" : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-500 text-xs">{new Date(report.created_date).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main MessagesSection ──────────────────────────────────────────────────
export default function MessagesSection() {
  const [activeTab, setActiveTab] = useState("contact");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-white mr-4">Messages & Feedback</h2>
        <Button size="sm" onClick={() => setActiveTab("contact")}
          className={activeTab === "contact" ? "bg-cyan-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}>
          <MessageSquare className="w-4 h-4 mr-1" /> Contact Messages
        </Button>
        <Button size="sm" onClick={() => setActiveTab("feedback")}
          className={activeTab === "feedback" ? "bg-cyan-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"}>
          <Bug className="w-4 h-4 mr-1" /> Issues & Requests
        </Button>
      </div>
      {activeTab === "contact" ? <ContactMessagesTab /> : <FeedbackReportsTab />}
    </div>
  );
}