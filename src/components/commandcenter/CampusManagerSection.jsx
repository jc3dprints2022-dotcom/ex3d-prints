import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MapPin, UserCheck, X, Building } from "lucide-react";

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
  { value: "erau_daytona", label: "ERAU Daytona" },
  { value: "arizona_state", label: "Arizona State University" },
];

export default function CampusManagerSection() {
  const [users, setUsers] = useState([]);
  const [campusManagers, setCampusManagers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
      
      // Find current campus managers
      const managers = {};
      CAMPUS_LOCATIONS.forEach(campus => {
        const manager = allUsers.find(u => 
          u.managed_campus === campus.value && 
          u.business_roles?.includes('campus_manager')
        );
        managers[campus.value] = manager || null;
      });
      setCampusManagers(managers);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleAssignManager = async (campusValue, userId) => {
    setSaving(campusValue);
    try {
      // Remove campus_manager role from previous manager
      const previousManager = campusManagers[campusValue];
      if (previousManager) {
        const updatedRoles = (previousManager.business_roles || []).filter(r => r !== 'campus_manager');
        await base44.entities.User.update(previousManager.id, {
          business_roles: updatedRoles,
          managed_campus: null
        });
      }

      // Assign new manager
      if (userId) {
        const user = users.find(u => u.id === userId);
        const updatedRoles = [...new Set([...(user.business_roles || ['consumer']), 'campus_manager'])];
        await base44.entities.User.update(userId, {
          business_roles: updatedRoles,
          managed_campus: campusValue
        });
      }

      toast({ title: userId ? "Campus manager assigned!" : "Campus manager removed" });
      await loadData();
    } catch (error) {
      console.error("Failed to assign manager:", error);
      toast({ title: "Failed to update manager", variant: "destructive" });
    }
    setSaving(null);
  };

  const handleRemoveManager = async (campusValue) => {
    await handleAssignManager(campusValue, null);
  };

  const getCampusLabel = (value) => {
    return CAMPUS_LOCATIONS.find(c => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Campus Managers</h2>
        <p className="text-cyan-400">Assign users to manage specific campuses. Campus managers have access to a dedicated management center for their campus.</p>
      </div>

      <div className="grid gap-6">
        {CAMPUS_LOCATIONS.map(campus => {
          const manager = campusManagers[campus.value];
          
          return (
            <Card key={campus.value} className="bg-slate-800 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Building className="w-5 h-5 text-cyan-400" />
                  {campus.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {manager ? (
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{manager.full_name}</p>
                        <p className="text-sm text-gray-400">{manager.email}</p>
                      </div>
                      <Badge className="bg-cyan-600 text-white ml-2">Campus Manager</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveManager(campus.value)}
                      disabled={saving === campus.value}
                      className="text-red-400 border-red-400 hover:bg-red-900/50"
                    >
                      {saving === campus.value ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">No campus manager assigned</p>
                    <div className="flex gap-3">
                      <Select
                        onValueChange={(userId) => handleAssignManager(campus.value, userId)}
                        disabled={saving === campus.value}
                      >
                        <SelectTrigger className="w-64 bg-slate-900 border-slate-700 text-white">
                          {saving === campus.value ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <SelectValue placeholder="Select a user..." />
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {users
                            .filter(u => !u.managed_campus || u.managed_campus === campus.value)
                            .sort((a, b) => a.full_name?.localeCompare(b.full_name || ''))
                            .map(user => (
                              <SelectItem key={user.id} value={user.id} className="text-white">
                                {user.full_name} ({user.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Campus Managers List */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">All Campus Managers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(campusManagers).filter(([_, manager]) => manager).length === 0 ? (
              <p className="text-gray-400 text-center py-4">No campus managers assigned yet</p>
            ) : (
              Object.entries(campusManagers)
                .filter(([_, manager]) => manager)
                .map(([campus, manager]) => (
                  <div key={campus} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600">{getCampusLabel(campus)}</Badge>
                      <span className="text-white">{manager.full_name}</span>
                      <span className="text-gray-400 text-sm">({manager.email})</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}