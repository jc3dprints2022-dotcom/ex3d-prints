import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Copy, CheckCircle, TrendingUp, DollarSign, MousePointer,
  ShoppingBag, Gift, Link2, Star, Settings, ExternalLink, Trash2, AlertTriangle
} from "lucide-react";

const PRODUCT_SLUGS = {
  "Starship": "Starship",
  "Saturn V": "SaturnV",
  "SLS": "SLS",
};

const CATEGORY_LABELS = {
  rocket_models: "Rocket Models", kit_cards: "Kit Cards", desk: "Desk & Office",
  toys_and_games: "Toys & Games", art: "Art & Decor", gadgets: "Gadgets",
  home_decor: "Home Decor", dorm_essentials: "Dorm Essentials", collectibles: "Collectibles",
  accessories: "Accessories", misc: "General / Mixed",
};

function StatCard({ title, value, sub, icon: Icon, color = "text-teal-600" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <span>{title}</span>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AffiliateHubTab({ user, onUpdate }) {
  const [affiliate, setAffiliate] = useState(null);
  const [products, setProducts] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [affiliateOrders, setAffiliateOrders] = useState([]);
  const [affiliateEarnings, setAffiliateEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingFree, setClaimingFree] = useState(false);
  const [selectedFreeProduct, setSelectedFreeProduct] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ full_name: "", email: "", platform: "", follower_count: "" });
  const [shippingForm, setShippingForm] = useState({ name: "", street: "", street2: "", city: "", state: "", zip: "", country: "US" });
  const [savingShipping, setSavingShipping] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [affiliateRecords, allProducts, allClicks] = await Promise.all([
        base44.entities.Affiliate.filter({ user_id: user.id }),
        base44.entities.Product.filter({ status: "active" }),
        base44.entities.AffiliateClick.list().catch(() => []),
      ]);

      const aff = affiliateRecords[0] || null;
      setAffiliate(aff);

      if (aff) {
        setSettingsForm({
          full_name: aff.full_name || "",
          email: aff.email || "",
          platform: aff.platform || "",
          follower_count: aff.follower_count || "",
        });
        setShippingForm({
          name: aff.shipping_address?.name || "",
          street: aff.shipping_address?.street || "",
          street2: aff.shipping_address?.street2 || "",
          city: aff.shipping_address?.city || "",
          state: aff.shipping_address?.state || "",
          zip: aff.shipping_address?.zip || "",
          country: aff.shipping_address?.country || "US",
        });

        const myClicks = allClicks.filter(c => c.affiliate_id === aff.affiliate_id);
        setClicks(myClicks);

        // Load affiliate earnings from AffiliateEarnings entity
        const earnings = await base44.entities.AffiliateEarnings.filter({ affiliate_id: aff.affiliate_id }).catch(() => []);
        setAffiliateEarnings(earnings);

        // Load orders attributed to this affiliate
        const allOrders = await base44.entities.Order.list().catch(() => []);
        const myOrders = allOrders.filter(o =>
          o.notes?.includes(`ref:${aff.affiliate_id}`) ||
          o.notes?.includes(`affiliate_id:${aff.affiliate_id}`) ||
          o.notes?.includes("[AFFILIATE")
        );
        setAffiliateOrders(myOrders);

        // Check Stripe status
        const stripeRes = await base44.functions.invoke("checkStripeAccountStatus", {}).catch(() => null);
        setStripeStatus(stripeRes?.data);
      }

      // Filter to affiliate's category; fall back to all products if no category set
      const catProducts = (aff?.content_category)
        ? allProducts.filter(p => p.category === aff.content_category)
        : allProducts;
      setProducts(catProducts);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getAffiliateLink = (product) => {
    if (!affiliate) return "";
    const origin = window.location.origin;
    const slug = PRODUCT_SLUGS[product.name];
    // Use ?ref= format universally — all landing pages and ProductDetail capture this param
    if (slug) return `${origin}/${slug}?ref=${affiliate.affiliate_id}`;
    return `${origin}/ProductDetail?id=${product.id}&ref=${affiliate.affiliate_id}`;
  };

  const getHomepageLink = () => {
    if (!affiliate) return "";
    return `${window.location.origin}?ref=${affiliate.affiliate_id}`;
  };

  const copyLink = (product) => {
    const link = getAffiliateLink(product);
    navigator.clipboard?.writeText(link).then(() => {
      setCopiedLink(product.id);
      setTimeout(() => setCopiedLink(null), 2000);
      toast({ title: "Link copied!" });
    });
  };

  // Free sample: one per rolling 30-day period.
  // Gate only on the last claim date — free_sample_claimed is kept for record-keeping
  // but no longer blocks future claims permanently.
  const canClaimThisMonth = () => {
    const lastClaim = affiliate?.free_sample_claimed_at;
    if (lastClaim) {
      const daysSince = (Date.now() - new Date(lastClaim).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) return false;
    }
    return true;
  };

  const nextClaimDate = () => {
    const lastClaim = affiliate?.free_sample_claimed_at;
    if (!lastClaim) return null;
    const next = new Date(new Date(lastClaim).getTime() + 30 * 24 * 60 * 60 * 1000);
    return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleClaimFree = async (product) => {
    if (!affiliate || !canClaimThisMonth()) return;
    setClaimingFree(true);
    try {
      // Use the product's standard price as the basis for maker/designer payouts
      // even though the customer pays $0 (Proxima absorbs as marketing cost)
      const standardPrice = product.price || 0;
      const shippingAddr = affiliate.shipping_address?.street
        ? affiliate.shipping_address
        : null;

      const orderData = {
        customer_id: user.id,
        items: [{
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          selected_material: product.materials?.[0] || "PLA",
          selected_color: product.colors?.[0] || "Black",
          unit_price: 0,
          total_price: 0,
          // Store standard price so earnings can be calculated from it
          standard_price: standardPrice,
          print_files: product.print_files || [],
          print_time_hours: product.print_time_hours || 0,
          weight_grams: product.weight_grams || 0,
          dimensions: product.dimensions || {},
          designer_id: product.designer_id,
          images: product.images || [],
        }],
        total_amount: 0,
        payment_status: "paid",
        status: "pending",
        // Mark as complimentary affiliate sample — visible in admin/maker dashboards
        notes: `[AFFILIATE_FREE_SAMPLE] affiliate_id:${affiliate.affiliate_id}`,
        shipping_address: shippingAddr,
        // Payout is 50% of the standard product price (not the $0 customer price)
        maker_payout_amount: standardPrice * 0.5,
      };

      const createdOrder = await base44.entities.Order.create(orderData);

      // Route to the nearest available maker (same as paid orders)
      await base44.functions.invoke('assignOrderToMaker', { orderId: createdOrder.id }).catch(e => {
        console.error('Maker assignment failed for free sample:', e);
      });

      // Record earnings at standard price so maker/designer still get paid
      await base44.functions.invoke('recordOrderEarnings', { orderId: createdOrder.id, overrideSubtotal: standardPrice }).catch(e => {
        console.error('recordOrderEarnings failed for free sample:', e);
      });

      await base44.entities.Affiliate.update(affiliate.id, {
        free_sample_claimed: true,
        free_sample_claimed_at: new Date().toISOString(),
        free_sample_product_id: product.id,
        free_sample_order_id: createdOrder.id,
      });

      toast({ title: "Free sample claimed! 🎉", description: "Your order has been placed. A maker will be assigned shortly." });
      setSelectedFreeProduct(null);
      loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to claim sample", description: error.message, variant: "destructive" });
    }
    setClaimingFree(false);
  };

  const handleSaveSettings = async () => {
    if (!affiliate) return;
    setSavingSettings(true);
    try {
      await base44.entities.Affiliate.update(affiliate.id, {
        full_name: settingsForm.full_name,
        email: settingsForm.email,
        platform: settingsForm.platform,
        follower_count: Number(settingsForm.follower_count) || 0,
      });
      await base44.auth.updateMe({ full_name: settingsForm.full_name });
      toast({ title: "Settings saved!" });
      loadData();
    } catch (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
    setSavingSettings(false);
  };

  const handleSaveShipping = async () => {
    if (!affiliate) return;
    if (!shippingForm.name || !shippingForm.street || !shippingForm.city || !shippingForm.zip || !shippingForm.country) {
      toast({ title: "Please fill in all required shipping fields", variant: "destructive" });
      return;
    }
    setSavingShipping(true);
    try {
      await base44.entities.Affiliate.update(affiliate.id, { shipping_address: shippingForm });
      toast({ title: "Shipping address saved!" });
      loadData();
    } catch (error) {
      toast({ title: "Failed to save address", description: error.message, variant: "destructive" });
    }
    setSavingShipping(false);
  };

  const handleDeleteAffiliate = async () => {
    if (!affiliate) return;
    try {
      await base44.entities.Affiliate.delete(affiliate.id);
      // Remove affiliate role
      const roles = (user.business_roles || []).filter(r => r !== 'affiliate');
      await base44.auth.updateMe({ business_roles: roles });
      toast({ title: "Affiliate account deleted." });
      if (onUpdate) onUpdate();
      window.location.reload();
    } catch (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  };

  const handleStripeSetup = async () => {
    try {
      const res = await base44.functions.invoke("createStripeConnectOnboarding", {});
      const url = res?.data?.url;
      if (url) window.open(url, "_blank");
      else throw new Error("No onboarding URL returned");
    } catch (error) {
      toast({ title: "Stripe setup failed", description: error.message, variant: "destructive" });
    }
  };

  // Metrics from real data
  const totalClicks = clicks.length;
  const totalOrders = affiliateOrders.length;
  const totalEarnings = affiliateEarnings.reduce((s, e) => s + (e.commission_amount || 0), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyEarnings = affiliateEarnings
    .filter(e => new Date(e.created_date) >= monthStart)
    .reduce((s, e) => s + (e.commission_amount || 0), 0);
  const conversionRate = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : "0.0";
  const avgOrderValue = totalOrders > 0
    ? (affiliateOrders.reduce((s, o) => s + (o.total_amount || 0), 0) / totalOrders).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="text-center py-12">
        <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">You're not an affiliate yet</h3>
        <p className="text-gray-500 mb-6">Apply to the affiliate program to start earning commissions.</p>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => window.location.href = "/AffiliateSignup"}>
          Apply Now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Affiliate Hub</h2>
            <p className="text-teal-100">ID: <code className="bg-teal-800/50 px-2 py-0.5 rounded text-sm">{affiliate.affiliate_id}</code></p>
            <Badge className="bg-white/20 text-white mt-2">{CATEGORY_LABELS[affiliate.content_category] || affiliate.content_category}</Badge>
          </div>
          <div className="text-right">
            <p className="text-teal-100 text-sm">Commission rate</p>
            <p className="text-3xl font-bold">20%</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full">
          <TabsTrigger value="dashboard" className="flex-1">📊 Dashboard & Links</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">⚙️ Settings</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-8 mt-6">
          {/* Performance */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Dashboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Clicks" value={totalClicks} icon={MousePointer} color="text-blue-600" />
              <StatCard title="Total Orders" value={totalOrders} icon={ShoppingBag} color="text-purple-600" />
              <StatCard title="All-Time Earnings" value={`$${totalEarnings.toFixed(2)}`} sub="from affiliate commissions" icon={DollarSign} color="text-teal-600" />
              <StatCard title="This Month" value={`$${monthlyEarnings.toFixed(2)}`} sub="current month earnings" icon={TrendingUp} color="text-green-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <StatCard title="Conversion Rate" value={`${conversionRate}%`} sub="orders / clicks" icon={TrendingUp} color="text-orange-600" />
              <StatCard title="Avg Order Value" value={`$${avgOrderValue}`} sub="per referred order" icon={Star} color="text-yellow-600" />
              <StatCard title="Pending Payout" value={`$${affiliateEarnings.filter(e => e.status === 'pending').reduce((s, e) => s + (e.commission_amount || 0), 0).toFixed(2)}`} sub="paid monthly" icon={DollarSign} color="text-emerald-600" />
            </div>
          </div>

          {/* Per-link breakdown */}
          {totalOrders > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Per-Link Performance</h3>
              <div className="space-y-3">
                {products.slice(0, 20).map(product => {
                  const productClicks = clicks.filter(c => c.product_id === product.id).length;
                  const productOrders = affiliateOrders.filter(o =>
                    o.items?.some(i => i.product_id === product.id)
                  ).length;
                  const productEarnings = affiliateEarnings
                    .filter(e => affiliateOrders.find(o => o.id === e.order_id)?.items?.some(i => i.product_id === product.id))
                    .reduce((s, e) => s + (e.commission_amount || 0), 0);
                  if (productClicks === 0 && productOrders === 0) return null;
                  return (
                    <Card key={product.id} className="bg-gray-50">
                      <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                        {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span className="text-blue-600">{productClicks} clicks</span>
                          <span className="text-purple-600">{productOrders} orders</span>
                          <span className="text-teal-600 font-semibold">${productEarnings.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          )}

          {/* Free Sample */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-teal-600" />
              Monthly Free Sample {!canClaimThisMonth() && <Badge className="bg-green-100 text-green-800 ml-2">✓ Claimed this month</Badge>}
            </h3>
            {!canClaimThisMonth() ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Sample Claimed This Month</p>
                    <p className="text-sm text-green-700">
                      Check your orders for status.{nextClaimDate() ? ` Your next free sample unlocks on ${nextClaimDate()}.` : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Select any one product to receive for free — maker and designer still get paid, we cover the cost. One free sample per month.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.slice(0, 12).map(product => (
                    <Card
                      key={product.id}
                      className={`cursor-pointer transition-all border-2 ${
                        selectedFreeProduct?.id === product.id ? "border-teal-500 shadow-md" : "border-transparent hover:border-teal-300"
                      }`}
                      onClick={() => setSelectedFreeProduct(selectedFreeProduct?.id === product.id ? null : product)}
                    >
                      <CardContent className="p-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} className="w-full h-28 object-cover rounded mb-2" />
                        )}
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">${(product.price || 0).toFixed(2)}</p>
                        {product.category === affiliate.content_category && (
                          <Badge className="bg-teal-100 text-teal-700 text-xs mt-1">Your Niche</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {selectedFreeProduct && (
                  <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900">Selected: {selectedFreeProduct.name}</p>
                      <p className="text-sm text-gray-600">This places a $0 order — you won't be charged.</p>
                    </div>
                    <Button onClick={() => handleClaimFree(selectedFreeProduct)} disabled={claimingFree} className="bg-teal-600 hover:bg-teal-700 text-white">
                      {claimingFree ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Claiming...</> : "Request Free Sample"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Affiliate Links */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-teal-600" />
              Your Affiliate Links
            </h3>
            {/* Homepage link */}
            <Card className="bg-teal-50 border-teal-200 mb-3">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-teal-900">Homepage (General)</p>
                  <code className="text-xs text-teal-700 truncate block">{getHomepageLink()}</code>
                  <p className="text-xs text-teal-600 mt-1">Use this for general promotions — works across all pages</p>
                </div>
                <Button variant="outline" size="sm" className="flex-shrink-0 border-teal-400 text-teal-700"
                  onClick={() => { navigator.clipboard?.writeText(getHomepageLink()); toast({ title: "Link copied!" }); }}>
                  <Copy className="w-4 h-4 mr-1" />Copy
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {products.slice(0, 20).map(product => {
                const link = getAffiliateLink(product);
                const productClicks = clicks.filter(c => c.product_id === product.id).length;
                return (
                  <Card key={product.id} className="bg-gray-50">
                    <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                        <code className="text-xs text-gray-500 truncate block">{link}</code>
                        <span className="text-xs text-blue-600 mt-1">{productClicks} clicks</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyLink(product)} className="flex-shrink-0">
                        {copiedLink === product.id ? (
                          <><CheckCircle className="w-4 h-4 mr-1 text-green-600" />Copied!</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-1" />Copy Link</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── SETTINGS TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Stripe Payout Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <DollarSign className="w-5 h-5 text-teal-600" /> Payout Account (Stripe)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Connect your Stripe account to receive monthly commission payouts automatically at the end of each month.
              </p>
              {stripeStatus?.onboarding_complete ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Stripe account connected — payouts enabled</span>
                </div>
              ) : (
                <Button onClick={handleStripeSetup} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" /> Set Up Stripe Payouts
                </Button>
              )}
              <p className="text-xs text-gray-400">Payouts are processed automatically at the end of each calendar month for all pending earnings.</p>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5 text-gray-600" /> Affiliate Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input value={settingsForm.full_name} onChange={e => setSettingsForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={settingsForm.email} onChange={e => setSettingsForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Platform / Channel</Label>
                  <Input value={settingsForm.platform} onChange={e => setSettingsForm(p => ({ ...p, platform: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Follower Count</Label>
                  <Input type="number" value={settingsForm.follower_count} onChange={e => setSettingsForm(p => ({ ...p, follower_count: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-teal-600 hover:bg-teal-700 text-white">
                {savingSettings ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Gift className="w-5 h-5 text-teal-600" /> Shipping Address
              </CardTitle>
              <p className="text-sm text-gray-500">Used when shipping your complimentary product. Keep this up to date.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {affiliate.shipping_address?.street ? null : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ No shipping address on file. Please add one so we can ship your free sample.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label>Full Name *</Label>
                  <Input value={shippingForm.name} onChange={e => setShippingForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Street Address *</Label>
                  <Input value={shippingForm.street} onChange={e => setShippingForm(p => ({ ...p, street: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Apt / Suite (optional)</Label>
                  <Input value={shippingForm.street2} onChange={e => setShippingForm(p => ({ ...p, street2: e.target.value }))} placeholder="Apt 4B" />
                </div>
                <div className="space-y-1">
                  <Label>City *</Label>
                  <Input value={shippingForm.city} onChange={e => setShippingForm(p => ({ ...p, city: e.target.value }))} placeholder="New York" />
                </div>
                <div className="space-y-1">
                  <Label>State / Province *</Label>
                  <Input value={shippingForm.state} onChange={e => setShippingForm(p => ({ ...p, state: e.target.value }))} placeholder="NY" />
                </div>
                <div className="space-y-1">
                  <Label>ZIP / Postal Code *</Label>
                  <Input value={shippingForm.zip} onChange={e => setShippingForm(p => ({ ...p, zip: e.target.value }))} placeholder="10001" />
                </div>
                <div className="space-y-1">
                  <Label>Country *</Label>
                  <Input value={shippingForm.country} onChange={e => setShippingForm(p => ({ ...p, country: e.target.value }))} placeholder="US" />
                </div>
              </div>
              <Button onClick={handleSaveShipping} disabled={savingShipping} className="bg-teal-600 hover:bg-teal-700 text-white">
                {savingShipping ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Address"}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!confirmDelete ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Delete Affiliate Account</p>
                    <p className="text-sm text-gray-500">This will remove your affiliate status and all associated data.</p>
                  </div>
                  <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete Account</Button>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-semibold">Are you sure? This cannot be undone.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDeleteAffiliate}>Yes, Delete</Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}