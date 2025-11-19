import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, User, Mail, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DesignerApplicationsSection() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apps = await base44.entities.DesignerApplication.list('-created_date');
      setApplications(apps);
    } catch (error) {
      toast({ title: "Failed to load applications", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleApprove = async (application) => {
    if (!confirm(`Approve designer application for ${application.full_name}?`)) return;

    setProcessing(true);
    try {
      await base44.entities.DesignerApplication.update(application.id, {
        status: 'approved',
        admin_notes: adminNotes
      });

      const user = await base44.entities.User.get(application.user_id);
      const currentRoles = user.business_roles || ['consumer'];
      if (!currentRoles.includes('designer')) {
        currentRoles.push('designer');
      }

      // Generate unique designer ID
      const designerId = `designer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await base44.entities.User.update(application.user_id, {
        business_roles: currentRoles,
        designer_application_status: 'approved',
        designer_id: designerId
      });

      // Send approval email
      try {
        await base44.integrations.Core.SendEmail({
          to: application.email,
          subject: 'Designer Application Approved! - EX3D Prints',
          body: `Hi ${application.full_name},

Congratulations! Your designer application has been approved!

You can now access your Designer Dashboard and start uploading your 3D designs to earn 10% royalties on every sale.

Designer Name: ${application.designer_name}

Log in to your account to get started.

Best regards,
The EX3D Team`
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      toast({ title: "Designer application approved!" });
      setSelectedApp(null);
      setAdminNotes('');
      loadApplications();
    } catch (error) {
      toast({ title: "Failed to approve application", variant: "destructive" });
    }
    setProcessing(false);
  };

  const handleReject = async (application) => {
    if (!adminNotes.trim()) {
      toast({ title: "Please provide rejection reason", variant: "destructive" });
      return;
    }

    if (!confirm(`Reject designer application for ${application.full_name}?`)) return;

    setProcessing(true);
    try {
      await base44.entities.DesignerApplication.update(application.id, {
        status: 'rejected',
        admin_notes: adminNotes
      });

      await base44.entities.User.update(application.user_id, {
        designer_application_status: 'rejected'
      });

      toast({ title: "Designer application rejected" });
      setSelectedApp(null);
      setAdminNotes('');
      loadApplications();
    } catch (error) {
      toast({ title: "Failed to reject application", variant: "destructive" });
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');
  const rejectedApps = applications.filter(a => a.status === 'rejected');

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-red-400" />
            Designer Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{pendingApps.length}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm">Approved</p>
              <p className="text-3xl font-bold text-green-400">{approvedApps.length}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">Rejected</p>
              <p className="text-3xl font-bold text-red-400">{rejectedApps.length}</p>
            </div>
          </div>

          <div className="space-y-4">
            {applications.map(app => (
              <div
                key={app.id}
                className="bg-slate-800 border border-cyan-500/20 rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 transition-colors"
                onClick={() => {
                  setSelectedApp(app);
                  setAdminNotes(app.admin_notes || '');
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      {app.full_name}
                      <Badge className={
                        app.status === 'pending' ? 'bg-yellow-500' :
                        app.status === 'approved' ? 'bg-green-500' :
                        'bg-red-500'
                      }>
                        {app.status}
                      </Badge>
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">Designer Name: {app.designer_name}</p>
                    <p className="text-gray-400 text-sm">{app.email}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Applied: {new Date(app.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}

            {applications.length === 0 && (
              <div className="text-center py-12">
                <Palette className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-500">No designer applications yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Designer Application Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review and process designer application
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-cyan-400">Full Name</Label>
                    <p className="text-white mt-1">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-cyan-400">Designer Name</Label>
                    <p className="text-white mt-1">{selectedApp.designer_name}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-cyan-400">Email</Label>
                  <p className="text-white mt-1">{selectedApp.email}</p>
                </div>

                <div>
                  <Label className="text-cyan-400">Bio</Label>
                  <p className="text-white mt-1 bg-slate-800 p-3 rounded">{selectedApp.bio}</p>
                </div>

                <div>
                  <Label className="text-cyan-400">Experience Level</Label>
                  <p className="text-white mt-1">{selectedApp.experience_level}</p>
                </div>

                <div>
                  <Label className="text-cyan-400">Design Categories</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedApp.design_categories?.map((cat, i) => (
                      <Badge key={i} variant="outline" className="border-cyan-500/30 text-cyan-400">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedApp.portfolio_links && selectedApp.portfolio_links.length > 0 && (
                  <div>
                    <Label className="text-cyan-400">Portfolio Links</Label>
                    <div className="mt-2 space-y-1">
                      {selectedApp.portfolio_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-400 hover:underline text-sm"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="admin-notes" className="text-cyan-400">Admin Notes / Feedback</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes or feedback..."
                  rows={4}
                  className="mt-2 bg-slate-800 border-cyan-500/30 text-white"
                />
              </div>

              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-cyan-500/20">
                  <Button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedApp)}
                    disabled={processing}
                    variant="destructive"
                    className="flex-1"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              )}

              {selectedApp.admin_notes && selectedApp.status !== 'pending' && (
                <div className="bg-slate-800 p-4 rounded border border-cyan-500/20">
                  <Label className="text-cyan-400">Previous Admin Notes</Label>
                  <p className="text-gray-300 mt-2">{selectedApp.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}