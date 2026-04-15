import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send, StickyNote } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    setLoading(true);
    const data = await base44.entities.ContactSubmission.list("-created_date", 200);
    setMessages(data);
    setLoading(false);
  };

  const openMessage = async (msg) => {
    setSelected(msg);
    // Load replies and notes from admin_notes field as simple local state
    setReplies(msg.replies || []);
    setNotes(msg.admin_notes_list || []);
    setReplyText("");
    setNoteText("");
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const newReply = { sender: "admin", content: replyText, at: new Date().toISOString() };
    const updatedReplies = [...replies, newReply];
    await base44.entities.ContactSubmission.update(selected.id, { replies: updatedReplies });
    setReplies(updatedReplies);
    setSelected(prev => ({ ...prev, replies: updatedReplies }));
    // Send email to user
    try {
      await base44.functions.invoke("sendEmail", {
        to: selected.email,
        subject: `Re: ${selected.subject || "Your message to EX3D Prints"}`,
        body: `Hi ${selected.name},\n\n${replyText}\n\n— EX3D Prints Support`
      });
    } catch (_) {}
    setReplyText("");
    toast({ title: "Reply sent" });
    setSending(false);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const newNote = { content: noteText, at: new Date().toISOString() };
    const updatedNotes = [...notes, newNote];
    await base44.entities.ContactSubmission.update(selected.id, { admin_notes_list: updatedNotes });
    setNotes(updatedNotes);
    setSelected(prev => ({ ...prev, admin_notes_list: updatedNotes }));
    setNoteText("");
    toast({ title: "Note saved" });
  };

  const toggleStatus = async () => {
    const newStatus = selected.status === "resolved" ? "new" : "resolved";
    await base44.entities.ContactSubmission.update(selected.id, { status: newStatus });
    setSelected(prev => ({ ...prev, status: newStatus }));
    setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, status: newStatus } : m));
    toast({ title: `Marked as ${newStatus}` });
  };

  const filtered = messages.filter(m => {
    if (filter === "open") return m.status !== "resolved";
    if (filter === "resolved") return m.status === "resolved";
    return true;
  });

  const openCount = messages.filter(m => m.status !== "resolved").length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="border-cyan-500/30 text-cyan-400 hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Badge className={selected.status === "resolved" ? "bg-green-700 text-white" : "bg-yellow-600 text-white"}>
            {selected.status === "resolved" ? "Resolved" : "Open"}
          </Badge>
          <Button size="sm" onClick={toggleStatus} className="bg-slate-700 hover:bg-slate-600 text-white ml-auto">
            {selected.status === "resolved" ? "Mark as Open" : "Mark as Resolved"}
          </Button>
        </div>

        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white">{selected.subject || "(no subject)"}</CardTitle>
                <p className="text-sm text-gray-400 mt-1">{selected.name} · {selected.email}</p>
                <p className="text-xs text-gray-600 mt-0.5">{new Date(selected.created_date).toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
          </CardContent>
        </Card>

        {/* Replies */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader><CardTitle className="text-white text-base">Conversation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {replies.length === 0 && <p className="text-gray-500 text-sm">No replies yet.</p>}
            {replies.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${r.sender === "admin" ? "bg-cyan-900/40 text-cyan-100 ml-8" : "bg-slate-800 text-gray-300 mr-8"}`}>
                <p className="font-semibold text-xs mb-1 opacity-70">{r.sender === "admin" ? "You (Admin)" : selected.name} · {new Date(r.at).toLocaleString()}</p>
                <p className="whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
              />
            </div>
            <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Send Reply</>}
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-slate-900 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Admin Notes (Internal)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 && <p className="text-gray-500 text-sm">No notes yet.</p>}
            {notes.map((n, i) => (
              <div key={i} className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 text-sm text-yellow-100">
                <p className="text-xs opacity-60 mb-1">{new Date(n.at).toLocaleString()}</p>
                <p className="whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add internal note..."
              rows={2}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500"
            />
            <Button onClick={addNote} disabled={!noteText.trim()} variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/20">
              Add Note
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          {openCount > 0 && <Badge className="bg-red-600 text-white">{openCount} open</Badge>}
        </div>
        <div className="flex gap-2">
          {["all", "open", "resolved"].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-cyan-600 text-white" : "border-cyan-500/30 text-cyan-400 hover:bg-slate-800"}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">No messages found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(msg => (
            <div
              key={msg.id}
              onClick={() => openMessage(msg)}
              className={`cursor-pointer p-4 rounded-lg border transition-colors ${
                msg.status === "resolved"
                  ? "bg-slate-900/50 border-slate-700 opacity-60 hover:opacity-80"
                  : "bg-slate-900 border-cyan-500/20 hover:border-cyan-400/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{msg.name}</span>
                    <span className="text-gray-500 text-xs">{msg.email}</span>
                    <Badge className={msg.status === "resolved" ? "bg-green-800 text-green-200 text-xs" : "bg-yellow-700 text-yellow-100 text-xs"}>
                      {msg.status === "resolved" ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 font-medium truncate">{msg.subject || "(no subject)"}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {msg.message?.slice(0, 80)}{msg.message?.length > 80 ? "..." : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">{new Date(msg.created_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}