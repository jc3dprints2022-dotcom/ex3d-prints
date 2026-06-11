import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, ToggleLeft, ToggleRight, Mail, Send } from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    key: "order_assigned_maker",
    name: "Order Assigned to Maker",
    trigger: "When an order's maker_id is set or changed",
    subject: "New Order Assigned to You — Order #{{order_id}}",
    body: "<p>Hi {{maker_name}},</p>\n<p>Order <strong>#{{order_id}}</strong> has been assigned to you.</p>\n<p><strong>Ship to:</strong> {{customer_name}}, {{shipping_address}}</p>\n<p><strong>Items:</strong> {{item_list}}</p>\n<p><strong>Your earnings:</strong> ${{maker_earnings}}</p>\n<p>Please accept or reject from your <a href=\"https://ex3dprints.com/ConsumerDashboard\">Maker Dashboard</a> within 24 hours.</p>",
    variables: ["order_id", "maker_name", "customer_name", "shipping_address", "item_list", "maker_earnings"],
    enabled: true,
  },
  {
    key: "order_shipped_customer",
    name: "Order Shipped — Customer",
    trigger: "When an order is marked as shipped",
    subject: "Your Order Has Shipped! — EX3D Prints #{{order_id}}",
    body: "<p>Hi {{customer_name}},</p>\n<p>Great news — your order <strong>#{{order_id}}</strong> is on its way!</p>\n<p><strong>Tracking Number:</strong> {{tracking_number}}</p>\n<p>Estimated delivery: {{estimated_days}} business days.</p>\n<p>Thank you for choosing EX3D Prints!</p>",
    variables: ["order_id", "customer_name", "tracking_number", "estimated_days"],
    enabled: true,
  },
  {
    key: "new_order_admin",
    name: "New Order — Admin Alert",
    trigger: "When any new order is placed",
    subject: "🛒 New Order — #{{order_id}} (${{total_amount}})",
    body: "<p>New order received!</p>\n<p><strong>Order:</strong> #{{order_id}}</p>\n<p><strong>Customer:</strong> {{customer_name}} ({{customer_email}})</p>\n<p><strong>Total:</strong> ${{total_amount}}</p>\n<p><strong>Items:</strong> {{item_list}}</p>",
    variables: ["order_id", "customer_name", "customer_email", "total_amount", "item_list"],
    enabled: true,
  },
  {
    key: "designer_royalty_paid",
    name: "Designer Royalty Payment",
    trigger: "When monthly royalties are paid to designer",
    subject: "💸 Designer Royalties Paid — ${{amount}}",
    body: "<p>Hi {{designer_name}},</p>\n<p>We've transferred <strong>${{amount}}</strong> in royalties to your Stripe account for {{order_count}} orders this period.</p>\n<p>Funds typically arrive in 2–3 business days.</p>",
    variables: ["designer_name", "amount", "order_count"],
    enabled: true,
  },
  {
    key: "maker_payout_sent",
    name: "Maker Payout Sent",
    trigger: "When monthly maker payouts are sent",
    subject: "💸 Maker Payout Sent — ${{amount}}",
    body: "<p>Hi {{maker_name}},</p>\n<p>We've transferred <strong>${{amount}}</strong> for {{order_count}} completed orders this period.</p>\n<p>Funds typically arrive in 2–3 business days.</p>",
    variables: ["maker_name", "amount", "order_count"],
    enabled: true,
  },
  {
    key: "heavylift_promo",
    name: "Heavy Lift Collection Promo",
    trigger: "One-time promotional blast to non-maker, non-designer users",
    subject: "The Largest Rocket Ever Built — Ready to Add to Your Collection",
    body: `<div style="font-family:Arial,sans-serif;background:#0a0a12;color:#e2e8f0;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:36px 24px;">

  <div style="text-align:center;margin-bottom:32px;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png" alt="EX3D Prints" style="height:48px;width:auto;" />
  </div>

  <h1 style="color:#f97316;font-size:26px;font-weight:900;margin:0 0 8px;line-height:1.2;">The Largest Rocket Ever Built.</h1>
  <h2 style="color:#fbbf24;font-size:18px;font-weight:700;margin:0 0 20px;">Ready to Add to Your Collection.</h2>

  <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px;">Hey {{first_name}},</p>

  <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px;">Starship is unlike anything that has ever flown. At <strong style="color:#f1f5f9;">121 meters tall</strong> and producing over <strong style="color:#f1f5f9;">16 million pounds of thrust</strong>, it is the most powerful launch vehicle ever successfully tested. It is fully reusable, and designed to reach orbit, the Moon, and Mars.</p>

  <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 28px;">We think it deserves a place on your shelf.</p>

  <div style="background:#1e293b;border:1px solid #f97316;border-radius:12px;padding:24px;margin:0 0 28px;">
    <h3 style="color:#f97316;font-size:16px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">THE HEAVY-LIFT SHELF BUNDLE</h3>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 14px;">For collectors who want the full story of human spaceflight, we put together the Heavy-Lift Shelf — three rockets, three eras, one bundle:</p>
    <p style="color:#e2e8f0;font-size:14px;margin:0 0 6px;">🚀 <strong>Saturn V</strong> — Apollo's workhorse. The rocket that got us to the Moon.</p>
    <p style="color:#e2e8f0;font-size:14px;margin:0 0 6px;">🚀 <strong>SLS Block 1</strong> — NASA's Artemis rocket, returning humanity to deep space.</p>
    <p style="color:#e2e8f0;font-size:14px;margin:0 0 16px;">🚀 <strong>Starship V2</strong> — The next generation. Bigger, bolder, fully reusable.</p>
    <p style="color:#fbbf24;font-size:15px;font-weight:700;margin:0;">Bundle all three and <span style="color:#4ade80;">save $14</span> off individual pricing.</p>
  </div>

  <div style="background:#0f172a;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:20px 24px;margin:0 0 28px;">
    <h3 style="color:#f1f5f9;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">ABOUT THE STARSHIP V2 MODEL</h3>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Our Starship V2 is one of the most detailed 3D printed rocket models available:</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Full hexagonal heat shield tile texture across the nose cone</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Accurate body panel segmentation and weld line detailing</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Flap geometry modeled to match the real vehicle</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Port and hatch details throughout the fuselage</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Includes a custom STARSHIP nameplate display stand</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0 0 4px;">• Printed in premium materials by verified makers in our network</p>
    <p style="color:#cbd5e1;font-size:13px;margin:0;">• Fast local production</p>
  </div>

  <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 28px;">If you've already got one of the three, now's the time to complete the set. If you haven't started your collection yet — there's never been a better moment.</p>

  <div style="text-align:center;margin:0 0 32px;">
    <a href="https://ex3dprints.com/HeavyLiftCollection" style="display:inline-block;background:linear-gradient(90deg,#f97316,#fbbf24);color:#000;font-weight:900;font-size:16px;padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
      👉 BUILD YOUR HEAVY-LIFT COLLECTION AT $14 OFF
    </a>
  </div>

  <hr style="border:none;border-top:1px solid #1e293b;margin:0 0 24px;" />

  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Thanks for being part of the EX3D community.<br />Clear skies,<br /><strong style="color:#e2e8f0;">EX3D Prints Team</strong></p>

  <p style="color:#475569;font-size:11px;margin:24px 0 0;text-align:center;">© 2025 EX3D Prints · <a href="https://ex3dprints.com/Privacy" style="color:#475569;">Privacy Policy</a></p>
</div>
</div>`,
    variables: ["first_name"],
    enabled: true,
  },
];

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingKey, setSendingKey] = useState(null);
  const { toast } = useToast();

  // Map template keys to their corresponding backend functions
  const TEMPLATE_FUNCTION_MAP = {
    order_assigned_maker: null, // event-driven, no manual trigger
    order_shipped_customer: null,
    new_order_admin: null,
    designer_royalty_paid: "processMonthlyPayouts",
    maker_payout_sent: "processMonthlyPayouts",
    heavylift_promo: "sendHeavyLiftPromo",
  };

  const handleSendNow = async (template) => {
    const fn = TEMPLATE_FUNCTION_MAP[template.key];
    if (!fn) {
      toast({ title: "No manual trigger available", description: "This email is sent automatically when its event fires.", variant: "destructive" });
      return;
    }
    if (!confirm(`Send the "${template.name}" email now to all eligible recipients?`)) return;
    setSendingKey(template.key);
    try {
      const res = await base44.functions.invoke(fn, {});
      const sent = res?.data?.emails_sent ?? res?.data?.count ?? "?";
      toast({ title: "Emails sent!", description: `${sent} emails dispatched via "${template.name}".` });
    } catch (err) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
    setSendingKey(null);
  };

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const stored = await base44.entities.EmailNotificationTemplate.list();
      // Merge defaults with stored — stored overrides by key
      const storedMap = {};
      stored.forEach(t => storedMap[t.key] = t);

      const merged = DEFAULT_TEMPLATES.map(def => storedMap[def.key] || def);
      setTemplates(merged);
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    }
    setLoading(false);
  };

  const handleSave = async (template) => {
    setSaving(true);
    try {
      const existing = await base44.entities.EmailNotificationTemplate.filter({ key: template.key });
      if (existing.length > 0) {
        await base44.entities.EmailNotificationTemplate.update(existing[0].id, template);
      } else {
        await base44.entities.EmailNotificationTemplate.create(template);
      }
      toast({ title: "Template saved!" });
      setEditing(null);
      await loadTemplates();
    } catch (error) {
      toast({ title: "Failed to save template", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleToggleEnabled = async (template) => {
    const updated = { ...template, enabled: !template.enabled };
    await handleSave(updated);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  if (editing) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            Edit: {editing.name}
          </CardTitle>
          <p className="text-slate-400 text-sm mt-1">Trigger: {editing.trigger}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300">Subject</Label>
            <Input
              value={editing.subject}
              onChange={e => setEditing({ ...editing, subject: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-slate-300">Body (HTML)</Label>
            <Textarea
              value={editing.body}
              onChange={e => setEditing({ ...editing, body: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white font-mono text-sm mt-1"
              rows={14}
            />
          </div>
          {editing.variables?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs mb-2">Available variables (use as {"{{variable_name}}"}):</p>
              <div className="flex flex-wrap gap-2">
                {editing.variables.map(v => (
                  <Badge key={v} variant="outline" className="text-cyan-300 border-cyan-700 font-mono text-xs">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => handleSave(editing)} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Template
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Email Notification Templates</h2>
          <p className="text-slate-400 text-sm mt-1">Edit the content of automated emails sent by the system.</p>
        </div>
      </div>

      {templates.map(template => (
        <Card key={template.key} className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white">{template.name}</p>
                  <Badge className={template.enabled !== false ? "bg-green-700 text-white" : "bg-gray-600 text-white"}>
                    {template.enabled !== false ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mb-2">Trigger: {template.trigger}</p>
                <p className="text-slate-300 text-sm truncate">Subject: {template.subject}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleEnabled(template)}
                  className="border-slate-600 text-slate-300"
                >
                  {template.enabled !== false
                    ? <ToggleRight className="w-4 h-4 text-green-400" />
                    : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                </Button>
                {TEMPLATE_FUNCTION_MAP[template.key] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendNow(template)}
                    disabled={sendingKey === template.key}
                    className="border-blue-600 text-blue-300 hover:bg-blue-900/40"
                  >
                    {sendingKey === template.key
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ ...template })}
                  className="border-cyan-600 text-cyan-300"
                >
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}