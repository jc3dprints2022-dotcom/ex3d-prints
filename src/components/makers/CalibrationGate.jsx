import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle, Clock, XCircle, Download, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function CalibrationGate({ user, children }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [calibrationStlUrl, setCalibrationStlUrl] = useState(localStorage.getItem("calibration_stl_url") || "");
  const { toast } = useToast();

  useEffect(() => {
    loadSubmission();
  }, [user?.maker_id]);

  const loadSubmission = async () => {
    if (!user?.maker_id) { setLoading(false); return; }
    setLoading(true);
    const subs = await base44.entities.CalibrationSubmission.filter({ maker_id: user.maker_id });
    // Get most recent
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
      toast({ title: "Please upload at least one image of your calibration cube", variant: "destructive" });
      return;
    }
    await base44.entities.CalibrationSubmission.create({
      maker_id: user.maker_id,
      maker_name: user.full_name,
      maker_email: user.email,
      images,
      status: "pending"
    });
    toast({ title: "Calibration submitted for review! You'll be notified once approved." });
    setImages([]);
    loadSubmission();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  // Approved — show children (printers + filament)
  if (submission?.status === "approved") return <>{children}</>;

  // Not submitted yet or rejected
  return (
    <div className="space-y-4">
      <Card className={`border-2 ${submission?.status === "rejected" ? "border-red-400" : "border-orange-400"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {submission?.status === "pending" ? (
              <><Clock className="w-5 h-5 text-yellow-500" /> Calibration Pending Review</>
            ) : submission?.status === "rejected" ? (
              <><XCircle className="w-5 h-5 text-red-500" /> Calibration Rejected — Resubmit</>
            ) : (
              <><Lock className="w-5 h-5 text-orange-500" /> Calibration Required</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission?.status === "pending" && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
              <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
              <p className="font-semibold text-yellow-900">Awaiting Admin Review</p>
              <p className="text-sm text-yellow-700 mt-1">Your calibration cube has been submitted. You'll receive an email once reviewed.</p>
              <p className="text-xs text-gray-500 mt-2">Submitted: {new Date(submission.created_date).toLocaleDateString()}</p>
            </div>
          )}

          {submission?.status === "rejected" && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-semibold text-red-900 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-700">{submission.rejection_reason || "Please reprint and resubmit."}</p>
            </div>
          )}

          {submission?.status !== "pending" && (
            <>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-semibold text-orange-900 mb-2">📦 Step 1 — Download & Print the Calibration Cube</p>
                <p className="text-sm text-orange-700 mb-3">
                  Download and print the official EX3D calibration cube. Upload a clear image of your printed cube for approval before you can add printers and filament.
                </p>
                {calibrationStlUrl ? (
                  <a href={calibrationStlUrl} download target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-orange-400 text-orange-700">
                      <Download className="w-4 h-4 mr-2" /> Download Calibration STL
                    </Button>
                  </a>
                ) : (
                  <p className="text-xs text-gray-500 italic">Calibration STL not yet uploaded by admin. Check back soon.</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-2">📸 Step 2 — Upload Photo(s) of Printed Cube</p>
                <p className="text-sm text-gray-600 mb-3">Multiple angles recommended (front, top, side).</p>
                <Input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="mb-2" />
                {uploading && <p className="text-sm text-gray-500 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</p>}
                {images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt={`Cube ${i + 1}`} className="w-20 h-20 object-cover rounded border" />
                        <button
                          onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={uploading || images.length === 0} className="bg-orange-600 hover:bg-orange-700 w-full">
                <Upload className="w-4 h-4 mr-2" /> Submit for Approval
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Locked sections preview */}
      <div className="opacity-40 pointer-events-none select-none">
        <div className="p-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-600">Printers & Filament Locked</p>
          <p className="text-sm text-gray-500">Complete calibration approval to unlock</p>
        </div>
      </div>
    </div>
  );
}