import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Package, DollarSign, Clock, CheckCircle,
  Printer, Settings, FileText, TrendingUp, AlertCircle,
  Download, Mail, Plus, Calendar, Star, MapPin, ExternalLink,
  Trash2, Link2, Image, File, Film
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddPrinterForm from "../makers/AddPrinterForm";
import FilamentManager from "../makers/FilamentManager";
import BankInfoManager from "../shared/BankInfoManager";
import MakerExpRedeemTab from "../makers/MakerExpRedeemTab";
import { createPageUrl } from "@/utils";
import AnnouncementBanner from "../shared/AnnouncementBanner";
import CalibrationGate from "../makers/CalibrationGate";
import MakerOnboarding from "../makers/MakerOnboarding";
import MakerEarningsTab from "../makers/MakerEarningsTab";
import MakerContentUpload from "../makers/MakerContentUpload";

export default function MakerDashboardContent({ user: propUser, onUpdate }) {
  const [user, setUser] = useState(propUser);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyHours: 0
  });
  const [activeTab, setActiveTab] = useState("orders");
  const [ordersSubTab, setOrdersSubTab] = useState("active");
  const [expandedOrders, setExpandedOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('makerExpandedOrders') || '{}'); } catch { return {}; }
  });
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoFormData, setInfoFormData] = useState({
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zip: '' }
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [showKitOffer, setShowKitOffer] = useState(false);
  const [makerLinks, setMakerLinks] = useState([]);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [savingLink, setSavingLink] = useState(false);
  const [makerGallery, setMakerGallery] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const dismissedKey = `kit_offer_dismissed_${propUser?.id}`;
    const hasDismissed = localStorage.getItem(dismissedKey);
    // Show if: not dismissed locally AND (starter_kit_offer_shown is false or newly approved within 7 days)
    if (!hasDismissed && propUser?.id) {
      const isNewMaker = propUser.starter_kit_offer_shown === false;
      const createdAt = new Date(propUser.created_date || 0);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (isNewMaker || daysSinceCreation < 7) setShowKitOffer(true);
    }
  }, [propUser?.id]);

  const dismissKitOffer = () => {
    localStorage.setItem(`kit_offer_dismissed_${propUser?.id}`, 'true');
    setShowKitOffer(false);
  };

  useEffect(() => {
    loadDashboard();

    // Real-time subscription — reload silently whenever an Order changes.
    // Debounce to avoid hammering the API on rapid sequential updates.
    let debounceTimer = null;
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadDashboard(true), 1500);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(debounceTimer);
    };
  }, []);

  const loadDashboard = async (silent = false) => {
    // silent=true skips the full-screen spinner (used after button actions so tabs don't flash)
    if (!silent) setLoading(true);
    try {
      // Always fetch fresh user data so reassigned orders (with updated maker_id) are visible immediately
      const currentUser = await base44.auth.me().catch(() => propUser);
      setUser(currentUser);

      // Use list() — the backend returns all orders the user can see.
      // Maker RLS allows reading orders where maker_id matches.
      // We fetch broadly and filter client-side to catch both maker_id and assigned_to_makers cases.
      const allOrders = await base44.entities.Order.list('-created_date', 200);
      // Filter out supply/admin orders — never show on maker dashboard
      const isProductionOrder = (order) => {
        const notes = (order.notes || '').toLowerCase();
        if (notes.includes('[supply]') || notes.includes('shipping kit') || notes.includes('filament supply')) return false;
        const items = order.items || [];
        if (items.length === 0) return false;
        return items.some(i => i.selected_material || (i.print_files && i.print_files.length > 0));
      };

      const myOrders = allOrders.filter(order => {
        if (!isProductionOrder(order)) return false;
        // Primary assignment: maker_id matches
        const isAssignedMaker = order.maker_id === currentUser.maker_id;
        // Multi-assignment pool: in assigned_to_makers and not yet claimed by another maker
        const isInMultiAssignment = Array.isArray(order.assigned_to_makers) &&
          order.assigned_to_makers.includes(currentUser.maker_id) &&
          !order.maker_id;
        // Offered but not yet accepted (offer_status offered, current_offered_maker_id matches)
        const isOffered = order.current_offered_maker_id === currentUser.maker_id &&
          order.offer_status === 'offered';
        // Admin reassigned: maker_id matches but offer_status may not be set
        const isAdminAssigned = order.maker_id === currentUser.maker_id;
        return isAssignedMaker || isInMultiAssignment || isOffered || isAdminAssigned;
      });

      const sortedOrders = myOrders.sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      
      setOrders(sortedOrders);

      const allPrinters = await base44.entities.Printer.filter({
        maker_id: currentUser.maker_id
      });
      setPrinters(allPrinters);

      const allFilaments = await base44.entities.Filament.filter({
        maker_id: currentUser.maker_id
      }).catch(() => []);
      setFilaments(allFilaments);

      const COMPLETED_STATUSES = ['done_printing', 'shipped', 'dropped_off', 'delivered', 'completed'];
      const ACTIVE_STATUSES = ['pending', 'accepted', 'printing'];

      const activeOrders = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
      const completedOrders = myOrders.filter(o => COMPLETED_STATUSES.includes(o.status)).length;

      // Earnings calculation — runs on ALL maker orders (not filtered by isProductionOrder)
      // so that orders without print_files/selected_material still count toward earnings
      const allMyOrders = allOrders.filter(order =>
        order.maker_id === currentUser.maker_id ||
        (order.assigned_to_makers?.includes(currentUser.maker_id) && !order.maker_id)
      );

      const getOrderEarnings = (o) => {
        if (o.maker_payout_amount != null && o.maker_payout_amount > 0) return o.maker_payout_amount;
        const itemsTotal = (o.items || []).reduce((s, item) => s + (item.total_price || 0), 0);
        // Fall back to total_amount minus shipping if no items breakdown
        const listingTotal = itemsTotal > 0
          ? itemsTotal
          : (o.total_amount || 0) - (o.shipping_cost || 0);
        return listingTotal * 0.5;
      };

      const calcEarnings = (orderList) =>
        orderList
          .filter(o => COMPLETED_STATUSES.includes(o.status))
          .reduce((sum, o) => sum + getOrderEarnings(o), 0);

      const totalEarnings = calcEarnings(allMyOrders);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyEarnings = calcEarnings(
        allMyOrders.filter(o => {
          const d = new Date(o.updated_date || o.created_date);
          return d >= firstDayOfMonth;
        })
      );

      setStats({
        activeOrders,
        completedOrders,
        totalEarnings,
        monthlyEarnings,
        weeklyHours: currentUser.hours_printed_this_week || 0
      });

      setInfoFormData({
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || { street: '', city: '', state: '', zip: '' }
      });

      // Load global links & gallery from shared MarketingResource record
      try {
        const globalAssets = await base44.entities.MarketingResource.filter({ key: "maker_hub_global" }).catch(() => []);
        if (globalAssets.length > 0) {
          setMakerLinks(globalAssets[0].links || []);
          setMakerGallery(globalAssets[0].images || []);
        } else {
          setMakerLinks(currentUser.maker_links || []);
          setMakerGallery(currentUser.maker_gallery_images || []);
        }
      } catch {
        setMakerLinks(currentUser.maker_links || []);
        setMakerGallery(currentUser.maker_gallery_images || []);
      }

    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast({
        title: "Failed to load dashboard data",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const getNextPayoutDate = () => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDayOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAcceptOrder = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, {
        status: 'accepted',
        offer_status: 'accepted',
        maker_id: user.maker_id
      });
      toast({ title: "Order accepted successfully!" });
      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to accept order", description: error.message, variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleMarkPrinting = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, { status: 'printing' });
      toast({ title: "Order marked as printing" });
      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleMarkDonePrinting = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      await base44.entities.Order.update(orderId, { status: 'done_printing' });

      // Auto-generate shipping label if order needs shipping
      if (order && !order.is_local_delivery && order.shipping_address?.street) {
        try {
          const res = await base44.functions.invoke('generateShippingLabel', { orderId });
          const data = res.data;
          if (data?.success && data?.tracking_number) {
            toast({
              title: "✅ Done printing! Shipping label generated.",
              description: `Tracking: ${data.tracking_number} — check the order card for the label.`
            });
          } else {
            toast({
              title: "Done printing",
              description: data?.error || "Label generation failed. Please generate manually."
            });
          }
        } catch (labelErr) {
          console.error('Label generation failed:', labelErr);
          toast({ title: "Marked done printing", description: "Shipping label generation failed — please generate manually." });
        }
      } else {
        toast({ title: "Marked done printing!", description: "Arrange drop-off with the customer." });
      }

      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleRevertOrder = async (orderId, targetStatus) => {
    setUpdatingOrder(orderId);
    try {
      await base44.entities.Order.update(orderId, { status: targetStatus });
      toast({ title: `Order reverted to ${targetStatus.replace('_', ' ')}` });
      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to revert order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleMarkShipped = async (orderId) => {
    setUpdatingOrder(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      await base44.entities.Order.update(orderId, {
        status: 'shipped',
        dropped_off_at: new Date().toISOString()
      });

      // Notify customer — guest orders may have an email (not a user ID) as customer_id,
      // so fall back to the shipping address email if the user lookup fails.
      try {
        let customer = null;
        try {
          customer = await base44.entities.User.get(order.customer_id);
        } catch {
          const fallbackEmail = order.shipping_address?.email ||
            (String(order.customer_id || '').includes('@') ? order.customer_id : null);
          if (fallbackEmail) {
            customer = { email: fallbackEmail, full_name: order.shipping_address?.name || 'Customer' };
          }
        }
        if (!customer?.email) throw new Error('No customer email available for shipped notification');
        const trackingInfo = order.tracking_number
          ? `\nTracking number: ${order.tracking_number}`
          : '';
        await base44.functions.invoke('sendEmail', {
          to: customer.email,
          subject: '📦 Your Order Has Shipped! — EX3D Prints',
          body: `Hi ${customer.full_name},\n\nGreat news! Your order #${orderId.slice(-8)} has been shipped.${trackingInfo}\n\nItems:\n${(order.items || []).map(item => `- ${item.product_name} (×${item.quantity})`).join('\n')}\n\nThank you for choosing EX3D Prints!\n\nBest regards,\nThe EX3D Team`
        });
      } catch (emailError) {
        console.error('Failed to send shipped email:', emailError);
      }

      // Transfer payment if Stripe Connect set up
      if ((user?.stripe_connect_account_id || user?.stripe_account_id) && user?.stripe_connect_onboarding_complete) {
        try {
          await base44.functions.invoke('createStripeTransferToMaker', { orderId });
        } catch (transferError) {
          console.error('Auto payment transfer failed:', transferError);
        }
      }

      toast({ title: "Marked as shipped! Customer has been notified." });
      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to update order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleRejectOrder = async (orderId) => {
    const reason = prompt("Please provide a reason for rejecting this order:");
    if (!reason) return;

    setUpdatingOrder(orderId);
    try {
      const order = orders.find(o => o.id === orderId);

      for (const item of (order.items || [])) {
        if (!item.product_id) continue;
        try {
          const product = await base44.entities.Product.get(item.product_id);
          await base44.entities.Product.update(item.product_id, {
            rejection_count: (product.rejection_count || 0) + 1
          });
        } catch (error) {
          console.error(`Failed to update rejection count for product ${item.product_id}:`, error);
        }
      }

      // Add rejecting maker to skipped list so they aren't re-offered the same order
      const skippedIds = [...new Set([...(order.skipped_maker_ids || []), user.maker_id])];

      await base44.entities.Order.update(orderId, {
        status: 'pending',
        offer_status: 'pending_assignment',
        maker_id: null,
        current_offered_maker_id: null,
        skipped_maker_ids: skippedIds,
        cancellation_reason: reason
      });

      try {
        await base44.functions.invoke('assignOrderToMaker', {
          orderId: orderId,
          skippedMakerIds: skippedIds,
        });
      } catch (reassignError) {
        console.error("Failed to reassign order:", reassignError);
      }

      toast({ title: "Order rejected and reassigned" });
      await loadDashboard(true);
    } catch (error) {
      toast({ title: "Failed to reject order", variant: "destructive" });
    }
    setUpdatingOrder(null);
  };

  const handleAddLink = async () => {
    if (!newLink.label.trim() || !newLink.url.trim()) {
      toast({ title: "Please enter both a label and URL", variant: "destructive" });
      return;
    }
    let url = newLink.url.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setSavingLink(true);
    try {
      const updatedLinks = [...makerLinks, { id: Date.now().toString(), label: newLink.label.trim(), url }];
      await base44.auth.updateMe({ maker_links: updatedLinks });
      setMakerLinks(updatedLinks);
      setNewLink({ label: '', url: '' });
      toast({ title: "Link added!" });
    } catch (error) {
      toast({ title: "Failed to add link", variant: "destructive" });
    }
    setSavingLink(false);
  };

  const handleRemoveLink = async (id) => {
    try {
      const updatedLinks = makerLinks.filter(l => l.id !== id);
      await base44.auth.updateMe({ maker_links: updatedLinks });
      setMakerLinks(updatedLinks);
      toast({ title: "Link removed" });
    } catch {
      toast({ title: "Failed to remove link", variant: "destructive" });
    }
  };

  const toggleOrderExpanded = (orderId) => {
    setExpandedOrders(prev => {
      const next = { ...prev, [orderId]: !prev[orderId] };
      localStorage.setItem('makerExpandedOrders', JSON.stringify(next));
      return next;
    });
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      toast({ title: "Downloading file..." });
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const urlPath = fileUrl.split('?')[0];
      const ext = urlPath.split('.').pop().toLowerCase();
      const mimeMap = {
        '3mf': 'application/octet-stream',
        'stl': 'application/octet-stream',
        'obj': 'application/octet-stream',
        'step': 'application/octet-stream',
        'stp': 'application/octet-stream',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';
      const blob = new Blob([arrayBuffer], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Derive filename: prefer passed fileName, else extract from URL and ensure correct ext
      const urlFilename = urlPath.split('/').pop();
      const cleanName = urlFilename.replace(/[^a-z0-9._-]/gi, '_');
      a.download = fileName || cleanName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { window.URL.revokeObjectURL(url); a.remove(); }, 1500);
      toast({ title: "Download started!" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Failed to download file", description: "Please try again", variant: "destructive" });
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-900',
      accepted: 'bg-blue-100 text-blue-900',
      printing: 'bg-purple-100 text-purple-900',
      done_printing: 'bg-orange-100 text-orange-900',
      shipped: 'bg-teal-100 text-teal-900',
      dropped_off: 'bg-teal-100 text-teal-900',
      delivered: 'bg-emerald-100 text-emerald-900',
      cancelled: 'bg-red-100 text-red-900',
      unassigned: 'bg-gray-100 text-gray-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-900';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      accepted: 'Accepted',
      printing: 'Printing',
      done_printing: 'Done Printing',
      shipped: 'Shipped',
      dropped_off: 'Shipped/Dropped Off',
      delivered: 'Delivered ✓',
      cancelled: 'Cancelled',
      unassigned: 'Unassigned'
    };
    return labels[status] || status;
  };

  const getOrderCardHeaderClass = (status, isPriority) => {
    if (status === 'cancelled') return 'bg-red-100 border-b-2 border-red-500';
    if (isPriority) return 'bg-gradient-to-r from-yellow-200 to-amber-200 border-b-2 border-amber-500';
    return 'bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  const handleOnboardingNavigate = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      <AnnouncementBanner userRole="maker" userId={user?.id} />

      {showKitOffer && (
        <div className="relative p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl">
          <button
            onClick={dismissKitOffer}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >✕</button>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-bold text-orange-900">Welcome! Grab your Starter Shipping Kit at 50% Off!</p>
              <p className="text-sm text-orange-800 mt-1">
                As a new maker, get your first Starter Shipping Kit for just <strong>$10</strong> (normally $20).
                Includes boxes, packing tape, and packing paper.
              </p>
              <button
                onClick={() => { setActiveTab("exp"); dismissKitOffer(); }}
                className="mt-2 inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-1.5 rounded font-medium"
              >
                Claim $10 Starter Kit →
              </button>
            </div>
          </div>
        </div>
      )}

      {user && !user.maker_onboarding_completed && (
        <MakerOnboarding
          user={user}
          onNavigate={handleOnboardingNavigate}
          onComplete={loadDashboard}
        />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maker Hub</h2>
          <p className="text-gray-600">Manage your printing orders and equipment</p>
        </div>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Next Payout</p>
                <p className="font-semibold text-blue-900">{getNextPayoutDate()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeOrders}</p>
              </div>
              <Package className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                 <p className="text-3xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
                 <p className="text-xs text-gray-400 mt-1">50% of item cost</p>
              </div>
              <DollarSign className="w-10 h-10 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Earnings</p>
                <p className="text-3xl font-bold text-gray-900">${stats.monthlyEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="setup">
            <Printer className="w-4 h-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="exp">
            <Package className="w-4 h-4 mr-2" />
            Supplies
          </TabsTrigger>
          <TabsTrigger value="content">
            <Film className="w-4 h-4 mr-2" />
            Content Upload
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {/* Sub-tabs: Active vs Complete */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrdersSubTab("active")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ordersSubTab === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Active ({orders.filter(o => !['shipped', 'dropped_off', 'delivered', 'completed', 'cancelled'].includes(o.status)).length})
            </button>
            <button
              onClick={() => setOrdersSubTab("complete")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ordersSubTab === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Complete ({orders.filter(o => ['shipped', 'dropped_off', 'delivered', 'completed'].includes(o.status)).length})
            </button>
          </div>

          {(() => {
            const COMPLETE_STATUSES = ['shipped', 'dropped_off', 'delivered', 'completed'];
            const displayOrders = ordersSubTab === 'active'
              ? orders.filter(o => !COMPLETE_STATUSES.includes(o.status))
              : orders.filter(o => COMPLETE_STATUSES.includes(o.status));

            if (displayOrders.length === 0) {
              return (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">{ordersSubTab === 'active' ? 'No active orders. Check back soon!' : 'No completed orders yet.'}</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-3">
                {displayOrders.map(order => {
                  const isExpanded = !!expandedOrders[order.id];
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      {/* Collapsed header — always visible */}
                      <button
                        className={`w-full text-left px-5 py-4 flex items-center justify-between gap-3 ${getOrderCardHeaderClass(order.status, order.is_priority)}`}
                        onClick={() => toggleOrderExpanded(order.id)}
                      >
                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                          <span className="font-bold text-gray-900">Order #{order.id.slice(-8)}</span>
                          {order.is_priority && <Badge className="bg-orange-500 text-white text-xs">⚡ Priority</Badge>}
                          {order.notes?.includes('[AFFILIATE_FREE_SAMPLE]') && <Badge className="bg-purple-100 text-purple-800 text-xs">🎁 Complimentary</Badge>}
                          <span className="text-sm text-gray-500">{new Date(order.created_date).toLocaleDateString()}</span>
                          <Badge className={getStatusBadgeColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {order.status !== 'cancelled' && (
                            <span className="font-bold text-green-600 text-sm">
                              ${(order.maker_payout_amount != null
                                ? order.maker_payout_amount
                                : ((order.total_amount || 0) - (order.shipping_cost || 0)) * 0.5
                              ).toFixed(2)}
                            </span>
                          )}
                          <span className="text-gray-400 text-lg">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <CardContent className="p-5">
                          {order.is_priority && order.status !== 'cancelled' && (
                            <div className="mb-4 p-2 bg-amber-500 text-white rounded-md">
                              <p className="text-sm font-bold">⚡ PRIORITY OVERNIGHT DELIVERY</p>
                              <p className="text-xs">This order MUST be completed by next day for overnight delivery.</p>
                            </div>
                          )}

                          <div className="space-y-4">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="pb-4 border-b last:border-b-0">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-2">
                                      {item.images?.[0] && (
                                        <img src={item.images[0]} alt={item.product_name} className="w-16 h-16 object-cover rounded border flex-shrink-0" />
                                      )}
                                      <div>
                                        <h4 className="font-semibold text-lg">{item.product_name}</h4>
                                        {item.product_id && (
                                          <a href={`/ProductDetail?id=${item.product_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                            <ExternalLink className="w-3 h-3" /> View Listing
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                                      <div><span className="font-medium">Material:</span> {item.selected_material || 'PLA'}</div>
                                      <div><span className="font-medium">Qty:</span> {item.quantity}</div>
                                      <div><span className="font-medium">Color:</span> {item.selected_color || 'Black'}</div>
                                      <div><span className="font-medium">Resolution:</span> {item.selected_resolution || 0.2}mm</div>
                                      {item.dimensions && (
                                        <div className="col-span-2"><span className="font-medium">Dimensions (LWH):</span> {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height} mm</div>
                                      )}
                                      {item.weight_grams && (
                                        <div className="col-span-2"><span className="font-medium">Filament needed:</span> ~{Math.round((item.weight_grams || 0) * (item.quantity || 1))} g</div>
                                      )}
                                      {item.print_time_hours && (
                                        <div className="col-span-2"><span className="font-medium">Est. print time:</span> ~{((item.print_time_hours || 0) * (item.quantity || 1)).toFixed(1)} hrs</div>
                                      )}
                                    </div>
                                    {item.print_files && item.print_files.length > 0 ? (
                                      <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                          Print Files:
                                          {['pending', 'offered'].includes(order.status) && (
                                            <span className="ml-2 text-xs text-amber-600 font-normal">(Accept order to download)</span>
                                          )}
                                        </p>
                                        {['accepted', 'printing', 'done_printing', 'shipped', 'dropped_off', 'delivered', 'completed'].includes(order.status) ? (
                                          <div className="flex flex-wrap gap-2">
                                            {item.print_files.map((fileUrl, fileIdx) => {
                                              const urlPath = fileUrl.split('?')[0];
                                              const fileExt = urlPath.split('.').pop().toLowerCase() || 'stl';
                                              const urlFilename = urlPath.split('/').pop();
                                              return (
                                                <Button key={fileIdx} size="sm" variant="outline" onClick={() => handleDownloadFile(fileUrl, urlFilename)} className="text-xs">
                                                  <Download className="w-3 h-3 mr-1" /> {urlFilename || `File ${fileIdx + 1} (.${fileExt})`}
                                                </Button>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-2">
                                            {item.print_files.map((fileUrl, fileIdx) => {
                                              const urlPath = fileUrl.split('?')[0];
                                              const fileExt = urlPath.split('.').pop().toLowerCase() || 'stl';
                                              return (
                                                <span key={fileIdx} className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-400 bg-gray-50">
                                                  File {fileIdx + 1} (.{fileExt}) — accept to download
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 mt-2 italic">No print files attached</p>
                                    )}
                                  </div>
                                  <p className="font-semibold text-lg ml-4">${(Number(item.total_price) || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}

                            <div className="flex justify-between items-center pt-4 border-t">
                              <div>
                                <p className="font-semibold">Listing Total: ${((order.total_amount || 0) - (order.shipping_cost || 0)).toFixed(2)}</p>
                                {order.tracking_number && (
                                  <p className="text-xs text-blue-600 mt-1 font-mono">📦 {order.tracking_number}</p>
                                )}
                              </div>

                              <div className="flex gap-2 flex-wrap justify-end">
                                {order.shipping_label_url && !['shipped', 'delivered', 'dropped_off', 'completed'].includes(order.status) && (
                                  <Button size="sm" variant="outline" onClick={() => window.open(order.shipping_label_url, '_blank')} className="text-blue-600 border-blue-300 hover:bg-blue-50">
                                    <Download className="w-3 h-3 mr-1" /> Label
                                  </Button>
                                )}
                                {order.status === 'pending' && (
                                  <>
                                    <Button size="sm" onClick={() => handleAcceptOrder(order.id)} disabled={updatingOrder === order.id} className="bg-green-600 hover:bg-green-700">
                                      {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectOrder(order.id)} disabled={updatingOrder === order.id}>Reject</Button>
                                  </>
                                )}
                                {order.status === 'accepted' && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => handleRevertOrder(order.id, 'pending')} disabled={updatingOrder === order.id} className="text-gray-600 border-gray-300">← Back</Button>
                                    <Button size="sm" onClick={() => handleMarkPrinting(order.id)} disabled={updatingOrder === order.id} className="bg-purple-600 hover:bg-purple-700">Start Printing</Button>
                                  </>
                                )}
                                {order.status === 'printing' && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => handleRevertOrder(order.id, 'accepted')} disabled={updatingOrder === order.id} className="text-gray-600 border-gray-300">← Back</Button>
                                    <Button size="sm" onClick={() => handleMarkDonePrinting(order.id)} disabled={updatingOrder === order.id} className="bg-orange-600 hover:bg-orange-700">
                                      {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Done Printing'}
                                    </Button>
                                  </>
                                )}
                                {order.status === 'done_printing' && (
                                  <div className="flex flex-col items-end gap-1">
                                    {order.shipping_label_url ? (
                                      <Button size="sm" variant="outline" onClick={() => window.open(order.shipping_label_url, '_blank')} className="text-blue-600 border-blue-300">
                                        <Download className="w-3 h-3 mr-1" /> Print Shipping Label
                                      </Button>
                                    ) : !order.is_local_delivery && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={updatingOrder === order.id}
                                        onClick={async () => {
                                          setUpdatingOrder(order.id);
                                          try {
                                            const res = await base44.functions.invoke('generateShippingLabel', { orderId: order.id });
                                            const data = res?.data ?? res;
                                            if (data?.success) {
                                              toast({ title: "Label generated!", description: `Tracking: ${data.tracking_number}` });
                                              await loadDashboard(true);
                                            } else {
                                              toast({ title: "Label generation failed", description: data?.error || "Check order address and try again.", variant: "destructive", duration: 8000 });
                                            }
                                          } catch (err) {
                                            toast({ title: "Label generation failed", description: err.message, variant: "destructive" });
                                          }
                                          setUpdatingOrder(null);
                                        }}
                                        className="text-blue-600 border-blue-300"
                                      >
                                        {updatingOrder === order.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                                        {updatingOrder === order.id ? 'Generating...' : 'Generate Label'}
                                      </Button>
                                    )}
                                    <Button size="sm" onClick={() => handleMarkShipped(order.id)} disabled={updatingOrder === order.id} className="bg-teal-600 hover:bg-teal-700">
                                      {updatingOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Shipped'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="setup">
          <div className="space-y-6">
            <CalibrationGate user={user}>
            <div className="flex justify-end">
              <Dialog open={showPrinterDialog} onOpenChange={setShowPrinterDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingPrinter(null); setShowPrinterDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Printer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPrinter ? 'Edit Printer' : 'Add New Printer'}</DialogTitle>
                    <DialogDescription>
                      {editingPrinter ? 'Update your printer information' : 'Register a new 3D printer to your maker account'}
                    </DialogDescription>
                  </DialogHeader>
                  <AddPrinterForm
                    printer={editingPrinter}
                    onClose={() => { setShowPrinterDialog(false); setEditingPrinter(null); }}
                    onSuccess={() => { setShowPrinterDialog(false); setEditingPrinter(null); loadDashboard(); }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {printers.map(printer => (
                <Card key={printer.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => { setEditingPrinter(printer); setShowPrinterDialog(true); }}>
                  <CardHeader>
                    <CardTitle className="text-lg">{printer.name || `${printer.brand} ${printer.model}`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Brand:</span>
                        <span className="font-medium">{printer.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">{printer.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className={
                          printer.status === 'active' ? 'bg-green-100 text-green-900' :
                            printer.status === 'printing' ? 'bg-blue-100 text-blue-900' :
                              printer.status === 'maintenance' ? 'bg-yellow-100 text-yellow-900' :
                                'bg-gray-100 text-gray-900'
                        }>
                          {printer.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {printers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Printer className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No printers registered yet</p>
                  <Button onClick={() => setShowPrinterDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Printer
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="mt-8">
              <FilamentManager makerId={user?.maker_id} />
            </div>
            </CalibrationGate>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <MakerContentUpload user={user} />
        </TabsContent>

        <TabsContent value="exp">
          <div className="max-w-3xl space-y-6">

            {/* Gallery & Resources at top */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-teal-600" />
                  My Gallery & Resources
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Images and files uploaded by the EX3D team for you to use. Click to download.</p>
              </CardHeader>
              <CardContent>
                {makerGallery.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {makerGallery.map((fileUrl, idx) => {
                      const urlPath = fileUrl.split('?')[0];
                      const ext = urlPath.split('.').pop().toLowerCase();
                      const isPdf = ext === 'pdf' || fileUrl.toLowerCase().includes('.pdf');
                      const fileName = decodeURIComponent(urlPath.split('/').pop()) || `file_${idx + 1}.${ext}`;
                      return (
                        <button key={idx} onClick={() => handleDownloadFile(fileUrl, fileName)}
                          className="relative rounded-lg overflow-hidden border bg-gray-50 block hover:opacity-90 transition-opacity text-left w-full"
                          title={`Download ${fileName}`}
                        >
                          {isPdf ? (
                            <div className="w-full aspect-video flex flex-col items-center justify-center bg-red-50 border-red-200 gap-1 p-3">
                              <FileText className="w-8 h-8 text-red-500" />
                              <span className="text-xs text-red-700 font-medium text-center break-all line-clamp-2">{fileName}</span>
                            </div>
                          ) : (
                            <img src={fileUrl} alt={`Gallery ${idx + 1}`} className="w-full aspect-video object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-end justify-center pb-2 opacity-0 hover:opacity-100">
                            <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded">Download</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No gallery files yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Links & Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-teal-600" />
                  Links & Resources
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Helpful links and resources provided by the EX3D team.</p>
              </CardHeader>
              <CardContent>
                {makerLinks.length > 0 ? (
                  <div className="space-y-2">
                    {makerLinks.map(link => (
                      <div key={link.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                        <Link2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{link.label}</p>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline truncate block">{link.url}</a>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-teal-500 hover:text-teal-700 flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">No links or resources added yet. Check back soon!</div>
                )}
              </CardContent>
            </Card>

            {/* Supplies / EXP */}
            <MakerExpRedeemTab user={user} onUpdate={loadDashboard} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Account</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Connect your Stripe account to receive payments automatically when orders are completed
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(user?.stripe_connect_account_id || user?.stripe_account_id) && user?.stripe_connect_onboarding_complete ? (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-green-900">Stripe Account Connected</p>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Your Stripe account is connected. You'll automatically receive payments when orders are completed. Payouts are sent at the end of each month.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data } = await base44.functions.invoke('getStripeDashboardLink');
                            if (data.url) window.open(data.url, '_blank');
                          } catch (error) {
                            toast({ title: "Failed to open Stripe dashboard", variant: "destructive" });
                          }
                        }}
                        className="border-green-400 text-green-700 hover:bg-green-100"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Manage Stripe Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(user?.stripe_connect_account_id || user?.stripe_account_id) && !user?.stripe_connect_onboarding_complete && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800 font-medium">⚠️ Stripe setup incomplete. Click below to finish connecting your account.</p>
                      </div>
                    )}
                    {!user?.stripe_connect_account_id && !user?.stripe_account_id && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900 font-medium mb-2">🚀 Get Paid Automatically</p>
                        <p className="text-sm text-blue-700">
                          Connect your Stripe account to receive payments automatically when you complete orders. Payouts are sent at the end of each month.
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={async () => {
                        try {
                          const { data } = await base44.functions.invoke('createStripeConnectOnboarding');
                          if (data.onboarding_url) {
                            window.location.href = data.onboarding_url;
                          }
                        } catch (error) {
                          toast({ title: "Failed to start onboarding", variant: "destructive" });
                        }
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      {(user?.stripe_connect_account_id || user?.stripe_account_id) ? 'Complete Stripe Setup' : 'Connect Stripe Account'}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Powered by Stripe Connect - Secure and trusted by millions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-600" />
                  My Shipping Address
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  This address is used when generating USPS shipping labels for orders you ship.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {!editingInfo ? (
                  <div>
                    {user?.address?.street ? (
                      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
                        <p className="font-medium">{user.address.street}</p>
                        <p>{user.address.city}, {user.address.state} {user.address.zip}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        ⚠️ No address on file. Add your address so shipping labels can be generated automatically.
                      </div>
                    )}
                    <Button variant="outline" className="mt-3" onClick={() => setEditingInfo(true)}>
                      {user?.address?.street ? 'Update Address' : 'Add Address'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Street Address</Label>
                      <Input value={infoFormData.address.street} onChange={e => setInfoFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))} placeholder="123 Main St" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <Label className="text-sm">City</Label>
                        <Input value={infoFormData.address.city} onChange={e => setInfoFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))} placeholder="City" />
                      </div>
                      <div>
                        <Label className="text-sm">State</Label>
                        <Input value={infoFormData.address.state} onChange={e => setInfoFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))} placeholder="AZ" maxLength={2} />
                      </div>
                      <div>
                        <Label className="text-sm">ZIP</Label>
                        <Input value={infoFormData.address.zip} onChange={e => setInfoFormData(prev => ({ ...prev, address: { ...prev.address, zip: e.target.value } }))} placeholder="12345" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={savingAddress}
                        onClick={async () => {
                          setSavingAddress(true);
                          try {
                            await base44.auth.updateMe({ address: infoFormData.address, phone: infoFormData.phone });
                            toast({ title: "Address updated!" });
                            setEditingInfo(false);
                            await loadDashboard(true);
                          } catch (error) {
                            toast({ title: "Failed to save", variant: "destructive" });
                          }
                          setSavingAddress(false);
                        }}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Address'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingInfo(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vacation Mode</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  When enabled, you won't receive new order assignments. Existing orders remain active.
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  variant={user?.vacation_mode ? "destructive" : "default"}
                  onClick={async () => {
                    try {
                      await base44.auth.updateMe({ vacation_mode: !user?.vacation_mode });
                      toast({
                        title: user?.vacation_mode ? "Vacation mode disabled" : "Vacation mode enabled",
                        description: user?.vacation_mode ? "You will now receive order assignments" : "You won't receive new orders while on vacation"
                      });
                      await loadDashboard(true);
                      if (onUpdate) onUpdate();
                    } catch (error) {
                      toast({ title: "Failed to update vacation mode", variant: "destructive" });
                    }
                  }}
                >
                  {user?.vacation_mode ? "Disable Vacation Mode" : "Enable Vacation Mode"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}