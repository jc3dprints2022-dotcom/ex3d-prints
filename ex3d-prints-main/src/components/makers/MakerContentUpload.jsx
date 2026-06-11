import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Image, CheckCircle, Clock, XCircle, AlertTriangle, DollarSign, Loader2, Film } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CLIP_CATEGORIES = [
  { value: "timelapse_print", label: "Timelapse Print" },
  { value: "bed_removal", label: "Bed Removal" },
  { value: "packaging", label: "Packaging" },
  { value: "final_product_shot", label: "Final Product Shot" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  pending:  { label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved",     color: "bg-green-100 text-green-800",   icon: CheckCircle },
  rejected: { label: "Rejected",     color: "bg-red-100 text-red-800",       icon: XCircle },
  flagged:  { label: "Flagged",      color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

export default function MakerContentUpload({ user }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.MakerContent.filter({ maker_user_id: user.id }, "-created_date", 100);
      setUploads(items);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addPendingFile = (e) => {
    const files = Array.from(e.target.files || []);
    const newPending = files.map(file => ({
      id: `${Date.now()}_${Math.random()}`,
      file,
      clip_category: "",
      notes: "",
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    e.target.value = "";
  };

  const updatePending = (id, field, value) => {
    setPendingFiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePending = (id) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast({ title: "Please agree to the usage rights terms", variant: "destructive" });
      return;
    }
    const invalid = pendingFiles.filter(p => !p.clip_category);
    if (invalid.length > 0) {
      toast({ title: "Please select a clip type for all files", variant: "destructive" });
      return;
    }
    if (pendingFiles.length === 0) {
      toast({ title: "Please select at least one file", variant: "destructive" });
      return;
    }

    setUploading(true);
    let successCount = 0;
    try {
      for (const pending of pendingFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: pending.file });
        await base44.entities.MakerContent.create({
          maker_id: user.maker_id,
          maker_user_id: user.id,
          maker_name: user.full_name,
          maker_email: user.email,
          file_url,
          file_type: pending.isVideo ? "video" : "image",
          file_name: pending.file.name,
          clip_category: pending.clip_category,
          notes: pending.notes || "",
          usage_rights_granted: true,
          status: "pending",
          payout_amount: 0.25,
          payout_status: "pending",
        });
        successCount++;
      }

      // Notify admin
      await base44.functions.invoke("sendEmail", {
        to: "jc3dprints2022@gmail.com",
        subject: `🎥 New Maker Content Submitted — ${user.full_name} (${successCount} clip${successCount > 1 ? "s" : ""})`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#0891b2;">New Maker Content Submitted</h2>
<p><strong>Maker:</strong> ${user.full_name} (${user.email})</p>
<p><strong>Clips submitted:</strong> ${successCount}</p>
<p><strong>Categories:</strong> ${[...new Set(pendingFiles.map(p => p.clip_category))].join(", ")}</p>
<div style="text-align:center;margin:24px 0;">
  <a href="https://ex3dprints.com/jc3dcommandcenter?section=makers" style="background:#0891b2;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">Review in Command Center →</a>
</div>
</div>`
      }).catch(() => {});

      // Notify maker
      await base44.functions.invoke("sendEmail", {
        to: user.email,
        subject: `✅ Content Submitted for Review — EX3D Prints`,
        body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#f97316;">Content Submitted!</h2>
<p>Hi ${user.full_name},</p>
<p>We received your ${successCount} clip${successCount > 1 ? "s" : ""}. Each approved clip earns you <strong>$0.25</strong> added to your maker balance.</p>
<p>We'll notify you by email once your content is reviewed (usually within 24–48 hours).</p>
<p>Thank you for contributing to the EX3D creator community!</p>
<p>— The EX3D Team</p>
</div>`
      }).catch(() => {});

      toast({ title: `${successCount} clip${successCount > 1 ? "s" : ""} submitted for review!`, description: "$0.25 per approved clip" });
      setPendingFiles([]);
      setAgreedToTerms(false);
      await loadUploads();
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const approvedUploads = uploads.filter(u => u.status === "approved");
  const totalEarned = approvedUploads.reduce((s, u) => s + (u.payout_amount || 0.25), 0);
  const monthlyEarned = approvedUploads
    .filter(u => new Date(u.approved_at || u.created_date) >= firstOfMonth)
    .reduce((s, u) => s + (u.payout_amount || 0.25), 0);
  const pendingCount = uploads.filter(u => u.status === "pending").length;
  const approvedCount = approvedUploads.length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">${totalEarned.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">${monthlyEarned.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{approvedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Approved Clips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Under Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-orange-500" />
            Upload Manufacturing Content
          </CardTitle>
          <p className="text-sm text-gray-500">Earn <strong>$0.25</strong> per approved clip — timelapses, bed removals, packaging, final shots</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* File picker */}
          <div>
            <input
              type="file"
              id="content-upload-input"
              accept="video/mp4,video/mov,video/quicktime,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={addPendingFile}
            />
            <button
              onClick={() => document.getElementById("content-upload-input").click()}
              className="w-full border-2 border-dashed border-orange-200 rounded-xl p-8 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <Upload className="w-10 h-10 text-orange-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">Click to select files</p>
              <p className="text-xs text-gray-400 mt-1">MP4, MOV, JPG, PNG — multiple files OK</p>
            </button>
          </div>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              {pendingFiles.map(pending => (
                <div key={pending.id} className="flex gap-3 p-3 border rounded-lg bg-gray-50 items-start">
                  {/* Preview */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                    {pending.isVideo ? (
                      <Video className="w-7 h-7 text-gray-400" />
                    ) : (
                      <img src={pending.preview} alt="preview" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{pending.file.name}</p>
                    <Select value={pending.clip_category} onValueChange={v => updatePending(pending.id, "clip_category", v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select clip type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIP_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <textarea
                      value={pending.notes}
                      onChange={e => updatePending(pending.id, "notes", e.target.value)}
                      placeholder="Optional notes..."
                      rows={1}
                      className="w-full text-xs border rounded px-2 py-1 resize-none"
                    />
                  </div>

                  <button onClick={() => removePending(pending.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Usage rights */}
          {pendingFiles.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span className="text-xs text-amber-900 leading-relaxed">
                  <strong>Usage Rights Agreement:</strong> By submitting, you grant EX3D Prints full rights to use this content for marketing, advertising, and platform promotion. Content ownership remains yours.
                </span>
              </label>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={uploading || !agreedToTerms}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
                : <><Upload className="w-4 h-4 mr-2" /> Submit {pendingFiles.length} Clip{pendingFiles.length > 1 ? "s" : ""} for Review</>
              }
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Past submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No submissions yet. Upload your first clip above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map(item => {
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                      {item.file_type === "video" ? <Video className="w-5 h-5 text-gray-400" /> : <Image className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.file_name || item.clip_category}</p>
                      <p className="text-xs text-gray-400">{CLIP_CATEGORIES.find(c => c.value === item.clip_category)?.label} · {new Date(item.created_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`${cfg.color} flex items-center gap-1 text-xs`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    {item.status === "approved" && (
                      <span className="text-xs font-bold text-green-600">+$0.25</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Content Payout Program</p>
            <p className="text-sm text-green-700 mt-1">
              Earn <strong>$0.25</strong> for every approved clip. Payouts are added to your monthly maker payout. Upload authentic manufacturing content — timelapses, bed removals, packaging clips, and final product shots are most valued.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}