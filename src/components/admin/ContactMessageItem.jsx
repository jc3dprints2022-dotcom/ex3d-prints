import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ContactMessageItem({ message, onUpdate }) {
  const [adminNotes, setAdminNotes] = useState(message.admin_notes || '');
  const [replyMessage, setReplyMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(message.status === 'new');
  const { toast } = useToast();

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
        await base44.entities.ContactSubmission.update(message.id, { status: newStatus, admin_notes: adminNotes });
        toast({ title: "Message status updated" });
        onUpdate();
        if (newStatus === 'resolved') setIsExpanded(false);
    } catch {
        toast({ title: "Failed to update message", variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
        toast({ title: "Reply cannot be empty.", variant: "destructive" });
        return;
    }
    if (!message.user_id) {
        toast({ title: "Cannot Reply", description: "This message was sent by a non-registered user.", variant: "destructive"});
        return;
    }

    setUpdating(true);
    try {
        await base44.entities.ChatMessage.create({
            session_id: message.id,
            user_id: message.user_id,
            sender_role: 'support',
            message: replyMessage,
        });

        const fullNote = `Reply Sent: "${replyMessage}"\n${adminNotes}`;
        setAdminNotes(fullNote);
        await base44.entities.ContactSubmission.update(message.id, { status: 'in_progress', admin_notes: fullNote });
        setReplyMessage('');
        toast({ title: "Reply Sent!", description: "The user will see this message in their dashboard."});
        onUpdate();
    } catch (error) {
        toast({ title: "Reply Failed", variant: "destructive"});
    }
    setUpdating(false);
  };

  if (!isExpanded) {
    return (
       <div className="p-4 border rounded-lg bg-gray-100 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{message.name} - {message.email}</p>
            <p className="text-sm text-slate-600"><strong>{message.subject}</strong></p>
          </div>
           <div className="flex items-center gap-3">
            <Badge className={message.status === 'new' ? 'bg-yellow-100 text-yellow-800' : message.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>{message.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setIsExpanded(true)}><ChevronDown className="w-5 h-5"/></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold">{message.name} - {message.email}</p>
          <p className="text-sm text-slate-600"><strong>{message.subject}</strong></p>
        </div>
        <div className="flex items-center gap-3">
            <Badge className={message.status === 'new' ? 'bg-yellow-100 text-yellow-800' : message.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>{message.status}</Badge>
            {message.status === 'resolved' && (<Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)}><ChevronUp className="w-5 h-5"/></Button>)}
        </div>
      </div>
      
      <p className="text-sm mt-2 p-3 bg-slate-50 rounded-md border">{message.message}</p>
      <p className="text-xs text-slate-500 mt-2 mb-4">{new Date(message.created_date).toLocaleString()}</p>

      <div className="mt-4 space-y-3">
        <Label>Respond to User</Label>
        <Textarea placeholder="Type your reply here..." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={3} disabled={!message.user_id} />
        { !message.user_id && <p className="text-xs text-slate-500">Cannot reply to non-registered users. Create an account to reply.</p> }
         <Button size="sm" onClick={handleReply} disabled={updating || !replyMessage || !message.user_id}><Send className="w-4 h-4 mr-2" />Send Reply</Button>
      </div>

      <div className="mt-4">
        <Label>Admin Notes (internal only)</Label>
        <Textarea placeholder="Internal notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="text-xs" />
      </div>

      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={() => handleStatusChange('in_progress')} disabled={updating}>Mark In Progress</Button>
        <Button size="sm" onClick={() => handleStatusChange('resolved')} disabled={updating} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-1" />Mark Resolved</Button>
      </div>
    </div>
  );
}