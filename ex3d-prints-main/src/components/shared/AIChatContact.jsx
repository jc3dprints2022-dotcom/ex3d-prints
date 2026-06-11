import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Bot, User, ArrowRight, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SYSTEM_CONTEXT = `You are a helpful customer support assistant for EX3D Prints, a 3D printing marketplace.

About EX3D Prints:
- A platform connecting customers with makers (3D printer owners) and designers (CAD model creators)
- Customers can order custom 3D prints or buy from the marketplace
- Makers earn 50% of the listing price per order
- Designers earn 10% royalties per sale of their design
- Orders typically take 7-10 business days
- Shipping via USPS
- Supported materials: PLA, PETG, ABS, TPU, PC
- Contact: EX3Dprint@gmail.com

FAQ Knowledge:
- Payments: Stripe-powered, monthly payouts for makers and designers
- To become a maker: apply at /MakerSignup (US only, takes 8-12 hours to review)
- To become a designer: apply at /DesignerSignup
- Custom prints: available through the Custom Print Request form
- Priority orders: overnight delivery available for an extra fee

Your role:
- Answer questions about orders, products, shipping, pricing, accounts, and general platform info
- Be friendly, concise, and helpful
- If the user has an account-specific issue, billing dispute, file problem, or technical bug that requires accessing their account or taking action, say: "I'll need to connect you with a team member for this. Would you like me to escalate this conversation?"
- Do NOT pretend to access real order data or accounts
- Keep responses under 3 paragraphs`;

export default function AIChatContact({ type = "contact", user = null, onEscalated }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: type === "bug"
        ? "Hi! I'm here to help triage your issue. Can you describe what's happening? Please include what you were trying to do, what you expected, and what actually occurred."
        : "Hi! I'm the EX3D Prints support assistant. How can I help you today? I can answer questions about orders, shipping, becoming a maker or designer, and more."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [guestName, setGuestName] = useState(user?.full_name || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [showGuestForm, setShowGuestForm] = useState(!user);
  const [guestInfoSet, setGuestInfoSet] = useState(!!user);
  const bottomRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const conversationHistory = newMessages
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");

      const prompt = `${SYSTEM_CONTEXT}

Conversation so far:
${conversationHistory}

Respond as the assistant. Be helpful and concise.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      const aiMsg = { role: "assistant", content: response };
      setMessages(prev => [...prev, aiMsg]);

      // Detect escalation trigger phrases in AI response
      const escalationTriggers = [
        "connect you with a team member",
        "escalate this conversation",
        "human agent",
        "our team will",
        "I'll need to connect"
      ];
      if (escalationTriggers.some(t => response.toLowerCase().includes(t.toLowerCase()))) {
        setShowEscalatePrompt(true);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I ran into an issue. Please try again or contact us directly at EX3Dprint@gmail.com."
      }]);
    }
    setLoading(false);
  };

  const handleEscalate = async () => {
    if (!guestInfoSet) {
      if (!guestName.trim() || !guestEmail.trim()) {
        toast({ title: "Please provide your name and email to escalate", variant: "destructive" });
        return;
      }
    }

    setEscalating(true);
    try {
      const name = user?.full_name || guestName;
      const email = user?.email || guestEmail;
      const label = type === "bug" ? "[BUG REPORT]" : "[CONTACT INQUIRY]";
      const subject = `${label} AI-escalated conversation from ${name}`;

      // Build the full conversation as the message
      const conversationText = messages
        .map(m => `${m.role === "user" ? `${name}` : "AI Assistant"}: ${m.content}`)
        .join("\n\n---\n\n");

      // Save to ContactSubmission so admin can see it in Messages section
      const submission = await base44.entities.ContactSubmission.create({
        user_id: user?.id || null,
        name,
        email,
        subject,
        message: `=== AI Chat Transcript ===\n\n${conversationText}\n\n=== End of AI Transcript ===`,
        status: "new"
      });

      // Save each message as a MessageReply for the threaded view
      for (const msg of messages) {
        await base44.entities.MessageReply.create({
          submission_id: submission.id,
          sender_type: msg.role === "user" ? "user" : "support",
          content: `[${msg.role === "user" ? name : "AI Assistant"}] ${msg.content}`
        }).catch(() => {});
      }

      // Notify admin
      await base44.functions.invoke("sendEmail", {
        to: "jc3dprints2022@gmail.com",
        subject: `🔔 ${label} AI Chat Escalation — ${name}`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">AI Chat Escalation — ${type === "bug" ? "Bug Report" : "Contact Inquiry"}</h2>
<p><strong>From:</strong> ${name} (${email})</p>
<hr/>
<h3>Full Conversation:</h3>
<div style="background:#f5f5f5;padding:15px;border-radius:4px;font-size:13px;white-space:pre-wrap;">${conversationText}</div>
<hr/>
<p style="color:#666;font-size:12px;">View and reply in Admin → Messages & Feedback → Contact Messages (Submission ID: ${submission.id})</p>
</div>`
      }).catch(() => {});

      setEscalated(true);
      setShowEscalatePrompt(false);
      if (onEscalated) onEscalated(submission.id);
      toast({ title: "Conversation forwarded to our team!", description: "A team member will follow up via email." });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I've forwarded our conversation to the EX3D Prints team. A team member will follow up with you at " + email + " shortly. Is there anything else I can help you with in the meantime?"
      }]);
    } catch (error) {
      toast({ title: "Failed to escalate", description: "Please email us at EX3Dprint@gmail.com", variant: "destructive" });
    }
    setEscalating(false);
  };

  if (showGuestForm && !guestInfoSet) {
    return (
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-teal-600" />
          <p className="font-semibold text-gray-800">Quick intro before we chat</p>
        </div>
        <div>
          <Label>Your Name</Label>
          <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" className="mt-1" />
        </div>
        <div>
          <Label>Your Email</Label>
          <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="your@email.com" className="mt-1" />
        </div>
        <Button
          onClick={() => {
            if (!guestName.trim() || !guestEmail.trim()) {
              toast({ title: "Please enter your name and email", variant: "destructive" });
              return;
            }
            setGuestInfoSet(true);
            setShowGuestForm(false);
          }}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          Start Chat <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-teal-600" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-800 border border-gray-200 shadow-sm"
            }`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-teal-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Escalate prompt */}
      {showEscalatePrompt && !escalated && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">Would you like me to connect you with a team member?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowEscalatePrompt(false)}>No thanks</Button>
            <Button size="sm" onClick={handleEscalate} disabled={escalating} className="bg-amber-500 hover:bg-amber-600 text-white">
              {escalating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, escalate"}
            </Button>
          </div>
        </div>
      )}

      {/* Manual escalate button */}
      {!showEscalatePrompt && !escalated && messages.length > 2 && (
        <div className="mb-2 text-right">
          <button
            onClick={() => setShowEscalatePrompt(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Connect me with a human
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type your message... (Enter to send)"
          rows={2}
          className="flex-1 resize-none"
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim()} className="bg-teal-600 hover:bg-teal-700 self-end">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}