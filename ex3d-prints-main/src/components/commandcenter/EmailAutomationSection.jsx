import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Mail, Plus, Edit, Trash2, Loader2, CheckCircle, 
  Power, PowerOff, Clock, ShoppingCart, Heart, Users, Send, BarChart3, Eye
} from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailAutomationSection() {
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedCampaignAnalytics, setSelectedCampaignAnalytics] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({ logs: [], users: [] });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [triggeringEmails, setTriggeringEmails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'inactive_days',
    trigger_condition: { days: 3 },
    target_audience: 'all',
    email_subject: '',
    email_body: '',
    include_dynamic_content: false,
    dynamic_content_type: 'recently_viewed',
    specific_product_id: '',
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignsData, productsData] = await Promise.all([
        base44.entities.EmailCampaign.list(),
        base44.entities.Product.filter({ status: 'active' })
      ]);
      setCampaigns(campaignsData.sort((a, b) => b.created_date.localeCompare(a.created_date)));
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const getDynamicContentHeader = (type) => {
    const headers = {
      'recently_viewed': 'Your Recently Viewed Items',
      'cart_items': 'Items Still in Your Cart',
      'wishlist_items': 'Items on Your Wishlist',
      'popular_products': 'Popular Products Right Now',
      'specific_product': 'Featured Product for You'
    };
    return headers[type] || 'Recommended for You';
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email_subject || !formData.email_body) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const campaignData = {
        name: formData.name,
        trigger_type: formData.trigger_type,
        trigger_condition: getTriggerCondition(),
        target_audience: formData.target_audience,
        email_subject: formData.email_subject,
        email_body: formData.email_body,
        include_dynamic_content: formData.include_dynamic_content,
        dynamic_content_type: formData.dynamic_content_type,
        specific_product_id: formData.specific_product_id,
        is_active: formData.is_active
      };

      if (editingCampaign) {
        await base44.entities.EmailCampaign.update(editingCampaign.id, campaignData);
        toast({ title: "Campaign updated successfully!" });
      } else {
        await base44.entities.EmailCampaign.create(campaignData);
        toast({ title: "Campaign created successfully!" });
      }

      setShowDialog(false);
      setEditingCampaign(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      toast({ title: "Failed to save campaign", variant: "destructive" });
    }
  };

  const getTriggerCondition = () => {
    switch (formData.trigger_type) {
      case 'inactive_days':
        return { days: parseInt(formData.trigger_condition.days || 3) };
      case 'cart_abandoned':
      case 'wishlist_abandoned':
        return { hours: parseInt(formData.trigger_condition.hours || 24) };
      case 'order_delivered':
        return { days: parseInt(formData.trigger_condition.days || 1) };
      default:
        return {};
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      trigger_type: campaign.trigger_type,
      trigger_condition: campaign.trigger_condition || {},
      target_audience: campaign.target_audience,
      email_subject: campaign.email_subject,
      email_body: campaign.email_body,
      include_dynamic_content: campaign.include_dynamic_content || false,
      dynamic_content_type: campaign.dynamic_content_type || 'recently_viewed',
      specific_product_id: campaign.specific_product_id || '',
      is_active: campaign.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await base44.entities.EmailCampaign.delete(campaignId);
      toast({ title: "Campaign deleted successfully!" });
      await loadData();
    } catch (error) {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    }
  };

  const toggleCampaignStatus = async (campaign) => {
    try {
      const updatedIsActive = !campaign.is_active;
      await base44.entities.EmailCampaign.update(campaign.id, {
        is_active: updatedIsActive
      });
      toast({ 
        title: updatedIsActive ? "Campaign activated successfully!" : "Campaign paused",
        description: updatedIsActive ? "The campaign is now running and will send emails automatically." : undefined
      });
      await loadData();
    } catch (error) {
      console.error('Toggle campaign error:', error);
      toast({ 
        title: "Failed to update campaign status", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'inactive_days',
      trigger_condition: { days: 3 },
      target_audience: 'all',
      email_subject: '',
      email_body: '',
      include_dynamic_content: false,
      dynamic_content_type: 'recently_viewed',
      specific_product_id: '',
      is_active: true
    });
  };

  const getTriggerIcon = (type) => {
    switch (type) {
      case 'cart_abandoned': return ShoppingCart;
      case 'wishlist_abandoned': return Heart;
      case 'inactive_days': return Clock;
      case 'user_signup': return Users;
      case 'first_purchase': return ShoppingCart;
      case 'order_delivered': return CheckCircle;
      default: return Mail;
    }
  };

  const handleManualTrigger = async () => {
    if (!confirm('This will check all active campaigns and send any pending emails. Continue?')) {
      return;
    }

    setTriggeringEmails(true);
    try {
      // Call all email campaign functions
      const functionCalls = [
        base44.functions.invoke('sendCartAbandonmentEmail').catch(err => ({ error: err.message, function: 'Cart Abandonment' })),
        base44.functions.invoke('sendWishlistReminderEmail').catch(err => ({ error: err.message, function: 'Wishlist Reminder' })),
        base44.functions.invoke('sendInactiveUsersEmail').catch(err => ({ error: err.message, function: 'Inactive Users' })),
        base44.functions.invoke('sendUserSignupEmail').catch(err => ({ error: err.message, function: 'User Signup' })),
        base44.functions.invoke('sendOrderDeliveredEmail').catch(err => ({ error: err.message, function: 'Order Delivered' }))
      ];

      const results = await Promise.all(functionCalls);

      // Count successful emails
      let totalSent = 0;
      const errors = [];

      results.forEach((result, idx) => {
        if (result.error) {
          errors.push(result);
        } else if (result.data?.emails_sent) {
          totalSent += result.data.emails_sent;
        }
      });

      if (errors.length > 0) {
        toast({
          title: "Some campaigns had errors",
          description: `${errors.map(e => e.function).join(', ')} failed. ${totalSent} emails sent successfully.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email campaigns triggered!",
          description: `Successfully sent ${totalSent} emails across all active campaigns.`
        });
      }

      await loadData();
    } catch (error) {
      console.error('Failed to trigger campaigns:', error);
      toast({
        title: "Failed to trigger campaigns",
        description: error.message,
        variant: "destructive"
      });
    }
    setTriggeringEmails(false);
  };

  const handleViewAnalytics = async (campaign) => {
    setSelectedCampaignAnalytics(campaign);
    setShowAnalyticsDialog(true);
    setLoadingAnalytics(true);

    try {
      const [logsData, usersData] = await Promise.all([
        base44.entities.EmailCampaignLog.filter({ campaign_id: campaign.id }),
        base44.entities.User.list()
      ]);

      setAnalyticsData({
        logs: logsData.sort((a, b) => b.sent_at.localeCompare(a.sent_at)),
        users: usersData
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast({ title: "Failed to load analytics", variant: "destructive" });
    }
    setLoadingAnalytics(false);
  };

  const getEmailsSentLast24h = (campaignId) => {
    const logs = analyticsData.logs.filter(log => log.campaign_id === campaignId);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return logs.filter(log => new Date(log.sent_at) >= oneDayAgo).length;
  };

  const handleSendTestEmail = async () => {
    if (!formData.email_subject || !formData.email_body) {
      toast({ 
        title: "Cannot send test email", 
        description: "Please fill in email subject and body first",
        variant: "destructive" 
      });
      return;
    }

    setSendingTest(true);
    try {
      // Fetch actual user data for test email recipient
      const allUsers = await base44.entities.User.list();
      const testUser = allUsers.find(u => u.email === 'jc3dprints2022@gmail.com');
      
      const userName = testUser?.full_name || 'Test User';
      const userExp = testUser?.exp_points || 500;

      let emailBody = formData.email_body;
      
      if (formData.include_dynamic_content) {
        const contentHeader = getDynamicContentHeader(formData.dynamic_content_type);
        emailBody += `\n\n<div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">`;
        emailBody += `<h3 style="color: #111827; font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${contentHeader}</h3>\n`;
        
        let sampleProducts = [];

        // Get actual content based on type
        if (formData.dynamic_content_type === 'specific_product' && formData.specific_product_id) {
          const product = products.find(p => p.id === formData.specific_product_id);
          if (product) {
            sampleProducts = [product];
          }
        } else if (formData.dynamic_content_type === 'recently_viewed' && testUser?.recently_viewed) {
          // Show actual recently viewed for test user
          sampleProducts = testUser.recently_viewed
            .slice(0, 2)
            .map(pid => products.find(p => p.id === pid))
            .filter(p => p);
        } else if (formData.dynamic_content_type === 'cart_items' && testUser) {
          // Get test user's actual cart items
          const testUserCarts = await base44.entities.Cart.filter({ user_id: testUser.id });
          sampleProducts = testUserCarts
            .slice(0, 2)
            .map(cart => products.find(p => p.id === cart.product_id))
            .filter(p => p);
        } else if (formData.dynamic_content_type === 'wishlist_items' && testUser?.wishlist) {
          // Show actual wishlist for test user
          sampleProducts = testUser.wishlist
            .slice(0, 2)
            .map(pid => products.find(p => p.id === pid))
            .filter(p => p);
        } else if (formData.dynamic_content_type === 'popular_products') {
          // Show actual popular products
          sampleProducts = products
            .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
            .slice(0, 2);
        }

        // Fallback to popular if no products found
        if (sampleProducts.length === 0) {
          sampleProducts = products
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 2);
        }
        
        if (sampleProducts.length === 1) {
          const product = sampleProducts[0];
          emailBody += `
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 16px 0; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; width: 200px; border-radius: 8px; margin-bottom: 12px;" />` : ''}
                          <h4 style="margin: 8px 0; font-size: 16px; color: #111827; font-weight: 600;">${product.name}</h4>
              <p style="color: #6b7280; font-size: 13px; margin: 8px 0; line-height: 1.4;">${(product.description || '').substring(0, 80)}${product.description?.length > 80 ? '...' : ''}</p>
              <p style="font-size: 18px; font-weight: bold; color: #14b8a6; margin: 8px 0;">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
              <a href="${window.location.origin}/ProductDetail?id=${product.id}" style="display: inline-block; background: #14b8a6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; margin-top: 8px; font-weight: 600; font-size: 13px;">Shop Now</a>
            </div>
          `;
        } else if (sampleProducts.length > 0) {
          emailBody += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 500px;">';
          sampleProducts.forEach(product => {
           emailBody += `
             <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
               ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; width: 100%; border-radius: 6px; margin-bottom: 8px;" />` : ''}
               <h4 style="margin: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">${product.name.substring(0, 40)}${product.name.length > 40 ? '...' : ''}</h4>
               <p style="font-size: 16px; font-weight: bold; color: #14b8a6; margin: 6px 0;">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
               <a href="${window.location.origin}/ProductDetail?id=${product.id}" style="display: inline-block; background: #14b8a6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; margin-top: 6px; font-size: 12px; font-weight: 600; width: 100%; text-align: center; box-sizing: border-box;">Shop Now</a>
             </div>
           `;
          });
          emailBody += '</div>';
        }
        
        emailBody += `</div>`;
        emailBody += `\n<p style="color: #9ca3af; font-size: 11px; margin-top: 16px; font-style: italic;">Note: This test email shows ${formData.dynamic_content_type === 'recently_viewed' && testUser?.recently_viewed ? 'your actual recently viewed items' : formData.dynamic_content_type === 'cart_items' && testUser ? 'your actual cart items' : formData.dynamic_content_type === 'wishlist_items' && testUser?.wishlist ? 'your actual wishlist items' : formData.dynamic_content_type === 'popular_products' ? 'actual popular products' : 'sample products'}. Actual campaigns will show personalized products for each user.</p>`;
      }

      // Replace variables in body
      let processedBody = emailBody
        .replace(/\{user\.full_name\}/g, userName)
        .replace(/\{user\.exp_points\}/g, userExp.toString())
        .replace(/\{product\.name\}/g, products[0]?.name || 'Sample Product')
        .replace(/\{product\.price\}/g, products[0]?.price?.toFixed(2) || '0.00');

      // Replace variables in subject
      let processedSubject = formData.email_subject
        .replace(/\{user\.full_name\}/g, userName)
        .replace(/\{user\.exp_points\}/g, userExp.toString());

      await base44.functions.invoke('sendEmail', {
        to: 'jc3dprints2022@gmail.com',
        subject: `[TEST] ${processedSubject}`,
        body: processedBody,
        from_name: 'EX3D Prints (Test Email)'
      });

      toast({ 
        title: "Test email sent!", 
        description: "Check jc3dprints2022@gmail.com for the test email"
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast({ 
        title: "Failed to send test email", 
        description: error.message,
        variant: "destructive" 
      });
    }
    setSendingTest(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Email Campaign Automation</h2>
          <p className="text-cyan-400">Create and manage automated email campaigns</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleManualTrigger}
            disabled={triggeringEmails}
            variant="outline"
            className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
          >
            {triggeringEmails ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Trigger All Campaigns
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setEditingCampaign(null);
              setShowDialog(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      <Alert className="bg-cyan-900/30 border-cyan-500/30">
        <Mail className="w-4 h-4 text-cyan-400" />
        <AlertDescription className="text-cyan-100">
          <strong>Pro Tip:</strong> Use variables like {'{user.full_name}'} and {'{user.exp_points}'} in your email body for personalization.
        </AlertDescription>
      </Alert>

      {/* Campaigns Table */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No campaigns yet. Create your first campaign!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Campaign</TableHead>
                  <TableHead className="text-slate-300">Trigger</TableHead>
                  <TableHead className="text-slate-300">Audience</TableHead>
                  <TableHead className="text-slate-300">Total Sent</TableHead>
                  <TableHead className="text-slate-300">Last 24h</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(campaign => {
                  const TriggerIcon = getTriggerIcon(campaign.trigger_type);
                  return (
                    <TableRow key={campaign.id} className="border-slate-700">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-3">
                          <TriggerIcon className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-slate-400">{campaign.email_subject}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {campaign.trigger_type === 'inactive_days' && `${campaign.trigger_condition?.days || 3} days inactive`}
                        {campaign.trigger_type === 'cart_abandoned' && `Cart ${campaign.trigger_condition?.hours || 24}h`}
                        {campaign.trigger_type === 'wishlist_abandoned' && `Wishlist ${campaign.trigger_condition?.hours || 24}h`}
                        {campaign.trigger_type === 'user_signup' && 'User Signup'}
                        {campaign.trigger_type === 'first_purchase' && 'First Purchase'}
                        {campaign.trigger_type === 'order_delivered' && `Order Delivered (${campaign.trigger_condition?.days || 1} days)`}
                        {campaign.trigger_type === 'manual' && 'Manual trigger'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500">{campaign.target_audience}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{campaign.emails_sent || 0}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500">
                          {campaign.emails_sent_last_24h || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {campaign.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-500">Paused</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewAnalytics(campaign)}
                            className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCampaignStatus(campaign)}
                            className="bg-slate-700 text-white border-slate-600"
                          >
                            {campaign.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(campaign)}
                            className="bg-slate-700 text-white border-slate-600"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(campaign.id)}
                            className="bg-red-900 text-white border-red-700 hover:bg-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Set up automated email campaigns with personalized content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campaign Name */}
            <div>
              <Label className="text-white">Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Welcome Back Campaign"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Trigger & Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Trigger Type *</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, trigger_type: val }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="user_signup" className="text-white">New User Signup</SelectItem>
                    <SelectItem value="first_purchase" className="text-white">First Purchase</SelectItem>
                    <SelectItem value="order_delivered" className="text-white">Order Delivered</SelectItem>
                    <SelectItem value="inactive_days" className="text-white">Inactive X Days</SelectItem>
                    <SelectItem value="cart_abandoned" className="text-white">Cart Abandoned</SelectItem>
                    <SelectItem value="wishlist_abandoned" className="text-white">Wishlist Abandoned</SelectItem>
                    <SelectItem value="manual" className="text-white">Manual Trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Target Audience *</Label>
                <Select 
                  value={formData.target_audience} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, target_audience: val }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">All Users</SelectItem>
                    <SelectItem value="makers" className="text-white">Makers Only</SelectItem>
                    <SelectItem value="consumers" className="text-white">Consumers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Trigger Condition */}
            {formData.trigger_type === 'inactive_days' && (
              <div>
                <Label className="text-white">Days Inactive</Label>
                <Input
                  type="number"
                  value={formData.trigger_condition.days || 3}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger_condition: { days: e.target.value } 
                  }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            )}

            {(formData.trigger_type === 'cart_abandoned' || formData.trigger_type === 'wishlist_abandoned') && (
              <div>
                <Label className="text-white">Hours Since Abandoned</Label>
                <Input
                  type="number"
                  value={formData.trigger_condition.hours || 24}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger_condition: { hours: e.target.value } 
                  }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            )}

            {formData.trigger_type === 'order_delivered' && (
              <div>
                <Label className="text-white">Days After Delivery</Label>
                <Input
                  type="number"
                  value={formData.trigger_condition.days || 1}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    trigger_condition: { days: e.target.value } 
                  }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">Send email X days after order is marked as delivered</p>
              </div>
            )}

            {/* Email Content */}
            <div>
              <Label className="text-white">Email Subject *</Label>
              <Input
                value={formData.email_subject}
                onChange={(e) => setFormData(prev => ({ ...prev, email_subject: e.target.value }))}
                placeholder="We miss you, {user.full_name}!"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Email Body * (HTML supported)</Label>
              <Textarea
                value={formData.email_body}
                onChange={(e) => setFormData(prev => ({ ...prev, email_body: e.target.value }))}
                placeholder="Hi {user.full_name},&#10;&#10;We noticed you haven't visited in a while..."
                rows={8}
                className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
              />
            </div>

            {/* Dynamic Content - Now available for ALL trigger types */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="include_dynamic"
                  checked={formData.include_dynamic_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, include_dynamic_content: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="include_dynamic" className="text-white cursor-pointer">
                  Include Dynamic Product Content
                </Label>
              </div>

              {formData.include_dynamic_content && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label className="text-white">Content Type</Label>
                    <Select 
                      value={formData.dynamic_content_type} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, dynamic_content_type: val }))}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="recently_viewed" className="text-white">Recently Viewed Products</SelectItem>
                        <SelectItem value="cart_items" className="text-white">Cart Items</SelectItem>
                        <SelectItem value="wishlist_items" className="text-white">Wishlist Items</SelectItem>
                        <SelectItem value="popular_products" className="text-white">Popular Products</SelectItem>
                        <SelectItem value="specific_product" className="text-white">Specific Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.dynamic_content_type === 'specific_product' && (
                    <div>
                      <Label className="text-white">Select Product</Label>
                      <Select 
                        value={formData.specific_product_id} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, specific_product_id: val }))}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                          <SelectValue placeholder="Choose a product..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id} className="text-white">
                              {product.name} (${product.price})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Alert className="bg-cyan-900/30 border-cyan-500/30">
                    <AlertDescription className="text-cyan-100 text-xs">
                      Header will be: "{getDynamicContentHeader(formData.dynamic_content_type)}"
                    </AlertDescription>
                  </Alert>
                </div>
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
                Active (campaign will run automatically)
              </Label>
            </div>

            {/* Test Email Button */}
            <div className="border-t border-slate-700 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendTestEmail}
                disabled={sendingTest || !formData.email_subject || !formData.email_body}
                className="w-full bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email to jc3dprints2022@gmail.com
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Preview how your email will look before activating the campaign
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-700 text-white border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700">
              {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Campaign Analytics: {selectedCampaignAnalytics?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed email delivery statistics and recipient list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {loadingAnalytics ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400  text-sm">Total Emails Sent</p>
                      <p className="text-3xl font-bold text-cyan-400">{analyticsData.logs.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-sm">Last 24 Hours</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {analyticsData.logs.filter(log => {
                          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                          return new Date(log.sent_at) >= oneDayAgo;
                        }).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-sm">Success Rate</p>
                      <p className="text-3xl font-bold text-green-400">
                        {analyticsData.logs.length > 0
                          ? Math.round((analyticsData.logs.filter(l => l.status === 'sent').length / analyticsData.logs.length) * 100)
                          : 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recipient List */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Email Recipients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.logs.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">No emails sent yet for this campaign</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-300">Recipient</TableHead>
                              <TableHead className="text-slate-300">Email</TableHead>
                              <TableHead className="text-slate-300">Sent At</TableHead>
                              <TableHead className="text-slate-300">Status</TableHead>
                              <TableHead className="text-slate-300">Products</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analyticsData.logs.map(log => {
                              const user = analyticsData.users.find(u => u.id === log.user_id);
                              return (
                                <TableRow key={log.id} className="border-slate-700">
                                  <TableCell className="text-white">
                                    {user?.full_name || 'Unknown'}
                                  </TableCell>
                                  <TableCell className="text-slate-300">
                                    {user?.email || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-slate-300">
                                    {new Date(log.sent_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}>
                                      {log.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-slate-300">
                                    {log.dynamic_content_included?.length || 0} products
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
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalyticsDialog(false)} className="bg-slate-700 text-white border-slate-600">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}