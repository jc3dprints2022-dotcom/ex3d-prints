import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function MakerApplicationsSection() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const allApplications = await base44.entities.MakerApplication.list();
      setApplications(allApplications.sort((a, b) =>
        new Date(b.created_date) - new Date(a.created_date)
      ));
    } catch (error) {
      console.error("Failed to load applications:", error);
      toast({ title: "Failed to load applications", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleApproveApplication = async (application) => {
    if (!confirm(`Approve ${application.full_name} as a maker?`)) return;

    setProcessing(application.id);
    try {
      const result = await base44.functions.invoke('approveMakerApplication', {
        applicationId: application.id
      });
      
      if (result.data?.success) {
        toast({ title: "Application approved!", description: `${application.full_name} is now an active maker.` });
        await loadApplications();
      } else {
        throw new Error(result.data?.error || "An unknown error occurred during approval.");
      }
    } catch (error) {
      console.error("Approval error:", error);
      toast({ title: "Failed to approve application", description: error.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleRejectApplication = async (application) => {
    const reason = prompt("Please provide a reason for rejection (this will be sent to the applicant):");
    if (!reason) return;

    setProcessing(application.id);
    try {
      const result = await base44.functions.invoke('rejectMakerApplication', {
        applicationId: application.id,
        reason: reason
      });

      if (result.data?.success) {
        toast({ title: "Application rejected", description: "Notification sent to applicant." });
        await loadApplications();
      } else {
        throw new Error(result.data?.error || "An unknown error occurred during rejection.");
      }
    } catch (error) {
      console.error("Rejection error:", error);
      toast({ title: "Failed to reject application", description: error.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Pending Maker Applications</CardTitle>
          <p className="text-slate-400 text-sm">Review and approve new maker applications</p>
        </CardHeader>
        <CardContent>
          {applications.filter(a => a.status === 'pending').length === 0 ? (
            <p className="text-center text-gray-400 py-8">No pending applications</p>
          ) : (
            <div className="space-y-4">
              {applications.filter(a => a.status === 'pending').map((app) => (
                <div key={app.id} className="bg-slate-900 p-6 rounded-lg border border-cyan-500/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{app.full_name}</h3>
                      <p className="text-gray-400">{app.email}</p>
                      <p className="text-gray-400">{app.phone}</p>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Pending
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Experience</p>
                      <p className="text-white capitalize">{app.experience_level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Weekly Capacity</p>
                      <p className="text-white">{app.weekly_capacity} hours</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Materials</p>
                      <p className="text-white">{app.materials?.join(', ') || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Colors</p>
                      <p className="text-white">{app.colors?.join(', ') || 'Not specified'}</p>
                    </div>
                    {app.admin_notes && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-400">Admin Notes</p>
                        <p className="text-white">{app.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproveApplication(app)}
                      disabled={processing === app.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleRejectApplication(app)}
                      disabled={processing === app.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Applications History */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">All Applications</CardTitle>
          <p className="text-slate-400 text-sm">Overview of all processed and pending applications</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-slate-900 p-4 rounded-lg border border-cyan-500/10 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{app.full_name}</p>
                  <p className="text-sm text-gray-400">{app.email}</p>
                  <p className="text-xs text-gray-500">{new Date(app.created_date).toLocaleDateString()}</p>
                </div>
                <Badge className={
                  app.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  app.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }>
                  {app.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}