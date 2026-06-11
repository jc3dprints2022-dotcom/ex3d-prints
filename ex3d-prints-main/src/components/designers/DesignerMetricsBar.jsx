import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";

/**
 * Shows Followers metric for the designer dashboard.
 * Props: user (with designer_id), products (their listings)
 */
export default function DesignerMetricsBar({ user, products }) {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.designer_id) loadData();
  }, [user?.designer_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const follows = await base44.entities.DesignerFollower.filter({ designer_id: user.designer_id }).catch(() => []);
      setFollowers(follows);
    } catch (err) {
      console.error("Failed to load designer followers:", err);
    }
    setLoading(false);
  };

  const totalFollowers = followers.length;

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4">
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Followers</p>
                <p className="text-2xl font-bold text-teal-900">{totalFollowers}</p>
                <p className="text-xs text-teal-600">Get notified on new drops</p>
              </div>
              <Users className="w-8 h-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}