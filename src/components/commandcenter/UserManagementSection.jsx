
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, UserCheck, UserX, Mail, Star, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UserManagementSection() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Changed from base44.asServiceRole.entities.User.list() to base44.entities.User.list()
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      toast({ title: "Failed to load users", variant: "destructive" });
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.maker_id?.toLowerCase().includes(query) ||
        u.designer_id?.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.business_roles?.includes(roleFilter));
    }

    setFilteredUsers(filtered);
  };

  const handleApproveApplication = async (application) => {
    try {
      // Note: This function assumes `application` object contains `id`, `user_id`, `phone`, `experience_level`, `weekly_capacity`.
      // It also assumes the `MakerApplication` entity exists.
      await base44.entities.MakerApplication.update(application.id, { status: 'approved' });

      const makerId = `maker-${Date.now()}`;
      await base44.entities.User.update(application.user_id, {
        maker_id: makerId,
        account_status: 'active',
        business_roles: ['consumer', 'maker'], // Assuming existing roles should be preserved or added to. This will overwrite if it's not an array append.
        phone: application.phone,
        experience_level: application.experience_level,
        weekly_capacity: application.weekly_capacity
      });

      // Send approval email
      const user = await base44.entities.User.get(application.user_id);
      await base44.functions.invoke('sendEmail', {
        to: user.email,
        subject: 'Maker Application Approved!',
        template: 'maker_application_approved',
        data: {
          name: user.full_name
        }
      });

      toast({ title: "Application approved!", description: "Maker has been notified via email." });
      // Corrected from `loadApplications()` to `loadUsers()` to be functional within this UserManagementSection component.
      loadUsers();
    } catch (error) {
      toast({ title: "Failed to approve application", description: error.message, variant: "destructive" });
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      // Changed from base44.asServiceRole.entities.User.update() to base44.entities.User.update()
      await base44.entities.User.update(userId, { account_status: 'frozen' });
      toast({ title: "User suspended successfully" });
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      toast({ title: "Failed to suspend user", variant: "destructive" });
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      // Changed from base44.asServiceRole.entities.User.update() to base44.entities.User.update()
      await base44.entities.User.update(userId, { account_status: 'active' });
      toast({ title: "User activated successfully" });
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      toast({ title: "Failed to activate user", variant: "destructive" });
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      consumer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      maker: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      designer: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      affiliate: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      admin: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      frozen: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      deactivated: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending_approval: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">User Management</h2>
          <p className="text-cyan-400">Manage customers, makers, and designers</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-cyan-500/30 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48 bg-slate-900 border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-cyan-500/30">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="consumer">Consumers</SelectItem>
                <SelectItem value="maker">Makers</SelectItem>
                <SelectItem value="designer">Designers</SelectItem>
                <SelectItem value="affiliate">Affiliates</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-cyan-400">Name</TableHead>
                <TableHead className="text-cyan-400">Email</TableHead>
                <TableHead className="text-cyan-400">Roles</TableHead>
                <TableHead className="text-cyan-400">Status</TableHead>
                <TableHead className="text-cyan-400">Joined</TableHead>
                <TableHead className="text-cyan-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id} className="border-slate-700">
                  <TableCell className="text-white font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-slate-300">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.business_roles?.map(role => (
                        <Badge key={role} className={`${getRoleBadgeColor(role)} border`}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(user.account_status)} border`}>
                      {user.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {new Date(user.created_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30"
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cyan-400">Full Name</Label>
                  <p className="text-white font-medium mt-1">{selectedUser.full_name}</p>
                </div>
                <div>
                  <Label className="text-cyan-400">Email</Label>
                  <p className="text-white font-medium mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-cyan-400">Account Status</Label>
                  <Badge className={`${getStatusBadgeColor(selectedUser.account_status)} border mt-1`}>
                    {selectedUser.account_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-cyan-400">Roles</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedUser.business_roles?.map(role => (
                      <Badge key={role} className={`${getRoleBadgeColor(role)} border`}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {selectedUser.maker_id && (
                <div className="bg-slate-900 p-4 rounded-lg border border-orange-500/30">
                  <h4 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Maker Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Maker ID:</span>
                      <span className="text-white ml-2">{selectedUser.maker_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Experience:</span>
                      <span className="text-white ml-2 capitalize">{selectedUser.experience_level || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedUser.designer_id && (
                <div className="bg-slate-900 p-4 rounded-lg border border-pink-500/30">
                  <h4 className="font-semibold text-pink-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Designer Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Designer ID:</span>
                      <span className="text-white ml-2">{selectedUser.designer_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white ml-2">{selectedUser.designer_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedUser?.account_status === 'active' ? (
              <Button
                variant="destructive"
                onClick={() => handleSuspendUser(selectedUser.id)}
                className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              >
                <UserX className="w-4 h-4 mr-2" />
                Suspend User
              </Button>
            ) : (
              <Button
                onClick={() => handleActivateUser(selectedUser.id)}
                className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Activate User
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedUser(null)} className="bg-slate-700 text-white border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
