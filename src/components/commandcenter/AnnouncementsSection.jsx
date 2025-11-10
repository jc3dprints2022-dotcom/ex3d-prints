import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Megaphone, Trash2 } from "lucide-react";

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    priority: 'info',
    send_email: false,
    expiry_date: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const allAnnouncements = await base44.entities.Announcement.list();
      setAnnouncements(allAnnouncements.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      toast({ title: "Failed to load announcements", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast({ title: "Please fill in title and message", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Create announcement
      await base44.entities.Announcement.create({
        title: formData.title,
        message: formData.message,
        target_audience: formData.target_audience,
        priority: formData.priority,
        send_email: formData.send_email,
        expiry_date: formData.expiry_date || null,
        status: 'published'
      });

      // Send emails if requested
      if (formData.send_email) {
        const users = await base44.entities.User.list();
        let targetUsers = [];

        if (formData.target_audience === 'all') {
          targetUsers = users;
        } else if (formData.target_audience === 'consumers') {
          targetUsers = users.filter(u => u.business_roles?.includes('consumer') && !u.business_roles?.includes('maker'));
        } else if (formData.target_audience === 'makers') {
          targetUsers = users.filter(u => u.business_roles?.includes('maker'));
        }

        // Send emails to all target users
        for (const user of targetUsers) {
          try {
            await base44.functions.invoke('sendEmail', {
              to: user.email,
              subject: `[EX3D Prints] ${formData.title}`,
              body: formData.message
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        }

        toast({ 
          title: "Announcement published and emails sent!", 
          description: `Sent to ${targetUsers.length} users` 
        });
      } else {
        toast({ title: "Announcement published successfully!" });
      }

      // Reset form
      setFormData({
        title: '',
        message: '',
        target_audience: 'all',
        priority: 'info',
        send_email: false,
        expiry_date: ''
      });

      loadAnnouncements();
    } catch (error) {
      toast({ title: "Failed to create announcement", description: error.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await base44.entities.Announcement.delete(id);
      toast({ title: "Announcement deleted" });
      loadAnnouncements();
    } catch (error) {
      toast({ title: "Failed to delete announcement", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Create Announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-cyan-400">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-slate-900 border-cyan-500/30 text-white"
                placeholder="New Feature Launch"
                required
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-cyan-400">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="bg-slate-900 border-cyan-500/30 text-white"
                rows={5}
                placeholder="We're excited to announce..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target" className="text-cyan-400">Target Audience</Label>
                <Select value={formData.target_audience} onValueChange={(value) => setFormData({...formData, target_audience: value})}>
                  <SelectTrigger id="target" className="bg-slate-900 border-cyan-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="consumers">Consumers Only</SelectItem>
                    <SelectItem value="makers">Makers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority" className="text-cyan-400">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger id="priority" className="bg-slate-900 border-cyan-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="expiry" className="text-cyan-400">Expiry Date (Optional)</Label>
              <Input
                id="expiry"
                type="datetime-local"
                value={formData.expiry_date}
                onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                className="bg-slate-900 border-cyan-500/30 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_email"
                checked={formData.send_email}
                onCheckedChange={(checked) => setFormData({...formData, send_email: checked})}
              />
              <Label htmlFor="send_email" className="text-white cursor-pointer">
                Also send as email notification
              </Label>
            </div>

            <Button type="submit" disabled={sending} className="w-full bg-cyan-500 hover:bg-cyan-600">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Publish Announcement
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {announcements.map(announcement => (
              <div key={announcement.id} className="bg-slate-900 p-4 rounded-lg border border-cyan-500/20">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-white">{announcement.title}</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(announcement.priority)}>{announcement.priority}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {announcement.target_audience}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-2">{announcement.message}</p>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Posted: {new Date(announcement.created_date).toLocaleString()}</span>
                  {announcement.send_email && <span className="text-cyan-400">✓ Email sent</span>}
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-center text-slate-400 py-8">No announcements yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}