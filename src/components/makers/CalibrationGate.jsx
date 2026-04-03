import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function CalibrationGate({ user, children }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [calibrationStlUrl] = useState(localStorage.getItem("calibration_stl_url") || "");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmission();
  }, [user?.maker_id]);

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

  // Approved — transparent, just render children
  if (!loading && submission?.status === "approved") {
    return <>{children}</>;
  }

  const isOpen = !loading && submission?.status !== "approved";

  return (
    <>
      {/* Still render children underneath (visible but non-functional) */}
      <div className={isOpen ? "pointer-events-none opacity-30 select-none" : ""}>{children}</div>

      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {submission?.status === "pending" ? (
                <><Clock className="w-5 h-5 text-yellow-500" /> Calibration Under Review</>
              ) : submission?.status === "rejected" ? (
                <><XCircle className="w-5 h-5 text-red-500" /> Calibration Needs Adjustment</>
              ) : (
                <>🖨️ Print Quality Calibration Required</>
              )}
            </DialogTitle>
            <DialogDescription>
              {submission?.status === "pending"
                ? "Your calibration print has been submitted and is awaiting admin review. You'll receive an email once approved."
                : submission?.status === "rejected"
                ? "Your previous submission was rejected. Please reprint using the calibration file and resubmit."
                : "Before you can register printers or filament, please confirm your print quality meets our standards."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {submission?.status === "pending" && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
                <p className="text-sm text-gray-600">Submitted on {new Date(submission.created_date).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">Check your email for updates.</p>
              </div>
            )}

            {submission?.status === "rejected" && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
                <p className="font-semibold mb-1">Rejection reason:</p>
                <p>{submission.rejection_reason || "Did not meet quality standards. Please reprint and resubmit."}</p>
              </div>
            )}

            {submission?.status !== "pending" && (
              <>
                {/* Step 1 */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="font-semibold text-orange-900 mb-1">Step 1 — Download & Print the Calibration File</p>
                  <p className="text-sm text-orange-700 mb-3">
                    Download the official EX3D calibration file, print it, and take clear photos of the result (multiple angles recommended).
                  </p>
                  {calibrationStlUrl ? (
                    <a href={calibrationStlUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-orange-400 text-orange-700">
                        <Download className="w-4 h-4 mr-2" /> Download Calibration File
                      </Button>
                    </a>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Calibration file not yet available. Check back soon or contact support.</p>
                  )}
                </div>

                {/* Step 2 */}
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Step 2 — Upload Photo(s) of Your Print</p>
                  <Input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="mb-2" />
                  {uploading && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </p>
                  )}
                  {images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative">
                          <img src={img} alt={`Print ${i + 1}`} className="w-20 h-20 object-cover rounded border" />
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
                  className="bg-orange-600 hover:bg-orange-700 w-full"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Upload className="w-4 h-4 mr-2" /> Submit for Approval</>}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}