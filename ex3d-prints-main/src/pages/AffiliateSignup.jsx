import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Users, TrendingUp, Gift, Link } from "lucide-react";

const CATEGORIES = [
  { value: "rocket_models", label: "Rocket Models" },
  { value: "kit_cards", label: "Kit Cards" },
  { value: "desk", label: "Desk & Office" },
  { value: "toys_and_games", label: "Toys & Games" },
  { value: "art", label: "Art & Decor" },
  { value: "gadgets", label: "Gadgets" },
  { value: "home_decor", label: "Home Decor" },
  { value: "dorm_essentials", label: "Dorm Essentials" },
  { value: "collectibles", label: "Collectibles" },
  { value: "accessories", label: "Accessories" },
  { value: "halloween", label: "Halloween" },
  { value: "christmas", label: "Christmas" },
  { value: "valentines_day", label: "Valentine's Day" },
  { value: "thanksgiving", label: "Thanksgiving" },
  { value: "easter", label: "Easter" },
  { value: "independence_day", label: "Independence Day" },
  { value: "april_fools", label: "April Fools" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "misc", label: "General / Mixed" },
];

export default function AffiliateSignup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyAffiliate, setAlreadyAffiliate] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    platform: "",
    follower_count: "",
    content_category: "",
    shipping_name: "",
    shipping_street: "",
    shipping_street2: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_country: "US",
  });
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (me) {
        setForm(f => ({ ...f, full_name: me.full_name || "", email: me.email || "" }));
        // Check if already an affiliate
        if (me.business_roles?.includes("affiliate")) {
          setAlreadyAffiliate(true);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content_category) {
      toast({ title: "Please select a content category", variant: "destructive" });
      return;
    }
    if (!form.shipping_name || !form.shipping_street || !form.shipping_city || !form.shipping_state || !form.shipping_zip || !form.shipping_country) {
      toast({ title: "Please fill in your complete shipping address", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      // Generate affiliate ID from user ID (short, URL-safe)
      const affiliateId = `aff_${currentUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`;

      // Create affiliate record
      await base44.entities.Affiliate.create({
        user_id: currentUser.id,
        affiliate_id: affiliateId,
        full_name: form.full_name,
        email: form.email,
        platform: form.platform,
        follower_count: parseInt(form.follower_count) || 0,
        content_category: form.content_category,
        shipping_address: {
          name: form.shipping_name,
          street: form.shipping_street,
          street2: form.shipping_street2,
          city: form.shipping_city,
          state: form.shipping_state,
          zip: form.shipping_zip,
          country: form.shipping_country,
        },
        free_sample_claimed: false,
        total_clicks: 0,
        total_orders: 0,
        total_earnings: 0,
        status: "active",
      });

      // Add affiliate role to user
      const currentRoles = currentUser.business_roles || [];
      if (!currentRoles.includes("affiliate")) {
        await base44.auth.updateMe({
          business_roles: [...currentRoles, "affiliate"],
          affiliate_id: affiliateId,
        });
      }

      toast({ title: "Welcome to the affiliate program! 🎉" });
      // Redirect to dashboard affiliate tab
      window.location.href = "/ConsumerDashboard?tab=affiliate";
    } catch (error) {
      toast({ title: "Failed to submit application", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  if (alreadyAffiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">You're already an affiliate!</h2>
          <p className="text-gray-600 mb-6">Head to your dashboard to view your affiliate hub.</p>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => window.location.href = "/ConsumerDashboard?tab=affiliate"}>
            Go to Affiliate Hub
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join the EX3D Prints Affiliate Program</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Earn 20% commission on every order you refer. Share unique links, get a free product, and track your earnings in real time.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: TrendingUp, title: "20% Commission", desc: "Earn 20% of every sale you refer, paid from the platform's share." },
            { icon: Gift, title: "Free Product", desc: "Pick any product from our catalog and receive it for free — on us." },
            { icon: Link, title: "Custom Links", desc: "Get unique affiliate URLs for every product to share with your audience." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="text-center p-6">
              <Icon className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">{desc}</p>
            </Card>
          ))}
        </div>

        {/* Application Form */}
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Affiliate Application
            </CardTitle>
            <p className="text-sm text-gray-500">Instant approval — no waiting required.</p>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Please sign in to apply for the affiliate program.</p>
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
                  Sign In to Apply
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="platform">Platform / Channel *</Label>
                  <Input
                    id="platform"
                    placeholder="e.g. YouTube, Instagram, TikTok, Blog..."
                    value={form.platform}
                    onChange={e => setForm({ ...form, platform: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="follower_count">Follower / Subscriber Count *</Label>
                  <Input
                    id="follower_count"
                    type="number"
                    min="0"
                    placeholder="e.g. 10000"
                    value={form.follower_count}
                    onChange={e => setForm({ ...form, follower_count: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Content Category *</Label>
                  <p className="text-xs text-gray-500 mb-2">This determines which products surface first in your dashboard.</p>
                  <Select value={form.content_category} onValueChange={v => setForm({ ...form, content_category: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your content focus..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shipping Address */}
                <div className="pt-2 border-t">
                  <h3 className="font-semibold text-gray-800 mb-1">Shipping Address *</h3>
                  <p className="text-xs text-gray-500 mb-3">Required for delivery of your complimentary product.</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="shipping_name">Full Name *</Label>
                      <Input id="shipping_name" value={form.shipping_name} onChange={e => setForm({ ...form, shipping_name: e.target.value })} placeholder="Jane Smith" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="shipping_street">Street Address *</Label>
                      <Input id="shipping_street" value={form.shipping_street} onChange={e => setForm({ ...form, shipping_street: e.target.value })} placeholder="123 Main St" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="shipping_street2">Apt / Suite (optional)</Label>
                      <Input id="shipping_street2" value={form.shipping_street2} onChange={e => setForm({ ...form, shipping_street2: e.target.value })} placeholder="Apt 4B" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="shipping_city">City *</Label>
                        <Input id="shipping_city" value={form.shipping_city} onChange={e => setForm({ ...form, shipping_city: e.target.value })} placeholder="New York" required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="shipping_state">State *</Label>
                        <Input id="shipping_state" value={form.shipping_state} onChange={e => setForm({ ...form, shipping_state: e.target.value })} placeholder="NY" required className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="shipping_zip">ZIP Code *</Label>
                        <Input id="shipping_zip" value={form.shipping_zip} onChange={e => setForm({ ...form, shipping_zip: e.target.value })} placeholder="10001" required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="shipping_country">Country *</Label>
                        <Input id="shipping_country" value={form.shipping_country} onChange={e => setForm({ ...form, shipping_country: e.target.value })} placeholder="US" required className="mt-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                  ) : (
                    "Join Affiliate Program →"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}