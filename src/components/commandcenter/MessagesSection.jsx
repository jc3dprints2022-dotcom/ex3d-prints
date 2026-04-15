import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, StickyNote, Check, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function MessagesSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replies, setReplies] = useState([]);
  const [notes, setNotes] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, [filter]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Message.list("-created_date");
      const filtered = filter === "all" ? all : all.filter(m => m.status === filter);
      setMessages(filtered);
    } catch {
      toast({ title: "Failed to load messages", variant: "destructive" });
    }
    setLoading(false);
  };

  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    const [r, n] = await Promise.all([
      base44.entities.MessageReply.filter({ message_id: msg.id }).catch(() => []),
      base44.entities.MessageNote.filter({ message_id: msg.id }).catch(() => []),
    ]);
    setReplies(r.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setNotes(n.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const reply = await base44.entities.MessageReply.create({
        message_id: selectedMessage.id,
        sender_type: "admin",
        content: replyText.trim(),
      });
      // Try to send email
      try {
        await base44.functions.invoke("sendEmail", {
          to: selectedMessage.email,
          subject: `Re: ${selectedMessage.subject || "Your message to EX3D Prints"}`,
          body: `Hi ${selectedMessage.name},\n\n${replyText.trim()}\n\nBest regards,\nEX3D Prints Team`,
        });
      } catch {}
      setReplies(prev => [...prev, reply]);
      setReplyText("");
      toast({ title: "Reply sent" });
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
    setSending(false);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      const user = await base44.auth.me().catch(() => null);
      const note = await base44.entities.MessageNote.create({
        message_id: selectedMessage.id,
        content: noteText.trim(),
        created_by: user?.full_name || "Admin",
      });
      setNotes(prev => [...prev, note]);
      setNoteText("");
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  };

  const toggleStatus = async (msg) => {
    const newStatus = msg.status === "open" ? "resolved" : "open";
    await base44.entities.Message.update(msg.id, { status: newStatus });
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage({ ...msg, status: newStatus });
    }
    loadMessages();
    toast({ title: newStatus === "resolved" ? "Marked as resolved" : "Reopened" });
  };

  const openCount = messages.filter ? null : null; // just for display

  if (selectedMessage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => { setSelectedMessage(null); loadMessages(); }} className="border-cyan-500/30 text-cyan-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white">{selectedMessage.subject || "(No subject)"}</h2>
            <p className="text-slate-400 text-sm">{selectedMessage.name} · {selectedMessage.email}</p>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={() => toggleStatus(selectedMessage)}
              className={selectedMessage.status === "open" ? "bg-green-700 hover:bg-green-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}
            >
              {selectedMessage.status === "open" ? <><Check className="w-4 h-4 mr-1" /> Mark Resolved</> : <><RotateCcw className="w-4 h-4 mr-1" /> Reopen</>}
            </Button>
          </div>
        </div>

        {/* Original Message */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">Original Message</CardTitle>
              <span className="text-xs text-slate-500">{selectedMessage.created_date ? format(new Date(selectedMessage.created_date), "MMM d, yyyy h:mm a") : ""}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 whitespace-pre-wrap">{selectedMessage.message}</p>
          </CardContent>
        </Card>

        {/* Replies Thread */}
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {replies.length === 0 && <p className="text-slate-500 text-sm">No replies yet.</p>}
            {replies.map(r => (
              <div key={r.id} className={`p-3 rounded-lg text-sm ${r.sender_type === "admin" ? "bg-cyan-900/30 border border-cyan-500/20 ml-8" : "bg-slate-800 mr-8"}`}>
                <p className={`text-xs font-semibold mb-1 ${r.sender_type === "admin" ? "text-cyan-400" : "text-orange-400"}`}>
                  {r.sender_type === "admin" ? "You (Admin)" : selectedMessage.name}
                  <span className="text-slate-500 font-normal ml-2">{r.created_date ? format(new Date(r.created_date), "MMM d, h:mm a") : ""}</span>
                </p>
                <p className="text-slate-200 whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="bg-slate-800 border-cyan-500/30 text-white placeholder:text-slate-500 resize-none"
                rows={3}
              />
            </div>
            <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="bg-cyan-700 hover:bg-cyan-600 text-white">
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Reply
            </Button>
          </CardContent>
        </Card>

        {/* Admin Notes */}
        <Card className="bg-slate-900 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 text-base flex items-center gap-2"><StickyNote className="w-4 h-4" /> Admin Notes (Internal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 && <p className="text-slate-500 text-sm">No notes yet.</p>}
            {notes.map(n => (
              <div key={n.id} className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 text-sm">
                <p className="text-xs text-yellow-400 mb-1">{n.created_by} · {n.created_date ? format(new Date(n.created_date), "MMM d, h:mm a") : ""}</p>
                <p className="text-slate-300">{n.content}</p>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add internal note..."
                className="bg-slate-800 border-yellow-500/30 text-white placeholder:text-slate-500 resize-none"
                rows={2}
              />
            </div>
            <Button onClick={addNote} disabled={!noteText.trim()} variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/20">
              <StickyNote className="w-4 h-4 mr-1" /> Add Note
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Messages</h2>
        <div className="flex gap-2">
          {["open", "resolved", "all"].map(f => (
            <Button key={f} size="sm" onClick={() => setFilter(f)}
              className={filter === f ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
      ) : messages.length === 0 ? (
        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="py-12 text-center text-slate-500">No messages found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              onClick={() => openMessage(msg)}
              className="bg-slate-900 border border-cyan-500/20 rounded-xl p-4 cursor-pointer hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{msg.name}</span>
                    <span className="text-slate-500 text-xs">{msg.email}</span>
                    <Badge className={msg.status === "open" ? "bg-green-700 text-white text-xs" : "bg-slate-700 text-slate-300 text-xs"}>
                      {msg.status}
                    </Badge>
                  </div>
                  <p className="text-slate-300 text-sm font-medium truncate">{msg.subject || "(No subject)"}</p>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{msg.message?.slice(0, 80)}{msg.message?.length > 80 ? "..." : ""}</p>
                </div>
                <span className="text-slate-600 text-xs whitespace-nowrap">
                  {msg.created_date ? format(new Date(msg.created_date), "MMM d") : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}