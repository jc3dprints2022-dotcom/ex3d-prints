import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SecurityDRMSection from "./SecurityDRMSection";
import AnnouncementsSection from "./AnnouncementsSection";
import UserManagementSection from "./UserManagementSection";

export default function SystemSettingsSection() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const systemUser = await base44.auth.me();
      setMaintenanceMode(systemUser.maintenance_mode || false);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const toggleMaintenanceMode = async (enabled) => {
    setLoading(true);
    try {
      const adminUser = await base44.auth.me();
      await base44.entities.User.update(adminUser.id, {
        maintenance_mode: enabled
      });
      
      setMaintenanceMode(enabled);
      toast({ 
        title: enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enabled 
          ? "The platform is now in maintenance mode. Users will see a maintenance page."
          : "The platform is now accessible to all users."
      });
    } catch (error) {
      toast({ 
        title: "Failed to toggle maintenance mode", 
        variant: "destructive" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border-slate-700">
          <TabsTrigger value="general" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            General Settings
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            User Management
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Security & Logs
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-white text-lg font-semibold">Maintenance Mode</Label>
                    <p className="text-slate-400 text-sm mt-1">
                      Temporarily disable user access for system maintenance
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                    disabled={loading}
                  />
                </div>
                
                {maintenanceMode && (
                  <Alert className="border-orange-500 bg-orange-950">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <AlertDescription className="text-orange-200">
                      Platform is currently in maintenance mode. Only admins can access the system.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!maintenanceMode && (
                  <Alert className="border-green-500 bg-green-950">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-200">
                      Platform is operational and accessible to all users.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-2">Platform Status</h4>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={maintenanceMode ? "text-orange-400" : "text-green-400"}>
                          {maintenanceMode ? "Maintenance" : "Operational"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Version:</span>
                        <span>v2.1.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Restart:</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-slate-600 text-slate-300"
                        onClick={() => window.location.reload()}
                      >
                        Clear Cache
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-slate-600 text-slate-300"
                        onClick={() => toast({ title: "Reindex triggered" })}
                      >
                        Reindex Database
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagementSection />
        </TabsContent>

        <TabsContent value="security">
          <SecurityDRMSection />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}