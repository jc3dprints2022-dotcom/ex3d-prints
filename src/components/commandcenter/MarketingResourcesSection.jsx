import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Trash2, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MarketingResourcesSection() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    file: null,
    target_audience: "all"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const allResources = await base44.entities.MarketingResource.list();
      setResources(allResources.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error("Failed to load resources:", error);
      toast({
        title: "Failed to load resources",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.file) {
      toast({
        title: "Missing required fields",
        description: "Please provide a title and select a file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadData.file });

      // Create the marketing resource record
      await base44.entities.MarketingResource.create({
        title: uploadData.title,
        description: uploadData.description,
        file_url: file_url,
        file_name: uploadData.file.name,
        file_type: uploadData.file.type,
        target_audience: uploadData.target_audience
      });

      toast({
        title: "Resource uploaded successfully!",
        description: "Makers can now access this resource"
      });

      setShowUploadDialog(false);
      setUploadData({
        title: "",
        description: "",
        file: null,
        target_audience: "all"
      });
      loadResources();
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setUploading(false);
  };

  const handleDelete = async (resourceId) => {
    if (!confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    try {
      await base44.entities.MarketingResource.delete(resourceId);
      toast({
        title: "Resource deleted successfully"
      });
      loadResources();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Failed to delete resource",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Marketing Resources</h2>
          <p className="text-cyan-400">Upload and manage marketing materials for makers</p>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Resource
        </Button>
      </div>

      {/* Resources List */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Uploaded Resources ({resources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No resources uploaded yet</p>
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700"
              >
                Upload First Resource
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">{resource.title}</h3>
                      {resource.description && (
                        <p className="text-sm text-slate-400 mt-1">{resource.description}</p>
                      )}
                      <div className="flex gap-3 mt-3 text-xs text-slate-500">
                        <span>File: {resource.file_name}</span>
                        <span>•</span>
                        <span>Uploaded: {new Date(resource.created_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">For: {resource.target_audience}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(resource.file_url, '_blank')}
                        className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(resource.id)}
                        className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Marketing Resource</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new marketing resource for makers to download
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-300">Title *</Label>
              <Input
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="e.g., Maker Branding Guidelines"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Brief description of this resource..."
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Target Audience</Label>
              <select
                value={uploadData.target_audience}
                onChange={(e) => setUploadData({ ...uploadData, target_audience: e.target.value })}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md text-white"
              >
                <option value="all">All Users</option>
                <option value="makers">Makers Only</option>
                <option value="designers">Designers Only</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">File *</Label>
              <Input
                type="file"
                onChange={handleFileSelect}
                className="bg-slate-900 border-slate-700 text-white"
              />
              {uploadData.file && (
                <p className="text-sm text-slate-400 mt-2">
                  Selected: {uploadData.file.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              className="bg-slate-700 text-white border-slate-600"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadData.title || !uploadData.file}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}