import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

/**
 * FollowDesignerButton
 * Works for both logged-in and guest users.
 * Props: designerId, designerUserId, designerName, source ("listing_page" | "designer_profile")
 */
export default function FollowDesignerButton({ designerId, designerUserId, designerName, source = "listing_page" }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [globalOptIn, setGlobalOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [designerId]);

  const init = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      setUser(currentUser);
      if (currentUser && designerId) {
        const existing = await base44.entities.DesignerFollower.filter({
          designer_id: designerId,
          user_id: currentUser.id,
        });
        setIsFollowing(existing.length > 0);
        setEmail(currentUser.email || "");
        setName(currentUser.full_name || "");
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  const handleClick = async () => {
    if (isFollowing) {
      // Unfollow
      setSubmitting(true);
      try {
        if (user) {
          const existing = await base44.entities.DesignerFollower.filter({
            designer_id: designerId,
            user_id: user.id,
          });
          if (existing.length > 0) {
            await base44.entities.DesignerFollower.delete(existing[0].id);
          }
        }
        setIsFollowing(false);
        toast({ title: `Unfollowed ${designerName}` });
      } catch {
        toast({ title: "Failed to unfollow", variant: "destructive" });
      }
      setSubmitting(false);
      return;
    }

    if (user) {
      // Logged in — follow directly
      await doFollow(user.email, user.full_name, false);
    } else {
      // Guest — show email dialog
      setShowDialog(true);
    }
  };

  const doFollow = async (followEmail, followName, globalOpt) => {
    setSubmitting(true);
    try {
      await base44.entities.DesignerFollower.create({
        designer_id: designerId,
        designer_user_id: designerUserId || "",
        designer_name: designerName || "",
        user_id: user?.id || null,
        email: followEmail,
        name: followName || "",
        source,
        opted_in_global: globalOpt,
      });

      if (globalOpt) {
        base44.entities.NewsletterSubscriber.create({
          email: followEmail,
          name: followName || "",
          source: "signup",
          opted_in: true,
        }).catch(() => {});
      }

      setIsFollowing(true);
      setShowDialog(false);
      toast({
        title: `Following ${designerName}! 🔔`,
        description: "You'll be notified when this designer releases new products.",
        duration: 5000,
      });
    } catch (err) {
      toast({ title: "Failed to follow", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    await doFollow(email, name, globalOptIn);
  };

  if (!designerId) return null;
  if (loading) return <Button variant="outline" size="sm" disabled><Loader2 className="w-4 h-4 animate-spin" /></Button>;

  return (
    <>
      <Button
        variant={isFollowing ? "secondary" : "outline"}
        size="sm"
        onClick={handleClick}
        disabled={submitting}
        className={isFollowing
          ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
          : "border-blue-400 text-blue-600 hover:bg-blue-50"}
      >
        {submitting
          ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          : isFollowing
            ? <BellOff className="w-4 h-4 mr-1" />
            : <Bell className="w-4 h-4 mr-1" />
        }
        {isFollowing ? "Following" : `Follow ${designerName || "Designer"}`}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Follow {designerName}</DialogTitle>
            <DialogDescription>
              Enter your email to get notified when this designer releases new products.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGuestSubmit} className="space-y-4 mt-2">
            <div>
              <Label>Your Name (optional)</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="global_opt" checked={globalOptIn} onCheckedChange={setGlobalOptIn} />
              <Label htmlFor="global_opt" className="text-sm text-gray-600 cursor-pointer">
                Also get updates from EX3D Prints
              </Label>
            </div>
            <Button type="submit" disabled={submitting || !email} className="w-full bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              Follow Designer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}