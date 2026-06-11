import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, TrendingUp, AlertTriangle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MakerPerformanceSection() {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const perfData = await base44.entities.MakerPerformance.list();
      
      // Get latest performance for each maker
      const latestPerf = {};
      perfData.forEach(p => {
        if (!latestPerf[p.maker_id] || new Date(p.week_start) > new Date(latestPerf[p.maker_id].week_start)) {
          latestPerf[p.maker_id] = p;
        }
      });
      
      setPerformance(Object.values(latestPerf));
    } catch (error) {
      toast({ title: "Failed to load performance data", variant: "destructive" });
    }
    setLoading(false);
  };

  const calculateWeeklyPerformance = async () => {
    try {
      const response = await base44.functions.invoke('calculateMakerPerformance');
      toast({ title: "Performance calculated successfully!" });
      await loadPerformance();
    } catch (error) {
      toast({ title: "Failed to calculate performance", variant: "destructive" });
    }
  };

  const getTierColor = (tier) => {
    if (tier === 'gold') return 'bg-yellow-500 text-white';
    if (tier === 'silver') return 'bg-gray-400 text-white';
    return 'bg-orange-700 text-white';
  };

  const getTierIcon = (tier) => {
    if (tier === 'gold') return <Trophy className="w-4 h-4" />;
    if (tier === 'silver') return <Award className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Maker Performance & Merit System</h2>
        <Button onClick={calculateWeeklyPerformance}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Calculate Weekly Performance
        </Button>
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['gold', 'silver', 'bronze'].map(tier => {
          const tierMakers = performance.filter(p => p.tier === tier);
          return (
            <Card key={tier}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 capitalize">{tier} Tier</p>
                    <p className="text-2xl font-bold">{tierMakers.length} Makers</p>
                  </div>
                  {getTierIcon(tier)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Rank</th>
                  <th className="text-left">Maker ID</th>
                  <th className="text-center">Tier</th>
                  <th className="text-center">On-Time %</th>
                  <th className="text-center">Defect %</th>
                  <th className="text-center">Avg Turnaround</th>
                  <th className="text-center">Volume</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {performance
                  .sort((a, b) => {
                    const tierOrder = { gold: 3, silver: 2, bronze: 1 };
                    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
                      return tierOrder[b.tier] - tierOrder[a.tier];
                    }
                    return b.on_time_delivery_rate - a.on_time_delivery_rate;
                  })
                  .map((perf, index) => (
                    <tr key={perf.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">#{index + 1}</td>
                      <td>{perf.maker_id}</td>
                      <td className="text-center">
                        <Badge className={getTierColor(perf.tier)}>
                          {perf.tier.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <span className={perf.on_time_delivery_rate < 95 ? 'text-red-600' : 'text-green-600'}>
                          {perf.on_time_delivery_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={perf.defect_rate > 5 ? 'text-red-600' : 'text-green-600'}>
                          {perf.defect_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">{perf.average_turnaround_hours?.toFixed(1) || 0}h</td>
                      <td className="text-center">{perf.total_volume_fulfilled}</td>
                      <td className="text-center">
                        {perf.flagged_for_review && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        {perf.routing_priority_reduced && (
                          <Badge variant="destructive">Low Priority</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Makers Alert */}
      {performance.filter(p => p.flagged_for_review).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">
                  {performance.filter(p => p.flagged_for_review).length} Makers Flagged for Review
                </p>
                <p className="text-sm text-red-700">
                  These makers have been below standard for 2+ consecutive weeks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}