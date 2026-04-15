import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      // Send email to user
      try {
        await base44.functions.invoke("sendEmail", {
          to: selected.email,
          subject: `Re: ${selected.subject || "Your message"} - EX3D Prints`,
          body: `Hi ${selected.name},\n\n${replyText.trim()}\n\n---\nEX3D Prints Support`,
        });
      } catch (_) {}
      setReplies((prev) => [...prev, reply]);
      setReplyText("");
      // Mark as open if resolved
      if (selected.status === "resolved") {
        await base44.entities.ContactSubmission.update(selected.id, { status: "new" });
        setSelected((prev) => ({ ...prev, status: "new" }));
        setMessages((prev) => prev.map((m) => m.id === selected.id ? { ...m, status: "new" } : m));
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
    const newStatus = selected.status === "resolved" ? "new" : "resolved";
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
          <Button
            size="sm"
            onClick={toggleStatus}
            className={selected.status === "resolved" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
          >
            {selected.status === "resolved" ? "Mark as Open" : "Mark as Resolved"}
          </Button>
        </div>

        {/* Message header */}
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

        {/* Reply thread */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Replies</CardTitle>
          </CardHeader>
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

            <div className="flex gap-2 pt-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="bg-slate-800 border-slate-600 text-white placeholder-gray-500 flex-1"
              />
            </div>
            <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="bg-teal-600 hover:bg-teal-700 text-white">
              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Reply
            </Button>
          </CardContent>
        </Card>

        {/* Admin notes */}
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
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note..."
              rows={2}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-500"
            />
            <Button onClick={addNote} disabled={savingNote || !noteText.trim()} variant="outline" className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20">
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
          <h2 className="text-xl font-bold text-white">Messages</h2>
          {openCount > 0 && <p className="text-cyan-400 text-sm">{openCount} open message{openCount !== 1 ? "s" : ""}</p>}
        </div>
        <div className="flex gap-2">
          {["all", "open", "resolved"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? "default" : "outline"}
              onClick={() => setStatusFilter(f)}
              className={statusFilter === f ? "bg-cyan-600 text-white" : "border-cyan-500/30 text-cyan-400"}
            >
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
            <Card
              key={msg.id}
              className={`bg-slate-900 border-cyan-500/20 cursor-pointer hover:border-cyan-500/50 transition-colors ${msg.status === "resolved" ? "opacity-60" : ""}`}
              onClick={() => openMessage(msg)}
            >
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