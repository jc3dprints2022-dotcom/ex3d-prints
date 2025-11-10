import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BrandingKit() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Get marketing resources from MarketingResource entity
      const resources = await base44.entities.MarketingResource.list();
      setFiles(resources);
    } catch (error) {
      console.error("Failed to load files:", error);
      toast({ 
        title: "Failed to load marketing resources",
        description: error.message,
        variant: "destructive" 
      });
    }
    setLoading(false);
  };

  const handleDownload = async (file) => {
    try {
      toast({ title: "Preparing download..." });
      
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || file.title || 'marketing_resource';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast({ title: "Download started!" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ 
        title: "Failed to download file", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Marketing Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {files.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Download marketing materials provided by EXpressPrints to help promote your maker services.
                </p>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.title || file.file_name}</p>
                      {file.description && (
                        <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(file.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  No marketing materials available yet. Check back soon!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}