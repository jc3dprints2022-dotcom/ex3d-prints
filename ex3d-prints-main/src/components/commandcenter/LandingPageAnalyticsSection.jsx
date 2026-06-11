import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Each landing page with its unique PAGE_SOURCE key and actual URL
const LANDING_PAGES = [
  {
    key: "moonmission_landing",
    label: "Moon Missions Collection",
    path: "/MoonMissionsCollection",
    color: "orange",
    description: "Saturn V + SLS bundle — dedicated landing page",
  },
  {
    key: "rocketcollection_landing",
    label: "Rocket Collection",
    path: "/rocketcollection",
    color: "yellow",
    description: "Original Moon Missions landing page",
  },
  {
    key: "heavylift_landing",
    label: "Heavy Lift Collection",
    path: "/HeavyLiftCollection",
    color: "amber",
    description: "Saturn V + SLS + Starship 3-rocket bundle",
  },
  {
    key: "saturnv_landing",
    label: "SaturnV / Heavy Lift",
    path: "/SaturnV",
    color: "red",
    description: "Original heavy lift landing page",
  },
  {
    key: "starship_landing",
    label: "Starship",
    path: "/Starship",
    color: "cyan",
    description: "Starship V2 standalone — main page",
  },
  {
    key: "starshiplaunch_landing",
    label: "Starship Launch",
    path: "/StarshipLaunch",
    color: "blue",
    description: "Starship V2 dedicated launch page",
  },
];

const COLOR_MAP = {
  orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  yellow: { border: "border-yellow-500/30", bg: "bg-yellow-500/10", text: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300" },
  amber:  { border: "border-amber-500/30",  bg: "bg-amber-500/10",  text: "text-amber-400",  badge: "bg-amber-500/20 text-amber-300" },
  red:    { border: "border-red-500/30",    bg: "bg-red-500/10",    text: "text-red-400",    badge: "bg-red-500/20 text-red-300" },
  cyan:   { border: "border-cyan-500/30",   bg: "bg-cyan-500/10",   text: "text-cyan-400",   badge: "bg-cyan-500/20 text-cyan-300" },
  blue:   { border: "border-blue-500/30",   bg: "bg-blue-500/10",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-300" },
};

const DATE_FILTERS = [
  { value: "all",  label: "All time" },
  { value: "30d",  label: "Last 30 days" },
  { value: "7d",   label: "Last 7 days" },
];

function getCutoff(range) {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
  return d;
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(decimals);
}

function fmtMoney(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LandingPageAnalyticsSection() {
  const [events, setEvents]       = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dateRange, setDateRange] = useState("all");

  const load = async () => {
    setLoading(true);
    const [evts, ords] = await Promise.all([
      base44.entities.PageEvent.filter({}).catch(() => []),
      base44.entities.Order.filter({}).catch(() => []),
    ]);
    setEvents(evts);
    setOrders(ords);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cutoff = getCutoff(dateRange);
  const inRange = (item) => {
    if (!cutoff) return true;
    const d = new Date(item.created_date || item.timestamp);
    return d >= cutoff;
  };

  const stats = LANDING_PAGES.map(page => {
    const pageEvents = events.filter(e => e.source === page.key && inRange(e));
    const views      = pageEvents.filter(e => e.event === "page_view").length;
    const atc        = pageEvents.filter(e => e.event === "add_to_cart").length;
    const emailSubs  = pageEvents.filter(e => e.event === "email_signup").length;
    const pageOrders = orders.filter(o => {
      if (!inRange(o)) return false;
      // Match by landing_page_source field, OR by Cart item source, OR notes
      return o.landing_page_source === page.key ||
             (o.notes || "").includes(page.key);
    });
    const purchases  = pageOrders.length;
    const revenue    = pageOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const convRate   = views > 0 ? (purchases / views) * 100 : 0;
    const atcRate    = views > 0 ? (atc / views) * 100 : 0;
    const rpv        = views > 0 ? revenue / views : 0;
    return { ...page, views, atc, emailSubs, purchases, revenue, convRate, atcRate, rpv, hasData: pageEvents.length > 0 };
  });

  const totalViews     = stats.reduce((s, p) => s + p.views, 0);
  const totalAtc       = stats.reduce((s, p) => s + p.atc, 0);
  const totalPurchases = stats.reduce((s, p) => s + p.purchases, 0);
  const totalRevenue   = stats.reduce((s, p) => s + p.revenue, 0);
  const totalEmails    = stats.reduce((s, p) => s + p.emailSubs, 0);
  const overallConv    = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Landing Page Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">Individual performance for each of the 6 rocket landing pages</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {DATE_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value} className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={load} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <Card className="bg-slate-900 border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Overall Summary — All 6 Pages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Visits",      value: totalViews.toLocaleString() },
                { label: "Add-to-Carts",      value: totalAtc.toLocaleString() },
                { label: "Email Signups",     value: totalEmails.toLocaleString() },
                { label: "Total Purchases",   value: totalPurchases.toLocaleString() },
                { label: "Total Revenue",     value: fmtMoney(totalRevenue) },
                { label: "Overall Conv. %",   value: fmt(overallConv, 2) + "%" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Individual Page Cards — 2 columns on md+, 1 on mobile */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stats.map(page => {
              const c = COLOR_MAP[page.color];
              return (
                <Card key={page.key} className={`bg-slate-900 border ${c.border} p-6 flex flex-col gap-4`}>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] tracking-widest uppercase font-bold ${c.text}`}>{page.key}</span>
                      <h3 className="text-lg font-black text-white mt-0.5">{page.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{page.description}</p>
                    </div>
                    <a
                      href={page.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${c.badge} hover:opacity-80 transition-opacity flex-shrink-0`}
                    >
                      {page.path.replace("/", "")} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Page Views",    value: page.views.toLocaleString() },
                      { label: "Add-to-Carts",  value: page.atc.toLocaleString() },
                      { label: "ATC Rate",      value: fmt(page.atcRate, 1) + "%" },
                      { label: "Email Signups", value: page.emailSubs.toLocaleString() },
                      { label: "Purchases",     value: page.purchases.toLocaleString() },
                      { label: "Revenue",       value: fmtMoney(page.revenue) },
                      { label: "Conv. Rate",    value: fmt(page.convRate, 2) + "%" },
                      { label: "Rev / Visitor", value: fmtMoney(page.rpv) },
                    ].map(({ label, value }) => (
                      <div key={label} className={`${c.bg} rounded-lg p-3`}>
                        <p className={`text-lg font-black ${c.text}`}>{value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* No-data notice */}
                  {!page.hasData && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-700/50 pt-3">
                      No PageEvent records yet. Events will appear here once visitors land on this page.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Tracking source key reference */}
          <Card className="bg-slate-900 border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Page Source Key Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {LANDING_PAGES.map(p => (
                <div key={p.key} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                  <span className="font-mono text-slate-300">{p.key}</span>
                  <span className="text-slate-500">→</span>
                  <a href={p.path} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white underline">{p.path}</a>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}