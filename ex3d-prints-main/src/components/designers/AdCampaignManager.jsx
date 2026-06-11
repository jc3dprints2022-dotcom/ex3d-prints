import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Megaphone, Play, Pause, TrendingUp, MousePointer, Eye, ShoppingCart, Zap
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * AdCampaignManager — lets designers manage their 1 active ad listing (free plan).
 * Props: user (with designer_id), products (their active products)
 */
export default function AdCampaignManager({ user, products }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState("");
  const { toast } = useToast();

  const FREE_PLAN_AD_LIMIT = 1;

  useEffect(() => {
    if (user?.designer_id) loadCampaigns();
  }, [user]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AdCampaign.filter({ designer_id: user.designer_id });
      setCampaigns(all);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    }
    setLoading(false);
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const canActivateMore = activeCampaigns.length < FREE_PLAN_AD_LIMIT;

  const handleCreateCampaign = async () => {
    if (!selectedListingId) {
      toast({ title: "Please select a listing", variant: "destructive" });
      return;
    }
    const product = products.find(p => p.id === selectedListingId);
    if (!product) return;

    setActivatingId(selectedListingId);
    try {
      // Pause any existing active campaigns first (free plan limit)
      for (const c of activeCampaigns) {
        await base44.entities.AdCampaign.update(c.id, { status: "paused" });
      }

      // Check if a campaign already exists for this listing
      const existing = campaigns.find(c => c.listing_id === selectedListingId);
      if (existing) {
        await base44.entities.AdCampaign.update(existing.id, { status: "active" });
      } else {
        // Create new campaign
        const newCampaign = await base44.entities.AdCampaign.create({
          designer_id: user.designer_id,
          designer_user_id: user.id,
          listing_id: product.id,
          listing_name: product.name,
          status: "active",
          ad_generation_status: "pending",
          landing_page_url: `${window.location.origin}/ProductDetail?id=${product.id}&utm_source=ad&utm_medium=campaign&utm_campaign=${product.id}`,
          total_impressions: 0,
          total_clicks: 0,
          total_conversions: 0,
          ctr: 0,
        });

        // Fire-and-forget: trigger external ad generation webhook (non-blocking)
        triggerAdGeneration(newCampaign.id, product).catch(e =>
          console.warn("Ad generation webhook failed (non-critical):", e.message)
        );
      }

      toast({
        title: "Ad Campaign Activated! 🚀",
        description: `"${product.name}" is now your promoted listing.`,
      });
      await loadCampaigns();
      setSelectedListingId("");
    } catch (err) {
      toast({ title: "Failed to activate campaign", description: err.message, variant: "destructive" });
    }
    setActivatingId(null);
  };

  const triggerAdGeneration = async (campaignId, product) => {
    // Update status to generating
    await base44.entities.AdCampaign.update(campaignId, { ad_generation_status: "generating" });

    // Use LLM to generate ad copies (fallback if no external ads engine configured)
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 3 short, compelling ad copy variants for this 3D printed product listing. 
Product: ${product.name}
Description: ${product.description}
Price: $${product.price}
Category: ${product.category}

Return JSON with keys: ad_copies (array of 3 strings, each under 100 chars), hooks (array of 3 attention-grabbing opening hooks).`,
      response_json_schema: {
        type: "object",
        properties: {
          ad_copies: { type: "array", items: { type: "string" } },
          hooks: { type: "array", items: { type: "string" } },
        }
      }
    });

    await base44.entities.AdCampaign.update(campaignId, {
      ad_copies: result.ad_copies || [],
      hooks: result.hooks || [],
      ad_generation_status: "ready",
    });
  };

  const handlePauseCampaign = async (campaign) => {
    try {
      await base44.entities.AdCampaign.update(campaign.id, { status: "paused" });
      toast({ title: "Campaign paused" });
      await loadCampaigns();
    } catch {
      toast({ title: "Failed to pause", variant: "destructive" });
    }
  };

  const handleResumeCampaign = async (campaign) => {
    if (!canActivateMore) {
      toast({ title: "Free plan limit: pause the current active campaign first.", variant: "destructive" });
      return;
    }
    try {
      await base44.entities.AdCampaign.update(campaign.id, { status: "active" });
      toast({ title: "Campaign resumed" });
      await loadCampaigns();
    } catch {
      toast({ title: "Failed to resume", variant: "destructive" });
    }
  };

  const activeProducts = products.filter(p => p.status === "active");
  const alreadyCampaignListingIds = campaigns.map(c => c.listing_id);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Create / activate a campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-blue-600" />
            Promote a Listing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Select one of your active listings to promote. Switching will automatically pause the current promoted listing.
          </p>
          <div className="flex gap-3">
            <Select value={selectedListingId} onValueChange={setSelectedListingId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a listing to promote…" />
              </SelectTrigger>
              <SelectContent>
                {activeProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${p.price}
                    {alreadyCampaignListingIds.includes(p.id) ? " (has campaign)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreateCampaign}
              disabled={!selectedListingId || activatingId === selectedListingId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {activatingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
              Activate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No campaigns yet. Promote a listing above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className={`border-2 ${campaign.status === "active" ? "border-blue-400 bg-blue-50/30" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900 truncate">{campaign.listing_name}</p>
                      <Badge className={
                        campaign.status === "active" ? "bg-green-500 text-white" :
                        campaign.status === "paused" ? "bg-yellow-500 text-white" :
                        "bg-gray-400 text-white"
                      }>
                        {campaign.status}
                      </Badge>
                      {campaign.ad_generation_status === "generating" && (
                        <Badge variant="outline" className="text-blue-600 border-blue-400 text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating ads…
                        </Badge>
                      )}
                      {campaign.ad_generation_status === "ready" && (
                        <Badge variant="outline" className="text-green-600 border-green-400 text-xs">
                          ✓ Ads ready
                        </Badge>
                      )}
                    </div>
                    {campaign.landing_page_url && (
                      <a href={campaign.landing_page_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block mb-2">
                        {campaign.landing_page_url}
                      </a>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Impressions</p>
                          <p className="font-bold text-sm">{(campaign.total_impressions || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MousePointer className="w-3.5 h-3.5 text-blue-500" />
                        <div>
                          <p className="text-xs text-gray-500">Clicks</p>
                          <p className="font-bold text-sm">{(campaign.total_clicks || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-green-500" />
                        <div>
                          <p className="text-xs text-gray-500">Conversions</p>
                          <p className="font-bold text-sm">{(campaign.total_conversions || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ad copies preview */}
                    {campaign.ad_copies && campaign.ad_copies.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-gray-600">Generated Ad Copies:</p>
                        {campaign.ad_copies.slice(0, 2).map((copy, i) => (
                          <p key={i} className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1">
                            "{copy}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {campaign.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => handlePauseCampaign(campaign)}
                        className="border-yellow-400 text-yellow-600 hover:bg-yellow-50">
                        <Pause className="w-3.5 h-3.5 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleResumeCampaign(campaign)}
                        className="border-green-400 text-green-600 hover:bg-green-50">
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}