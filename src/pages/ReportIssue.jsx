import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Bug, Lightbulb, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ReportIssuePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    report_type: "bug",
    title: "",
    description: "",
    priority: "medium"
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        ...formData,
        user_id: user?.id || null,
        user_email: user?.email || "anonymous@example.com",
        user_name: user?.full_name || "Anonymous User",
        page_url: document.referrer || window.location.href,
        status: "new"
      };

      const report = await base44.entities.FeedbackReport.create(reportData);

      // Send notification email to admin
      await base44.functions.invoke('notifyAdminFeedback', { reportId: report.id });

      setSubmitted(true);
      toast({
        title: "Report submitted successfully!",
        description: "An admin will review your feedback soon."
      });

      // Reset form
      setFormData({
        report_type: "bug",
        title: "",
        description: "",
        priority: "medium"
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Failed to submit report",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Report an Issue or Request a Feature</h1>
          <p className="text-lg text-gray-600">
            Help us improve EX3DPrints by reporting bugs or suggesting new features
          </p>
        </div>

        {submitted && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              Thank you for your feedback! We've received your report and will review it shortly.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Submit Your Feedback</CardTitle>
            <CardDescription>
              Whether you've found a bug or have an idea for improvement, we want to hear from you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="report_type">What type of feedback is this? *</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                >
                  <SelectTrigger id="report_type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">
                      <div className="flex items-center gap-2">
                        <Bug className="w-4 h-4 text-red-500" />
                        Bug Report - Something isn't working
                      </div>
                    </SelectItem>
                    <SelectItem value="feature_request">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Feature Request - New functionality
                      </div>
                    </SelectItem>
                    <SelectItem value="improvement">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        Improvement - Enhance existing feature
                      </div>
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority Level *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor issue or nice-to-have</SelectItem>
                    <SelectItem value="medium">Medium - Affects usability</SelectItem>
                    <SelectItem value="high">High - Blocking important tasks</SelectItem>
                    <SelectItem value="critical">Critical - System is unusable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title / Summary *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue or feature"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide as much detail as possible. For bugs: steps to reproduce, expected vs actual behavior. For features: how it would work and why it's useful."
                  rows={8}
                  className="mt-2"
                  required
                />
              </div>

              {user && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    Submitting as: <strong>{user.full_name}</strong> ({user.email})
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Your feedback helps us make EX3DPrints better for everyone. Thank you for taking the time to report!
          </p>
        </div>
      </div>
    </div>
  );
}