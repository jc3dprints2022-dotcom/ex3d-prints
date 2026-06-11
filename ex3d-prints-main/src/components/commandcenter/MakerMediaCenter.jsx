import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Video, Image,
  Loader2, DollarSign, Film, Download, Eye
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CLIP_LABELS = {
  timelapse_print: "Timelapse Print",
  bed_removal: "Bed Removal",
  packaging: "Packaging",
  final_product_shot: "Final Product Shot",
  other: "Other",
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "bg-yellow-500 text-white" },
  approved: { label: "Approved", color: "bg-green-600 text-white" },
  rejected: { label: "Rejected", color: "bg-red-600 text-white" },
  flagged:  { label: "Flagged",  color: "bg-orange-500 text-white" },
};

function MediaPreview({ item }) {
  if (item.file_type === "video") {
    return (
      <video
        src={item.file_url}
        controls
        className="w-full rounded-lg max-h-64 bg-black"
      />
    );
  }
  return (
    <img
      src={item.file_url}
      alt={item.file_name}
      className="w-full rounded-lg max-h-64 object-contain bg-gray-100"
    />
  );
}

function MediaInbox({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const { toast } = useToast();

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.MakerContent.list("-created_date", 500);
      setItems(all);
    } catch (e) {
      toast({ title: "Failed to load content", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleAction = async (action) => {
    if (!selected) return;
    setProcessing(true);
    try {
      const updateData = {
        status: action,
        admin_notes: adminNotes,
      };

      if (action === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.payout_status = "pending";
      }

      await base44.entities.MakerContent.update(selected.id, updateData);

      // Send email notification to maker
      const subject = action === "approved"
        ? `✅ Your content was approved — EX3D Prints`
        : action === "rejected"
          ? `Your content submission — EX3D Prints`
          : `Your content has been flagged — EX3D Prints`;

      const body = action === "approved"
        ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#16a34a;">Content Approved!</h2>
<p>Hi ${selected.maker_name},</p>
<p>Your clip "<strong>${CLIP_LABELS[selected.clip_category] || selected.clip_category}</strong>" has been approved.</p>
<p><strong>$0.25 has been added to your maker payout balance.</strong></p>
${adminNotes ? `<p><em>Note from our team: ${adminNotes}</em></p>` : ""}
<p>Keep uploading! Every approved clip earns you more.</p>
<p>— The EX3D Team</p>
</div>`
        : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#dc2626;">Content Update</h2>
<p>Hi ${selected.maker_name},</p>
<p>Your clip "<strong>${CLIP_LABELS[selected.clip_category] || selected.clip_category}</strong>" was ${action}.</p>
${adminNotes ? `<p><strong>Reason:</strong> ${adminNotes}</p>` : ""}
<p>Questions? Reply to this email.</p>
<p>— The EX3D Team</p>
</div>`;

      await base44.functions.invoke("sendEmail", {
        to: selected.maker_email,
        subject,
        body,
      }).catch(() => {});

      toast({ title: `Clip ${action}`, description: action === "approved" ? "$0.25 payout queued" : "" });
      setSelected(null);
      setAdminNotes("");
      await loadItems();
      if (onRefresh) onRefresh();
    } catch (e) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const filtered = items.filter(i => statusFilter === "all" || i.status === statusFilter);
  const counts = {
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
    flagged: items.filter(i => i.status === "flagged").length,
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="text-cyan-400" onClick={() => { setSelected(null); setAdminNotes(""); }}>
          ← Back to Inbox
        </Button>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-4">
              <MediaPreview item={selected} />
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300"
                  onClick={async () => {
                    try {
                      const response = await fetch(selected.file_url);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selected.file_name || `content_${selected.id}.${selected.file_type === 'video' ? 'mp4' : 'jpg'}`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
                    } catch { window.open(selected.file_url, "_blank"); }
                  }}>
                  <Download className="w-3 h-3 mr-1" /> Download Original
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="text-white font-bold text-base">{selected.maker_name}</p>
                <p className="text-slate-400">{selected.maker_email}</p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Clip type:</span> {CLIP_LABELS[selected.clip_category]}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">File:</span> {selected.file_name || selected.file_type}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Submitted:</span> {new Date(selected.created_date).toLocaleString()}
                </p>
                {selected.order_id && (
                  <p className="text-slate-300"><span className="text-slate-500">Order:</span> {selected.order_id}</p>
                )}
                {selected.notes && (
                  <p className="text-slate-300"><span className="text-slate-500">Maker notes:</span> {selected.notes}</p>
                )}
                <Badge className={STATUS_CONFIG[selected.status]?.color || "bg-gray-600 text-white"}>
                  {STATUS_CONFIG[selected.status]?.label}
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-4 space-y-3">
                <p className="text-slate-300 text-sm font-medium">Admin Notes (sent to maker)</p>
                <Textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Optional feedback for the maker..."
                  rows={3}
                  className="bg-slate-800 border-slate-600 text-white placeholder-gray-500 text-sm"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm" disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("approved")}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Approve (+$0.25)</>}
                  </Button>
                  <Button
                    size="sm" disabled={processing}
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => handleAction("flagged")}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" /> Flag
                  </Button>
                  <Button
                    size="sm" disabled={processing}
                    variant="destructive"
                    onClick={() => handleAction("rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: items.length },
          { key: "pending", label: "Pending", count: counts.pending },
          { key: "approved", label: "Approved", count: counts.approved },
          { key: "rejected", label: "Rejected", count: counts.rejected },
          { key: "flagged", label: "Flagged", count: counts.flagged },
        ].map(f => (
          <Button key={f.key} size="sm"
            className={statusFilter === f.key ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}
            onClick={() => setStatusFilter(f.key)}>
            {f.label} {f.count > 0 && <Badge className="ml-1 bg-white/20 text-white text-xs px-1">{f.count}</Badge>}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-12 text-center text-slate-500">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No content in this category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <Card key={item.id}
              className="bg-slate-900 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
              onClick={() => setSelected(item)}>
              <CardContent className="p-0 overflow-hidden rounded-xl">
                {/* Thumbnail */}
                <div className="w-full aspect-video bg-slate-800 flex items-center justify-center relative">
                  {item.file_type === "video" ? (
                    <div className="flex flex-col items-center">
                      <Video className="w-10 h-10 text-slate-400" />
                      <span className="text-xs text-slate-500 mt-1">Video</span>
                    </div>
                  ) : (
                    <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <Badge className={`absolute top-2 right-2 text-xs ${STATUS_CONFIG[item.status]?.color || "bg-gray-600 text-white"}`}>
                    {STATUS_CONFIG[item.status]?.label}
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="text-white text-sm font-medium truncate">{item.maker_name}</p>
                  <p className="text-slate-400 text-xs">{CLIP_LABELS[item.clip_category]}</p>
                  <p className="text-slate-500 text-xs">{new Date(item.created_date).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutLedger() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const approved = await base44.entities.MakerContent.filter({ status: "approved" }, "-approved_at", 500);
      setItems(approved);
    } catch (e) {
      toast({ title: "Failed to load ledger", variant: "destructive" });
    }
    setLoading(false);
  };

  const totalOwed = items.filter(i => i.payout_status === "pending").reduce((s, i) => s + (i.payout_amount || 0.25), 0);
  const totalPaid = items.filter(i => i.payout_status === "paid").reduce((s, i) => s + (i.payout_amount || 0.25), 0);

  // Group by maker
  const byMaker = {};
  items.forEach(item => {
    if (!byMaker[item.maker_id]) {
      byMaker[item.maker_id] = { name: item.maker_name, email: item.maker_email, items: [] };
    }
    byMaker[item.maker_id].items.push(item);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">${totalOwed.toFixed(2)}</p>
            <p className="text-slate-400 text-xs mt-1">Pending Payouts</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">${totalPaid.toFixed(2)}</p>
            <p className="text-slate-400 text-xs mt-1">Total Paid Out</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{items.length}</p>
            <p className="text-slate-400 text-xs mt-1">Approved Clips</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{Object.keys(byMaker).length}</p>
            <p className="text-slate-400 text-xs mt-1">Contributing Makers</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
      ) : Object.keys(byMaker).length === 0 ? (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center text-slate-500">No approved content yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(byMaker).map(([makerId, data]) => {
            const pending = data.items.filter(i => i.payout_status === "pending").reduce((s, i) => s + (i.payout_amount || 0.25), 0);
            const paid = data.items.filter(i => i.payout_status === "paid").reduce((s, i) => s + (i.payout_amount || 0.25), 0);
            return (
              <Card key={makerId} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold">{data.name}</p>
                      <p className="text-slate-400 text-xs">{data.email}</p>
                      <p className="text-slate-500 text-xs mt-1">{data.items.length} approved clip{data.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      {pending > 0 && <p className="text-green-400 font-bold">${pending.toFixed(2)} owed</p>}
                      {paid > 0 && <p className="text-slate-400 text-sm">${paid.toFixed(2)} paid</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApprovedGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const approved = await base44.entities.MakerContent.filter({ status: "approved" }, "-approved_at", 500);
      setItems(approved);
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">All approved maker content — available for marketing, ads, and social media use.</p>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
      ) : items.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-8 text-center text-slate-500">No approved content yet.</CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer"
              onClick={() => setSelected(item)}>
              <div className="aspect-video bg-slate-800 flex items-center justify-center">
                {item.file_type === "video"
                  ? <Video className="w-8 h-8 text-slate-400" />
                  : <img src={item.file_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{item.maker_name}</p>
                <p className="text-slate-500 text-xs">{CLIP_LABELS[item.clip_category]}</p>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-slate-900 rounded-xl p-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-white font-semibold">{selected.maker_name}</p>
                <p className="text-slate-400 text-sm">{CLIP_LABELS[selected.clip_category]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <MediaPreview item={selected} />
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={async () => {
                try {
                  const response = await fetch(selected.file_url);
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selected.file_name || `content_${selected.id}.${selected.file_type === 'video' ? 'mp4' : 'jpg'}`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
                } catch { window.open(selected.file_url, "_blank"); }
              }} className="bg-cyan-600 hover:bg-cyan-700">
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MakerMediaCenter() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Film className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-bold text-white">Maker Media Center</h2>
      </div>
      <Tabs defaultValue="inbox">
        <TabsList className="bg-slate-900 border-slate-700">
          {[
            { value: "inbox", label: "📥 Media Inbox" },
            { value: "ledger", label: "💰 Payout Ledger" },
            { value: "gallery", label: "🖼️ Approved Gallery" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="inbox">
          <MediaInbox onRefresh={() => setRefreshKey(k => k + 1)} />
        </TabsContent>
        <TabsContent value="ledger">
          <PayoutLedger key={refreshKey} />
        </TabsContent>
        <TabsContent value="gallery">
          <ApprovedGallery key={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}