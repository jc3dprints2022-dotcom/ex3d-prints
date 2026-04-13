import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, ExternalLink, User, Upload } from "lucide-react";

export default function DesignerSettingsTab({ user, onUpdate }) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileData, setProfileData] = useState({
    designer_name: user?.designer_name || "",
    full_name: user?.full_name || "",
    bio: user?.bio || "",
    profile_image: user?.profile_image || "",
  });
  const { toast } = useToast();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData(prev => ({ ...prev, profile_image: file_url }));
      toast({ title: "Image uploaded!" });
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingImage(false);
    e.target.value = null;
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({
        designer_name: profileData.designer_name,
        full_name: profileData.full_name,
        bio: profileData.bio,
        profile_image: profileData.profile_image,
      });
      toast({ title: "Profile updated!" });
      setEditingProfile(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to save profile", variant: "destructive" });
    }
    setSavingProfile(false);
  };

  const handleConnectStripe = async () => {
    try {
      const { data } = await base44.functions.invoke('createStripeConnectOnboarding');
      if (data.onboarding_url) window.location.href = data.onboarding_url;
    } catch (error) {
      toast({ title: "Failed to start Stripe onboarding", variant: "destructive" });
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const { data } = await base44.functions.invoke('getStripeDashboardLink');
      if (data.url) window.open(data.url, '_blank');
    } catch (error) {
      toast({ title: "Failed to open Stripe dashboard", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Designer Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editingProfile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{user?.full_name}</p>
                  {user?.designer_name && <p className="text-sm text-gray-600">@{user.designer_name}</p>}
                  {user?.bio && <p className="text-sm text-gray-500 mt-1">{user.bio}</p>}
                </div>
              </div>
              <Button variant="outline" onClick={() => setEditingProfile(true)}>Edit Profile</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {profileData.profile_image ? (
                  <img src={profileData.profile_image} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <Label htmlFor="profile_image_upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Change Photo
                      </span>
                    </Button>
                  </Label>
                  <input id="profile_image_upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </div>
              </div>

              <div>
                <Label>Display Name</Label>
                <Input value={profileData.full_name} onChange={e => setProfileData(p => ({ ...p, full_name: e.target.value }))} placeholder="Your display name" />
              </div>
              <div>
                <Label>Designer Username</Label>
                <Input value={profileData.designer_name} onChange={e => setProfileData(p => ({ ...p, designer_name: e.target.value }))} placeholder="your_username" />
                <p className="text-xs text-gray-500 mt-1">This is shown on your designs as @username</p>
              </div>
              <div>
                <Label>Bio</Label>
                <Input value={profileData.bio} onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))} placeholder="Short bio..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Profile
                </Button>
                <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Account</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Connect your Stripe account to receive royalty payments when your designs are sold.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.stripe_connect_account_id ? (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-900">Stripe Connected</p>
              </div>
              <p className="text-sm text-green-700 mb-3">
                You'll automatically receive 10% royalty payments when your designs are sold.
              </p>
              <Button variant="outline" size="sm" onClick={handleOpenStripeDashboard} className="border-green-400 text-green-700 hover:bg-green-100">
                <ExternalLink className="w-4 h-4 mr-1" />
                Access Stripe Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium mb-2">💰 Earn Royalties on Every Sale</p>
                <p className="text-sm text-blue-700">
                  Connect Stripe to receive 10% of every order featuring your designs. Funds are available in 2-3 business days.
                </p>
              </div>
              <Button onClick={handleConnectStripe} className="w-full bg-teal-600 hover:bg-teal-700">
                Connect Stripe Account
              </Button>
              <p className="text-xs text-gray-500 text-center">Powered by Stripe Connect — Secure and trusted by millions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}