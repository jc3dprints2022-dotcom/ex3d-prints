import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Plus, ToggleLeft, ToggleRight, Mail } from "lucide-react";

const DEFAULT_TEMPLATES = [
  {
    key: "order_assigned_maker",
    name: "Order Assigned to Maker",
    trigger: "When an order's maker_id is set or changed",
    subject: "New Order Assigned to You — Order #{{order_id}}",
    body: "<p>Hi {{maker_name}},</p>\n<p>Order <strong>#{{order_id}}</strong> has been assigned to you.</p>\n<p><strong>Ship to:</strong> {{customer_name}}, {{shipping_address}}</p>\n<p><strong>Items:</strong> {{item_list}}</p>\n<p><strong>Your earnings:</strong> ${{maker_earnings}}</p>\n<p>Please accept or reject from your <a href=\"https://jc3dprints.base44.app/ConsumerDashboard\">Maker Dashboard</a> within 24 hours.</p>",
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
];

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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