import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Gift, Plus, Edit, Trash2, Loader2, Upload, Package, CheckCircle, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"; // New import

export default function ExpRewardsSection() {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [users, setUsers] = useState([]); // New state for users
  const [loading, setLoading] = useState(true); // General loading state for initial data fetch
  const [loadingRedemptions, setLoadingRedemptions] = useState(true); // Specific loading state for redemptions tab
  const [showDialog, setShowDialog] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(null); // New state to track redemption update loading
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
     name: '',
     description: '',
     exp_cost: '',
     reward_type: 'consumer',
     category: 'filament',
     image_url: '',
     stock_quantity: '',
     is_active: true,
     existing_product_id: '',
     boost_duration_weeks: '',
     product_link: ''
   });
  const { toast } = useToast();

  useEffect(() => {
    loadAllData(); // Call unified data loader
  }, []);

  const loadRewards = async () => {
    try {
      const rewardsData = await base44.entities.ExpReward.list();
      setRewards(rewardsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast({ title: "Failed to load rewards", variant: "destructive" });
    }
  };

  const loadRedemptions = async () => {
    setLoadingRedemptions(true);
    try {
      const redemptionsData = await base44.entities.ExpRedemption.list();
      // Fetch all redemptions, filtering will happen in tabs
      setRedemptions(redemptionsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
    } catch (error) {
      console.error('Failed to load redemptions:', error);
      toast({ title: "Failed to load redemptions", variant: "destructive" });
    }
    setLoadingRedemptions(false);
  };

  const loadUsers = async () => {
    try {
      const usersData = await base44.entities.User.list();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({ title: "Failed to load users", variant: "destructive" });
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData.filter(p => p.status === 'active'));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadAllData = async () => {
     setLoading(true);
     setLoadingRedemptions(true);
     try {
       await Promise.all([
         loadRewards(),
         loadRedemptions(),
         loadUsers(),
         loadProducts()
       ]);
     } catch (error) {
       console.error('Failed to load all data:', error);
       toast({ title: "Failed to load data", variant: "destructive" });
     }
     setLoading(false);
   };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Assuming base44.functions.invoke('uploadFile', { file }) handles file upload appropriately
      // and returns an object with a file_url property.
      const { data } = await base44.functions.invoke('uploadFile', { file });
      if (data?.file_url) {
        setFormData(prev => ({ ...prev, image_url: data.file_url }));
        toast({ title: "Image uploaded successfully!" });
      } else {
         toast({ title: "Image upload failed: No URL returned", variant: "destructive" });
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast({ title: "Failed to upload image", description: error.message || "An unknown error occurred.", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.exp_cost) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const rewardData = {
        ...formData,
        exp_cost: parseInt(formData.exp_cost),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : undefined,
        existing_product_id: formData.existing_product_id || undefined,
        boost_duration_weeks: formData.boost_duration_weeks ? parseInt(formData.boost_duration_weeks) : undefined,
        product_link: formData.product_link || undefined
      };

      if (editingReward) {
        await base44.entities.ExpReward.update(editingReward.id, rewardData);
        toast({ title: "Reward updated successfully!" });
      } else {
        await base44.entities.ExpReward.create(rewardData);
        toast({ title: "Reward created successfully!" });
      }

      setShowDialog(false);
      setEditingReward(null);
      resetForm();
      await loadRewards(); // Reload only rewards after adding/editing
    } catch (error) {
      console.error('Failed to save reward:', error);
      toast({ title: "Failed to save reward", variant: "destructive" });
    }
  };

  const handleEdit = (reward) => {
     setEditingReward(reward);
     setFormData({
       name: reward.name,
       description: reward.description,
       exp_cost: reward.exp_cost.toString(),
       reward_type: reward.reward_type,
       category: reward.category,
       image_url: reward.image_url || '',
       stock_quantity: reward.stock_quantity?.toString() || '',
       is_active: reward.is_active,
       existing_product_id: reward.existing_product_id || '',
       boost_duration_weeks: reward.boost_duration_weeks?.toString() || '',
       product_link: reward.product_link || ''
     });
     setShowDialog(true);
   };

  const handleDelete = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await base44.entities.ExpReward.delete(rewardId);
      toast({ title: "Reward deleted successfully!" });
      await loadRewards(); // Reload only rewards after deletion
    } catch (error) {
      toast({ title: "Failed to delete reward", variant: "destructive" });
    }
  };

  // Replaced handleFulfillRedemption with this more general function
  const handleUpdateRedemptionStatus = async (redemptionId, newStatus, notes = '') => {
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

      await loadRedemptions(); // Reload redemptions to reflect changes
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

  const resetForm = () => {
     setFormData({
       name: '',
       description: '',
       exp_cost: '',
       reward_type: 'consumer',
       category: 'filament',
       image_url: '',
       stock_quantity: '',
       is_active: true,
       existing_product_id: '',
       boost_duration_weeks: '',
       product_link: ''
     });
     setSearchQuery('');
   };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        existing_product_id: productId,
        name: product.name,
        description: product.description,
        image_url: product.images?.[0] || '',
        category: 'print',
        product_link: `/marketplace/${productId}`
      }));
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">EXP Rewards Management</h2>
          <p className="text-cyan-400">Manage redeemable rewards for makers and consumers</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingReward(null);
            setShowDialog(true);
          }}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reward
        </Button>
      </div>

      {/* Separate tabs for consumer, maker, and designer redemptions */}
      <Tabs defaultValue="consumer_redemptions" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border-slate-700">
          <TabsTrigger value="consumer_redemptions" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">Consumer Redemptions</TabsTrigger>
          <TabsTrigger value="maker_redemptions" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">Maker Redemptions</TabsTrigger>
          <TabsTrigger value="designer_redemptions" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">Designer Rewards</TabsTrigger>
          <TabsTrigger value="manage_rewards" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">Manage Rewards</TabsTrigger>
        </TabsList>

        {/* Consumer Redemptions (Print Orders) */}
        <TabsContent value="consumer_redemptions">
          <Card className="bg-slate-800 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white">Consumer Print Redemptions</CardTitle>
              <p className="text-sm text-slate-400">Print-based rewards are automatically sent to makers as orders</p>
            </CardHeader>
            <CardContent>
              {loadingRedemptions ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {redemptions
                    .filter(r => {
                      const reward = rewards.find(rw => rw.id === r.reward_id);
                      return reward?.reward_type === 'consumer';
                    })
                    .map(redemption => {
                      const reward = rewards.find(r => r.id === redemption.reward_id);
                      const user = users.find(u => u.id === redemption.user_id);

                      return (
                        <div key={redemption.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{redemption.reward_name}</h3>
                              <p className="text-sm text-slate-400">
                                Redeemed by: {user?.full_name || 'Unknown'} ({user?.email || 'N/A'})
                              </p>
                              <p className="text-sm text-slate-400">
                                {new Date(redemption.created_date).toLocaleString()}
                              </p>
                              <p className="text-sm text-cyan-400">
                                {redemption.exp_cost} EXP
                              </p>
                              {redemption.fulfillment_notes && (
                                <p className="text-sm text-slate-300 mt-2">
                                  <strong>Note:</strong> {redemption.fulfillment_notes}
                                </p>
                              )}
                            </div>
                            <Badge className={
                              redemption.status === 'fulfilled' ? 'bg-green-500' :
                              redemption.status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }>
                              {redemption.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  {redemptions.filter(r => {
                    const reward = rewards.find(rw => rw.id === r.reward_id);
                    return reward?.reward_type === 'consumer';
                  }).length === 0 && (
                    <p className="text-center text-slate-400 py-8">No consumer redemptions yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Designer Rewards Tab */}
        <TabsContent value="designer_redemptions">
          <Card className="bg-slate-800 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white">Designer EXP Rewards</CardTitle>
              <p className="text-sm text-slate-400">Special rewards and boosts for designers</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Boost Posts Section */}
                <div className="p-6 bg-gradient-to-br from-red-900/30 to-pink-900/30 rounded-lg border border-red-500/30">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-red-400" />
                    Boost Product Posts
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Designers can use EXP to boost their product visibility and get featured placement in the marketplace.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Homepage Featured (7 days)</h4>
                      <p className="text-sm text-slate-400 mb-3">Get your product featured on the homepage for 1 week</p>
                      <Badge className="bg-red-500">500 EXP</Badge>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Category Pin (14 days)</h4>
                      <p className="text-sm text-slate-400 mb-3">Pin product to top of category for 2 weeks</p>
                      <Badge className="bg-red-500">750 EXP</Badge>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Priority Review</h4>
                      <p className="text-sm text-slate-400 mb-3">Get new designs reviewed within 24 hours</p>
                      <Badge className="bg-red-500">300 EXP</Badge>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Marketing Bundle</h4>
                      <p className="text-sm text-slate-400 mb-3">Featured email to all customers + homepage spot</p>
                      <Badge className="bg-red-500">1200 EXP</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    Note: These are promotional options. Implement redemption flow in Designer Dashboard for designers to use.
                  </p>
                </div>

                {/* Designer-Specific Rewards */}
                <div className="p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                  <h3 className="text-xl font-bold text-white mb-2">Exclusive Designer Perks</h3>
                  <p className="text-slate-300 mb-4">
                    Special rewards available only to designers for their contribution to the platform.
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                      <div>
                        <p className="font-medium text-white">Design Software License (1 month)</p>
                        <p className="text-sm text-slate-400">Access to premium 3D design tools</p>
                      </div>
                      <Badge className="bg-purple-500">2000 EXP</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                      <div>
                        <p className="font-medium text-white">Professional Portfolio Review</p>
                        <p className="text-sm text-slate-400">Get feedback from industry experts</p>
                      </div>
                      <Badge className="bg-purple-500">800 EXP</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                      <div>
                        <p className="font-medium text-white">Collaboration Opportunity</p>
                        <p className="text-sm text-slate-400">Featured designer collaboration project</p>
                      </div>
                      <Badge className="bg-purple-500">1500 EXP</Badge>
                    </div>
                  </div>
                </div>

                {/* Recent Designer Redemptions */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Designer Redemptions</h3>
                  {loadingRedemptions ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {redemptions
                        .filter(r => {
                          const reward = rewards.find(rw => rw.id === r.reward_id);
                          return reward?.reward_type === 'designer';
                        })
                        .slice(0, 5)
                        .map(redemption => {
                          const reward = rewards.find(r => r.id === redemption.reward_id);
                          const user = users.find(u => u.id === redemption.user_id);

                          return (
                            <div key={redemption.id} className="p-3 bg-slate-900 rounded border border-slate-700">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-medium">{redemption.reward_name}</p>
                                  <p className="text-sm text-slate-400">{user?.full_name || 'Unknown'} - {new Date(redemption.created_date).toLocaleDateString()}</p>
                                </div>
                                <Badge className={redemption.status === 'fulfilled' ? 'bg-green-500' : 'bg-yellow-500'}>
                                  {redemption.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      {redemptions.filter(r => {
                        const reward = rewards.find(rw => rw.id === r.reward_id);
                        return reward?.reward_type === 'designer';
                      }).length === 0 && (
                        <p className="text-center text-slate-400 py-8">No designer redemptions yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maker Redemptions (Manual Fulfillment) */}
        <TabsContent value="maker_redemptions">
          <Card className="bg-slate-800 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white">Maker Reward Redemptions</CardTitle>
              <p className="text-sm text-slate-400">Non-print rewards that require manual fulfillment</p>
            </CardHeader>
            <CardContent>
              {loadingRedemptions ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {redemptions
                    .filter(r => {
                      const reward = rewards.find(rw => rw.id === r.reward_id);
                      return reward?.reward_type === 'maker';
                    })
                    .map(redemption => {
                      const reward = rewards.find(r => r.id === redemption.reward_id);
                      const user = users.find(u => u.id === redemption.user_id);

                      return (
                        <div key={redemption.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{redemption.reward_name}</h3>
                              <p className="text-sm text-slate-400">
                                Redeemed by: {user?.full_name || 'Unknown'} ({user?.email || 'N/A'})
                              </p>
                              <p className="text-sm text-slate-400">
                                {new Date(redemption.created_date).toLocaleString()}
                              </p>
                              <p className="text-sm text-cyan-400">
                                {redemption.exp_cost} EXP
                              </p>
                              {redemption.fulfillment_notes && (
                                <p className="text-sm text-slate-300 mt-2">
                                  <strong>Note:</strong> {redemption.fulfillment_notes}
                                </p>
                              )}
                            </div>
                            <Badge className={
                              redemption.status === 'fulfilled' ? 'bg-green-500' :
                              redemption.status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }>
                              {redemption.status}
                            </Badge>
                          </div>

                          {redemption.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const notes = prompt('Add fulfillment notes (optional):');
                                  handleUpdateRedemptionStatus(redemption.id, 'fulfilled', notes || '');
                                }}
                                disabled={updating === redemption.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {updating === redemption.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Mark Fulfilled
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt('Cancellation reason:');
                                  if (reason) {
                                    handleUpdateRedemptionStatus(redemption.id, 'cancelled', reason);
                                  }
                                }}
                                disabled={updating === redemption.id}
                                className="border-red-500 text-red-400 hover:bg-red-900/20"
                              >
                                {updating === redemption.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {redemptions.filter(r => {
                    const reward = rewards.find(rw => rw.id === r.reward_id);
                    return reward?.reward_type === 'maker';
                  }).length === 0 && (
                    <p className="text-center text-slate-400 py-8">No maker redemptions yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Rewards Tab */}
        <TabsContent value="manage_rewards">
          <Card className="bg-slate-800 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-white">All Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                </div>
              ) : rewards.length === 0 ? (
                <p className="text-center text-slate-400 py-12">No rewards yet. Create your first reward!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Reward</TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Cost</TableHead>
                      <TableHead className="text-slate-300">Stock</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map(reward => (
                      <TableRow key={reward.id} className="border-slate-700">
                        <TableCell className="text-white">
                          <div className="flex items-center gap-3">
                            {reward.image_url && (
                              <img src={reward.image_url} alt={reward.name} className="w-12 h-12 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-medium">{reward.name}</p>
                              <p className="text-sm text-slate-400">{reward.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={reward.reward_type === 'maker' ? 'bg-orange-500' : 'bg-teal-500'}>
                            {reward.reward_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{reward.category}</TableCell>
                        <TableCell className="text-slate-300">{reward.exp_cost} EXP</TableCell>
                        <TableCell className="text-slate-300">
                          {reward.stock_quantity !== undefined ? reward.stock_quantity : '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge className={reward.is_active ? 'bg-green-500' : 'bg-red-500'}>
                            {reward.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(reward)}
                              className="bg-slate-700 text-white border-slate-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(reward.id)}
                              className="bg-red-900 text-white border-red-700 hover:bg-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingReward ? 'Edit Reward' : 'Add New Reward'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create or edit redeemable rewards for users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Reward Type *</Label>
                <Select value={formData.reward_type} onValueChange={(val) => setFormData(prev => ({ ...prev, reward_type: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="consumer" className="text-white">Consumer</SelectItem>
                    <SelectItem value="maker" className="text-white">Maker</SelectItem>
                    <SelectItem value="designer" className="text-white">Designer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Category *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {formData.reward_type !== 'consumer' && (
                      <>
                        <SelectItem value="filament" className="text-white">Filament</SelectItem>
                        <SelectItem value="equipment" className="text-white">Equipment</SelectItem>
                        <SelectItem value="boost" className="text-white">Boost</SelectItem>
                      </>
                    )}
                    <SelectItem value="print" className="text-white">Print</SelectItem>
                    <SelectItem value="accessory" className="text-white">Accessory</SelectItem>
                    <SelectItem value="discount" className="text-white">Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>

              {(formData.reward_type === 'consumer' || formData.category === 'print') && (
                <div>
                  <Label className="text-white">Link to Product (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white mb-2"
                  />
                  <Select value={formData.existing_product_id} onValueChange={handleProductSelect}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Select a product to auto-populate details..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-64 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <SelectItem key={product.id} value={product.id} className="text-white">
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400 mt-1">Selecting a product will auto-fill name, description, image, and link to the listing.</p>
                </div>
              )}

            <div>
              <Label className="text-white">Reward Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 1kg PLA Filament Roll"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the reward..."
                rows={3}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">EXP Cost *</Label>
                <Input
                  type="number"
                  value={formData.exp_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, exp_cost: e.target.value }))}
                  placeholder="500"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

                <div>
                  <Label className="text-white">Stock Quantity (optional)</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    placeholder="Leave empty for unlimited"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>

                {formData.category === 'boost' && (
                  <div>
                    <Label className="text-white">Boost Duration (weeks) *</Label>
                    <Input
                      type="number"
                      value={formData.boost_duration_weeks || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, boost_duration_weeks: e.target.value }))}
                      placeholder="e.g., 1, 2, 3, 4"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">How many weeks the boost will last</p>
                  </div>
                )}
            </div>

            <div>
              <Label className="text-white">Image</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="Image URL or upload"
                  className="bg-slate-900 border-slate-700 text-white flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('rewardImageUpload').click()}
                  disabled={uploading}
                  className="bg-slate-700 text-white border-slate-600"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
                <input
                  id="rewardImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="text-white cursor-pointer">
                Active (visible to users)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-700 text-white border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700">
              {editingReward ? 'Update Reward' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}