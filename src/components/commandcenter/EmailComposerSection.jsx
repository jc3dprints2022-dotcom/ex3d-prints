
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Send, Upload, Bold, Italic, Link as LinkIcon, Image as ImageIcon, Loader2, Users, Filter } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      if (data?.file_url) {
        setUploadedImages(prev => [...prev, data.file_url]);
        toast({ title: "Image uploaded successfully!" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
    setUploading(false);
  };

  const insertImage = () => {
    if (imageUrl) {
      const imgTag = `\n<img src="${imageUrl}" alt="Image" style="max-width: 100%; height: auto;" />\n`;
      setMessage(prev => prev + imgTag);
      setImageUrl("");
      setShowImageDialog(false);
    }
  };

  const insertUploadedImage = (url) => {
    const imgTag = `\n<img src="${url}" alt="Uploaded Image" style="max-width: 100%; height: auto;" />\n`;
    setMessage(prev => prev + imgTag);
  };

  const formatText = (format) => {
    const textarea = document.querySelector('textarea[name="message"]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    let formattedText = "";
    switch (format) {
      case 'bold':
        formattedText = `<strong>${selectedText || 'bold text'}</strong>`;
        break;
      case 'italic':
        formattedText = `<em>${selectedText || 'italic text'}</em>`;
        break;
      case 'link':
        const url = prompt("Enter URL:");
        if (url) {
          formattedText = `<a href="${url}" style="color: #14b8a6; text-decoration: underline;">${selectedText || url}</a>`;
        }
        break;
      case 'h1':
        formattedText = `<h1 style="font-size: 24px; font-weight: bold; margin: 16px 0;">${selectedText || 'Heading'}</h1>`;
        break;
      case 'h2':
        formattedText = `<h2 style="font-size: 20px; font-weight: bold; margin: 14px 0;">${selectedText || 'Subheading'}</h1>`;
        break;
    }

    if (formattedText) {
      const newMessage = message.substring(0, start) + formattedText + message.substring(end);
      setMessage(newMessage);
    }
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
        toast({ title: "No users to send to", description: "The selected recipient or filter yielded no users.", variant: "destructive" });
        setSending(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Get all active products for potential dynamic content
      const allProducts = await base44.entities.Product.filter({ status: 'active' });

      for (const targetUser of targetUsers) {
        try {
          let finalMessage = message;

          // Add product recommendations if available
          if (targetUser.recently_viewed && targetUser.recently_viewed.length > 0) {
            const recentProducts = targetUser.recently_viewed
              .map(id => allProducts.find(p => p.id === id))
              .filter(p => p) // Filter out any products not found or inactive
              .slice(0, 3); // Limit to top 3

            if (recentProducts.length > 0) {
              const productsHTML = `
                <div style="margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
                  <h3 style="margin: 0 0 16px 0; color: #111827;">Products You Viewed</h3>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                    ${recentProducts.map(p => `
                      <div style="width: 120px; background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        ${p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.name}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />` : ''}
                        <h4 style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</h4>
                        <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #14b8a6;">$${p.price.toFixed(2)}</p>
                        <a href="${window.location.origin}/ProductDetail?id=${p.id}" style="display: inline-block; padding: 4px 8px; background: #14b8a6; color: white; text-decoration: none; border-radius: 6px; font-size: 11px; font-weight: 500;">View</a>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
              finalMessage += productsHTML;
            }
          }

          await base44.functions.invoke('sendEmail', {
            to: targetUser.email,
            subject: subject,
            body: finalMessage,
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

      // Reset form
      setRecipient("");
      setSubject("");
      setMessage("");
      setUploadedImages([]);
      setAudienceFilter("all"); // Reset audience filter after sending
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

              {/* Formatting Toolbar */}
              <div>
                <Label className="text-white mb-2 block">Message * (HTML supported)</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => formatText('bold')}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => formatText('italic')}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => formatText('link')}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => formatText('h1')}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    H1
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => formatText('h2')}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    H2
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowImageDialog(true)}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Image URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById('imageUpload').click()}
                    disabled={uploading}
                    className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </>
                    )}
                  </Button>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <Textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message... (HTML tags supported)"
                  rows={10}
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
                />
              </div>

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div>
                  <Label className="text-white">Uploaded Images (click to insert)</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {uploadedImages.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => insertUploadedImage(url)}
                        className="relative aspect-square rounded overflow-hidden border-2 border-slate-700 hover:border-cyan-500 transition-all"
                      >
                        <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Image URL Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Insert Image URL</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the URL of an image to insert into your email
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImageDialog(false)}
              className="bg-slate-700 text-white border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={insertImage}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
