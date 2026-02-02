import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, Users, Filter } from "lucide-react";
import EmailBuilder from "../email/EmailBuilder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmailComposerSection() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [emailContent, setEmailContent] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Re-apply filter whenever audienceFilter or the base users list changes
    applyAudienceFilter();
  }, [audienceFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      const sortedUsers = allUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers); // Initialize filteredUsers with all users
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({ title: "Failed to load users", variant: "destructive" });
    }
    setLoading(false);
  };

  const applyAudienceFilter = async () => {
    let filtered = [...users]; // Start with the full list of users

    // If the currently selected recipient is 'FILTERED_USERS' or an individual user
    // that is no longer in the new filtered list, reset the recipient.
    if (recipient === "FILTERED_USERS" || (recipient && !filtered.some(u => u.id === recipient))) {
      setRecipient("");
    }

    switch (audienceFilter) {
      case "all":
        // 'filtered' is already all users
        break;
      case "makers":
        filtered = users.filter(u => u.business_roles?.includes('maker'));
        break;
      case "consumers":
        // A user is considered a consumer if they don't have 'maker' role or explicitly have 'consumer' role
        filtered = users.filter(u => !u.business_roles?.includes('maker') || u.business_roles?.includes('consumer'));
        break;
      case "active_cart":
        try {
          const allCarts = await base44.entities.Cart.list();
          const userIdsWithCart = new Set(allCarts.map(c => c.user_id));
          filtered = users.filter(u => userIdsWithCart.has(u.id));
        } catch (error) {
          console.error("Failed to filter by active cart:", error);
          toast({ title: "Failed to filter by active cart", description: "Could not retrieve cart data.", variant: "destructive" });
          filtered = []; // On error, assume no users for this filter
        }
        break;
      case "active_wishlist":
        filtered = users.filter(u => u.wishlist && u.wishlist.length > 0);
        break;
      case "inactive_3days":
        try {
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          // Assuming a PageView entity with user_id and timestamp exists
          const recentViews = await base44.entities.PageView.filter({
            timestamp: { $gte: threeDaysAgo.toISOString() }
          });
          const recentUserIds = new Set(recentViews.map(v => v.user_id).filter(Boolean)); // filter(Boolean) removes null/undefined user_ids
          filtered = users.filter(u => !recentUserIds.has(u.id));
        } catch (error) {
          console.error("Failed to filter by inactivity:", error);
          toast({ title: "Failed to filter by inactivity", description: "This feature requires page view tracking setup.", variant: "destructive" });
          filtered = []; // On error, assume no users for this filter
        }
        break;
      default:
        filtered = users;
        break;
    }

    setFilteredUsers(filtered);
  };

  const handleSend = async () => {
    if (!recipient || !subject || !message) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      let targetUsers = [];
      if (recipient === "FILTERED_USERS") {
        targetUsers = filteredUsers;
      } else {
        const singleUser = users.find(u => u.id === recipient);
        if (singleUser) {
          targetUsers = [singleUser];
        } else {
          throw new Error("Selected recipient user not found.");
        }
      }

      if (targetUsers.length === 0) {
        toast({ title: "No users to send to", variant: "destructive" });
        setSending(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const targetUser of targetUsers) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: targetUser.email,
            subject: subject,
            body: message,
            from_name: "EX3D Prints Admin"
          });
          successCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${targetUser.email}:`, emailError);
          failCount++;
        }
      }

      toast({
        title: targetUsers.length > 1 ? "Bulk email sent!" : "Email sent successfully!",
        description: targetUsers.length > 1
          ? `Successfully sent to ${successCount} users${failCount > 0 ? `. Failed: ${failCount}` : ''}`
          : undefined
      });

      setRecipient("");
      setSubject("");
      setMessage("");
      setAudienceFilter("all");
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Email Composer</h2>
        <p className="text-cyan-400">Send emails directly to users from the admin panel</p>
      </div>

      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Compose Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : (
            <>
              {/* Audience Filter */}
              <div>
                <Label className="text-white flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Audience Filter
                </Label>
                <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select an audience filter..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">
                      All Users ({users.length})
                    </SelectItem>
                    <SelectItem value="makers" className="text-white hover:bg-slate-700">
                      All Makers ({users.filter(u => u.business_roles?.includes('maker')).length})
                    </SelectItem>
                    <SelectItem value="consumers" className="text-white hover:bg-slate-700">
                      All Consumers ({users.filter(u => !u.business_roles?.includes('maker') || u.business_roles?.includes('consumer')).length})
                    </SelectItem>
                    <SelectItem value="active_cart" className="text-white hover:bg-slate-700">
                      Users with Items in Cart
                    </SelectItem>
                    <SelectItem value="active_wishlist" className="text-white hover:bg-slate-700">
                      Users with Wishlist Items ({users.filter(u => u.wishlist?.length > 0).length})
                    </SelectItem>
                    <SelectItem value="inactive_3days" className="text-white hover:bg-slate-700">
                      Inactive 3+ Days
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">
                  Showing {filteredUsers.length} user(s) based on filter
                </p>
              </div>

              {/* Recipient */}
              <div>
                <Label className="text-white">To *</Label>
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select recipient(s)..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                    <SelectItem
                      value="FILTERED_USERS"
                      className="text-white hover:bg-slate-700 font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        All Filtered Users ({filteredUsers.length} recipients)
                      </div>
                    </SelectItem>
                    {filteredUsers.map(user => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                        className="text-white hover:bg-slate-700"
                      >
                        {user.full_name} ({user.email})
                        {user.business_roles?.includes('maker') && <span className="text-orange-400 ml-2">Maker</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipient === "FILTERED_USERS" && (
                  <p className="text-xs text-cyan-400 mt-1">
                    📧 Emails will be sent individually to protect user privacy (BCC-style)
                  </p>
                )}
              </div>

              {/* Subject */}
              <div>
                <Label className="text-white">Subject *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>



              <div className="border border-slate-700 rounded-lg overflow-hidden">
                 <EmailBuilder
                   onSave={(content) => {
                     setEmailContent(content);
                     setMessage(content.html);
                     toast({ title: "Email saved to composer!" });
                   }}
                   initialContent={emailContent}
                 />
               </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending{recipient === "FILTERED_USERS" ? ` to ${filteredUsers.length} users` : ''}...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email{recipient === "FILTERED_USERS" ? ` to ${filteredUsers.length} Users` : ''}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>


    </div>
  );
}