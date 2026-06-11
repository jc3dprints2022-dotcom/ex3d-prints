import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Download, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CalibrationGate({ user, children }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [calibrationStlUrl, setCalibrationStlUrl] = useState("");
  const [overhangStlUrl, setOverhangStlUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmission();
    loadStlUrls();
  }, [user?.maker_id]);

  const loadStlUrls = async () => {
    const resources = await base44.entities.MarketingResource.list();
    const calibration = resources.find(r => r.title === "calibration_cube_stl");
    const overhang = resources.find(r => r.title === "overhang_test_stl");
    if (calibration) setCalibrationStlUrl(calibration.file_url);
    if (overhang) setOverhangStlUrl(overhang.file_url);
  };

  const loadSubmission = async () => {
    if (!user?.maker_id) { setLoading(false); return; }
    setLoading(true);
    const subs = await base44.entities.CalibrationSubmission.filter({ maker_id: user.maker_id });
    const sorted = subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setSubmission(sorted[0] || null);
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const results = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
    setImages(prev => [...prev, ...results.map(r => r.file_url)]);
    toast({ title: `${files.length} image(s) uploaded` });
    setUploading(false);
    e.target.value = null;
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      toast({ title: "Please upload at least one image of your calibration print", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await base44.entities.CalibrationSubmission.create({
      maker_id: user.maker_id,
      maker_name: user.full_name,
      maker_email: user.email,
      images,
      status: "pending"
    });
    toast({ title: "Submitted! You'll receive an email once reviewed." });
    setImages([]);
    setSubmitting(false);
    loadSubmission();
  };

  // Approved — just render children with no banner
  if (!loading && submission?.status === "approved") {
    return <>{children}</>;
  }

  // Not yet loaded — render children normally while loading
  if (loading) {
    return <>{children}</>;
  }

  // Non-blocking top banner
  const bannerColor = submission?.status === "pending"
    ? "bg-yellow-50 border-yellow-300"
    : submission?.status === "rejected"
    ? "bg-red-50 border-red-300"
    : "bg-orange-50 border-orange-300";

  const bannerIcon = submission?.status === "pending"
    ? <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
    : submission?.status === "rejected"
    ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    : <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />;

  return (
    <div className="space-y-4">
      {/* Non-blocking top banner */}
      <div className={`p-4 rounded-lg border ${bannerColor}`}>
        <div className="flex items-start gap-3">
          {bannerIcon}
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              submission?.status === "pending" ? "text-yellow-900" :
              submission?.status === "rejected" ? "text-red-900" : "text-orange-900"
            }`}>
              {submission?.status === "pending"
                ? "⏳ Calibration Under Review — Orders on Hold"
                : submission?.status === "rejected"
                ? "❌ Calibration Rejected — Please Resubmit"
                : "⚠️ Printer Approval Required Before Receiving Orders"}
            </p>
            <p className={`text-sm mt-1 ${
              submission?.status === "pending" ? "text-yellow-800" :
              submission?.status === "rejected" ? "text-red-800" : "text-orange-800"
            }`}>
              {submission?.status === "pending"
                ? "Your calibration print is under review. You won't receive orders until approved — usually within 24 hours."
                : submission?.status === "rejected"
                ? `Your submission was rejected. Please review the feedback and resubmit. Reason: ${submission.rejection_reason || "Did not meet quality standards."}`
                : "Complete the print quality approval below to start receiving orders."}
            </p>
            {submission?.status === "pending" && (
              <p className="text-xs text-yellow-700 mt-1">Submitted on {new Date(submission.created_date).toLocaleDateString()}</p>
            )}

            {/* Inline submission form (non-blocking) */}
            {submission?.status !== "pending" && (
              <div className="mt-4 space-y-3 border-t border-orange-200 pt-3">
                <p className="text-sm font-semibold text-orange-900">Step 1 — Download & Print Calibration Files</p>
                <div className="flex flex-wrap gap-2">
                  {calibrationStlUrl ? (
                    <a href={calibrationStlUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-orange-400 text-orange-700 bg-white">
                        <Download className="w-4 h-4 mr-2" /> Calibration Cube
                      </Button>
                    </a>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Calibration cube file not yet available.</p>
                  )}
                  {overhangStlUrl ? (
                    <a href={overhangStlUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-orange-400 text-orange-700 bg-white">
                        <Download className="w-4 h-4 mr-2" /> Overhang Test
                      </Button>
                    </a>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-900 mb-1">Step 2 — Upload Photo(s) of Your Print</p>
                  <Input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="mb-2 bg-white" />
                  {uploading && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </p>
                  )}
                  {images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative">
                          <img src={img} alt={`Print ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                          <button
                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading || submitting || images.length === 0}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Upload className="w-4 h-4 mr-2" /> Submit for Approval</>}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children are always accessible (non-blocking) */}
      {children}
    </div>
  );
}