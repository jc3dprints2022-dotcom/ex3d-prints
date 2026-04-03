import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, XCircle, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  pending: "bg-yellow-500 text-white",
  approved: "bg-green-600 text-white",
  rejected: "bg-red-500 text-white"
};

export default function CalibrationApprovalSection() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calibrationStlUrl, setCalibrationStlUrl] = useState(localStorage.getItem("calibration_stl_url") || "");
  const [overhangStlUrl, setOverhangStlUrl] = useState(localStorage.getItem("overhang_stl_url") || "");
  const [uploadingStl, setUploadingStl] = useState(false);
  const [uploadingOverhang, setUploadingOverhang] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState("pending");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    const data = await base44.entities.CalibrationSubmission.list("-created_date");
    setSubmissions(data);
    setLoading(false);
  };

  const handleStlUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStl(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCalibrationStlUrl(file_url);
    localStorage.setItem("calibration_stl_url", file_url);
    toast({ title: "Calibration Cube file uploaded!" });
    setUploadingStl(false);
    e.target.value = null;
  };

  const handleOverhangUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingOverhang(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setOverhangStlUrl(file_url);
    localStorage.setItem("overhang_stl_url", file_url);
    toast({ title: "Overhang Test file uploaded!" });
    setUploadingOverhang(false);
    e.target.value = null;
  };

  const handleApprove = async (submission) => {
    await base44.entities.CalibrationSubmission.update(submission.id, { status: "approved" });
    // Send email notification
    try {
      await base44.integrations.Core.SendEmail({
        to: submission.maker_email,
        subject: "🎉 Calibration Approved – EX3D Prints",
        body: `Hi ${submission.maker_name},\n\nGreat news! Your calibration cube submission has been approved. You can now add printers and filament to your maker profile.\n\nWelcome to the EX3D network!\n\nThe EX3D Team`
      });
    } catch {}
    toast({ title: "Calibration approved and maker notified!" });
    loadSubmissions();
  };

  const handleReject = async (submission) => {
    if (!rejectReason.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    await base44.entities.CalibrationSubmission.update(submission.id, {
      status: "rejected",
      rejection_reason: rejectReason
    });
    try {
      await base44.integrations.Core.SendEmail({
        to: submission.maker_email,
        subject: "Calibration Submission – Needs Adjustment | EX3D Prints",
        body: `Hi ${submission.maker_name},\n\nUnfortunately your calibration cube submission did not pass review.\n\nReason: ${rejectReason}\n\nPlease reprint the calibration cube with the necessary adjustments and resubmit.\n\nThe EX3D Team`
      });
    } catch {}
    toast({ title: "Submission rejected and maker notified." });
    setReviewingId(null);
    setRejectReason("");
    loadSubmissions();
  };

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Maker Calibration Approvals</h2>

      {/* Upload Official Approval Files */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader><CardTitle className="text-cyan-400">Official Printer Approval Files</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-gray-400 text-sm">Upload the files makers must download, print, and photograph before being approved to join the network.</p>

          {/* File 1 - Calibration Cube */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">1. Calibration Cube</p>
            {calibrationStlUrl && (
              <div className="flex items-center gap-3 p-3 bg-green-900/30 rounded border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-green-300 text-sm truncate flex-1">{calibrationStlUrl.split('/').pop()}</span>
                <a href={calibrationStlUrl} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs"><Download className="w-3 h-3 mr-1" /> Download</Button>
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Input type="file" accept=".stl,.obj,.3mf" onChange={handleStlUpload} disabled={uploadingStl} className="text-white" />
              {uploadingStl && <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />}
            </div>
          </div>

          {/* File 2 - Overhang Test */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">2. Overhang / Quality Test</p>
            {overhangStlUrl && (
              <div className="flex items-center gap-3 p-3 bg-green-900/30 rounded border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-green-300 text-sm truncate flex-1">{overhangStlUrl.split('/').pop()}</span>
                <a href={overhangStlUrl} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs"><Download className="w-3 h-3 mr-1" /> Download</Button>
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Input type="file" accept=".stl,.obj,.3mf" onChange={handleOverhangUpload} disabled={uploadingOverhang} className="text-white" />
              {uploadingOverhang && <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Queue */}
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-400">Submission Queue ({submissions.filter(s => s.status === "pending").length} pending)</CardTitle>
          <div className="flex gap-2">
            {["pending", "approved", "rejected", "all"].map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-xs capitalize" onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No {filter} submissions.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map(sub => (
                <div key={sub.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{sub.maker_name}</p>
                      <p className="text-sm text-gray-400">{sub.maker_email}</p>
                      <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(sub.created_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={STATUS_COLORS[sub.status]}>{sub.status}</Badge>
                  </div>

                  {/* Images */}
                  {sub.images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {sub.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                          <img src={img} alt={`Cube ${i + 1}`} className="w-24 h-24 object-cover rounded border border-slate-600 hover:border-cyan-400 cursor-zoom-in transition-colors" />
                        </a>
                      ))}
                    </div>
                  )}

                  {sub.rejection_reason && (
                    <div className="mb-3 p-2 bg-red-900/30 rounded border border-red-500/30">
                      <p className="text-xs text-red-400 font-medium">Rejection reason: {sub.rejection_reason}</p>
                    </div>
                  )}

                  {sub.status === "pending" && (
                    <div className="space-y-2">
                      {reviewingId === sub.id ? (
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Rejection reason *</Label>
                          <Textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g., Cube dimensions are off — X axis appears stretched. Please re-calibrate and reprint."
                            className="bg-slate-700 text-white"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={() => handleReject(sub)}>
                              <XCircle className="w-4 h-4 mr-1" /> Send Rejection
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setReviewingId(null); setRejectReason(""); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(sub)}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setReviewingId(sub.id)}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}