import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function ExpManagementSection() {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exp_cost: '',
    reward_type: 'consumer',
    category: 'filament',
    image_url: '',
    stock_quantity: '',
    is_active: true,
    existing_product_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [rewardsData, redemptionsData, usersData, productsData] = await Promise.all([
        base44.entities.ExpReward.list(),
        base44.entities.ExpRedemption.list(),
        base44.entities.User.list(),
        base44.entities.Product.list()
      ]);
      setRewards(rewardsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
      setRedemptions(redemptionsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
      setUsers(usersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      if (data?.file_url) {
        setFormData(prev => ({ ...prev, image_url: data.file_url }));
        toast({ title: "Image uploaded successfully!" });
      }
    } catch (error) {
      toast({ title: "Failed to upload image", variant: "destructive" });
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
        name: formData.name,
        description: formData.description,
        exp_cost: parseInt(formData.exp_cost),
        reward_type: formData.reward_type,
        category: formData.category,
        image_url: formData.image_url,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : undefined,
        is_active: formData.is_active,
        existing_product_id: formData.existing_product_id || undefined
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
      await loadAllData();
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
      existing_product_id: reward.existing_product_id || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await base44.entities.ExpReward.delete(rewardId);
      toast({ title: "Reward deleted successfully!" });
      await loadAllData();
    } catch (error) {
      toast({ title: "Failed to delete reward", variant: "destructive" });
    }
  };

  const handleUpdateRedemptionStatus = async (redemptionId, newStatus, notes = '') => {
    setUpdating(redemptionId);
    try {
      await base44.entities.ExpRedemption.update(redemptionId, {
        status: newStatus,
        fulfillment_notes: notes || undefined
      });

      toast({ title: "Status updated", description: `Redemption marked as ${newStatus}` });
      await loadAllData();
    } catch (error) {
      console.error('Failed to update redemption:', error);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
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
      existing_product_id: ''
    });
  };

  const getRewardsByType = (type) => rewards.filter(r => r.reward_type === type);
  const getRedemptionsByType = (type) => redemptions.filter(r => {
    const reward = rewards.find(rw => rw.id === r.reward_id);
    return reward?.reward_type === type;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="consumer" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border-slate-700">
          <TabsTrigger value="consumer" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Consumer Rewards
          </TabsTrigger>
          <TabsTrigger value="maker" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Maker Rewards
          </TabsTrigger>
          <TabsTrigger value="designer" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Designer Rewards
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Reward Orders
          </TabsTrigger>
        </TabsList>

        {/* Consumer Rewards Tab */}
        <TabsContent value="consumer">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Consumer Rewards</h2>
                <p className="text-cyan-400">Products users can redeem with EXP points</p>
              </div>
              <Button onClick={() => { resetForm(); setFormData(prev => ({ ...prev, reward_type: 'consumer' })); setShowDialog(true); }} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Reward
              </Button>
            </div>

            <Card className="bg-slate-800 border-cyan-500/30">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getRewardsByType('consumer').map(reward => {
                    const product = products.find(p => p.id === reward.existing_product_id);
                    return (
                      <div key={reward.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                        {(reward.image_url || product?.images?.[0]) && (
                          <img src={reward.image_url || product.images[0]} alt={reward.name} className="w-full h-40 object-cover" />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-white mb-2">{reward.name}</h3>
                          <p className="text-sm text-slate-400 mb-3">{reward.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-orange-500">{reward.exp_cost} EXP</Badge>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(reward)} className="bg-slate-700 text-white border-slate-600">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(reward.id)} className="bg-red-900 text-white border-red-700">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {getRewardsByType('consumer').length === 0 && (
                    <p className="text-slate-400 col-span-3 text-center py-8">No consumer rewards yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maker Rewards Tab */}
        <TabsContent value="maker">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Maker Rewards</h2>
                <p className="text-cyan-400">Filament, equipment, and tools for makers</p>
              </div>
              <Button onClick={() => { resetForm(); setFormData(prev => ({ ...prev, reward_type: 'maker' })); setShowDialog(true); }} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Reward
              </Button>
            </div>

            <Card className="bg-slate-800 border-cyan-500/30">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getRewardsByType('maker').map(reward => (
                    <div key={reward.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                      {reward.image_url && (
                        <img src={reward.image_url} alt={reward.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2">{reward.name}</h3>
                        <p className="text-sm text-slate-400 mb-3">{reward.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-orange-500">{reward.exp_cost} EXP</Badge>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(reward)} className="bg-slate-700 text-white border-slate-600">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(reward.id)} className="bg-red-900 text-white border-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getRewardsByType('maker').length === 0 && (
                    <p className="text-slate-400 col-span-3 text-center py-8">No maker rewards yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Designer Rewards Tab */}
        <TabsContent value="designer">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Designer Rewards</h2>
                <p className="text-cyan-400">Boosts and special perks for designers</p>
              </div>
              <Button onClick={() => { resetForm(); setFormData(prev => ({ ...prev, reward_type: 'designer' })); setShowDialog(true); }} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Reward
              </Button>
            </div>

            <Card className="bg-slate-800 border-cyan-500/30">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getRewardsByType('designer').map(reward => (
                    <div key={reward.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                      {reward.image_url && (
                        <img src={reward.image_url} alt={reward.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2">{reward.name}</h3>
                        <p className="text-sm text-slate-400 mb-3">{reward.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-purple-500">{reward.exp_cost} EXP</Badge>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(reward)} className="bg-slate-700 text-white border-slate-600">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(reward.id)} className="bg-red-900 text-white border-red-700">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getRewardsByType('designer').length === 0 && (
                    <p className="text-slate-400 col-span-3 text-center py-8">No designer rewards yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reward Orders Tab */}
        <TabsContent value="orders">
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
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Reward</TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
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
                            <p className="font-medium">{redemption.reward_name}</p>
                            {redemption.fulfillment_notes && (
                              <p className="text-xs text-slate-400">{redemption.fulfillment_notes}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={reward?.reward_type === 'maker' ? 'bg-orange-500' : reward?.reward_type === 'designer' ? 'bg-purple-500' : 'bg-teal-500'}>
                              {reward?.reward_type || 'N/A'}
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
                            {redemption.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const notes = prompt('Add fulfillment notes (optional):');
                                    handleUpdateRedemptionStatus(redemption.id, 'fulfilled', notes || '');
                                  }}
                                  disabled={updating === redemption.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {updating === redemption.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt('Cancellation reason:');
                                    if (reason) handleUpdateRedemptionStatus(redemption.id, 'cancelled', reason);
                                  }}
                                  disabled={updating === redemption.id}
                                  className="border-red-500 text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <SelectItem value="filament" className="text-white">Filament</SelectItem>
                    <SelectItem value="equipment" className="text-white">Equipment</SelectItem>
                    <SelectItem value="print" className="text-white">Print</SelectItem>
                    <SelectItem value="accessory" className="text-white">Accessory</SelectItem>
                    <SelectItem value="discount" className="text-white">Discount</SelectItem>
                    <SelectItem value="boost" className="text-white">Boost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.reward_type === 'consumer' && (
              <div>
                <Label className="text-white">Link to Existing Product (Optional)</Label>
                <Select value={formData.existing_product_id} onValueChange={(val) => setFormData(prev => ({ ...prev, existing_product_id: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select a product or create custom reward..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                    <SelectItem value={null} className="text-white">No Product (Custom Reward)</SelectItem>
                    {products.filter(p => p.status === 'active' && !p.is_exp_product).map(product => (
                      <SelectItem key={product.id} value={product.id} className="text-white">
                        {product.name} - ${product.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400 mt-1">Link to an existing product for automatic details</p>
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