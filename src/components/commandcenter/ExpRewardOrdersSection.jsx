import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Package, Loader2, CheckCircle, X, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ExpRewardOrdersSection() {
  const [redemptions, setRedemptions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [redemptionsData, rewardsData, usersData] = await Promise.all([
        base44.entities.ExpRedemption.list(),
        base44.entities.ExpReward.list(),
        base44.entities.User.list()
      ]);

      // Filter only non-print maker rewards
      const filteredRedemptions = redemptionsData.filter(r => {
        const reward = rewardsData.find(rw => rw.id === r.reward_id);
        return reward?.reward_type === 'maker' && reward?.category !== 'print';
      });

      setRedemptions(filteredRedemptions.sort((a, b) => b.created_date.localeCompare(a.created_date)));
      setRewards(rewardsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (redemptionId, newStatus) => {
    const notes = newStatus === 'fulfilled' 
      ? prompt('Add fulfillment notes (optional):')
      : prompt('Cancellation reason:');

    if (newStatus === 'cancelled' && !notes) {
      return;
    }

    setUpdating(redemptionId);
    try {
      await base44.entities.ExpRedemption.update(redemptionId, {
        status: newStatus,
        fulfillment_notes: notes || undefined
      });

      toast({
        title: "Status updated",
        description: `Redemption marked as ${newStatus}`
      });

      await loadData();
    } catch (error) {
      console.error('Failed to update redemption:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setUpdating(null);
  };

  const handleMarkDroppedOff = async (redemptionId) => {
    if (!confirm("Confirm that this reward has been dropped off?")) {
      return;
    }

    setUpdating(redemptionId);
    try {
      const redemption = redemptions.find(r => r.id === redemptionId);
      await base44.entities.ExpRedemption.update(redemptionId, {
        status: 'fulfilled',
        fulfillment_notes: `Dropped off at ${new Date().toLocaleString()}`
      });

      // Send email to user
      const user = users.find(u => u.id === redemption.user_id);
      if (user) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: user.email,
            subject: 'Your EXP Reward is Ready for Pickup! - EX3D Prints',
            body: `Hi ${user.full_name},

Great news! Your EXP reward "${redemption.reward_name}" is ready for pickup!

Reward Details:
- Item: ${redemption.reward_name}
- EXP Cost: ${redemption.exp_cost} EXP

Please contact Jacob at labaghr@my.erau.edu or 610-858-3200 to arrange pickup.

Thank you for being a valued member of EX3D Prints!

Best regards,
The EX3D Team`
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      toast({
        title: "Marked as dropped off",
        description: "User has been notified via email"
      });

      await loadData();
    } catch (error) {
      console.error('Failed to mark dropped off:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
    setUpdating(null);
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'filament': 'bg-purple-500',
      'equipment': 'bg-blue-500',
      'accessory': 'bg-green-500',
      'discount': 'bg-yellow-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">EXP Reward Orders</h2>
        <p className="text-cyan-400">Manage non-print maker reward fulfillment (filament, equipment, accessories)</p>
      </div>

      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pending Reward Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No reward orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">User</TableHead>
                    <TableHead className="text-slate-300">Reward</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    <TableHead className="text-slate-300">EXP Cost</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map(redemption => {
                    const user = users.find(u => u.id === redemption.user_id);
                    const reward = rewards.find(r => r.id === redemption.reward_id);

                    return (
                      <TableRow key={redemption.id} className="border-slate-700">
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{user?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-400">{user?.email || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            {reward?.image_url && (
                              <img src={reward.image_url} alt={redemption.reward_name} className="w-10 h-10 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-medium">{redemption.reward_name}</p>
                              {redemption.fulfillment_notes && (
                                <p className="text-xs text-slate-400 mt-1">{redemption.fulfillment_notes}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeColor(reward?.category)}>
                            {reward?.category || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-cyan-400 font-semibold">
                          {redemption.exp_cost} EXP
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(redemption.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            redemption.status === 'fulfilled' ? 'bg-green-500' :
                            redemption.status === 'pending' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }>
                            {redemption.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {redemption.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleMarkDroppedOff(redemption.id)}
                                disabled={updating === redemption.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {updating === redemption.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Drop Off
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(redemption.id, 'cancelled')}
                                disabled={updating === redemption.id}
                                className="border-red-500 text-red-400 hover:bg-red-900/20"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-400">
                              {redemption.status === 'fulfilled' ? '✓ Complete' : 'Cancelled'}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-white">{redemptions.length}</p>
              </div>
              <Package className="w-10 h-10 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {redemptions.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Fulfilled</p>
                <p className="text-3xl font-bold text-green-400">
                  {redemptions.filter(r => r.status === 'fulfilled').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}