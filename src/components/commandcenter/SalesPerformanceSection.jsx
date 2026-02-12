import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, Users, DollarSign, Target, AlertCircle, Plus, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SalesPerformanceSection() {
  const [reps, setReps] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRepDialog, setShowRepDialog] = useState(false);
  const [showOfficeDialog, setShowOfficeDialog] = useState(false);
  const [editingRep, setEditingRep] = useState(null);
  const [editingOffice, setEditingOffice] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [repsData, officesData] = await Promise.all([
        base44.entities.SalesRep.list(),
        base44.entities.SalesOffice.list()
      ]);
      setReps(repsData);
      setOffices(officesData);
    } catch (error) {
      toast({ title: "Failed to load sales data", variant: "destructive" });
    }
    setLoading(false);
  };

  const calculateTeamMetrics = () => {
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const visitsThisWeek = offices.filter(o => 
      o.last_contact_date && new Date(o.last_contact_date) >= thisWeek
    ).length;

    const newAccountsThisWeek = offices.filter(o =>
      o.stage === 'closed_won' && o.closed_date && new Date(o.closed_date) >= thisWeek
    ).length;

    const totalClosed = offices.filter(o => o.stage === 'closed_won').length;
    const totalLost = offices.filter(o => o.stage === 'closed_lost').length;
    const weeklyCloseRate = totalClosed + totalLost > 0 
      ? (totalClosed / (totalClosed + totalLost)) * 100 
      : 0;

    const mrr = offices
      .filter(o => o.stage === 'closed_won' && o.is_active_account)
      .reduce((sum, o) => sum + (o.monthly_value || 0), 0);

    return { visitsThisWeek, newAccountsThisWeek, weeklyCloseRate, mrr };
  };

  const teamMetrics = calculateTeamMetrics();

  const getOverdueFollowUps = () => {
    const today = new Date();
    return offices.filter(o => 
      o.next_follow_up_date && 
      new Date(o.next_follow_up_date) < today &&
      !['closed_won', 'closed_lost'].includes(o.stage)
    );
  };

  const overdueFollowUps = getOverdueFollowUps();

  if (loading) {
    return <div className="text-center py-8">Loading sales data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Team Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Visits This Week</p>
                <p className="text-2xl font-bold">{teamMetrics.visitsThisWeek}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Accounts</p>
                <p className="text-2xl font-bold">{teamMetrics.newAccountsThisWeek}</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weekly Close Rate</p>
                <p className="text-2xl font-bold">{teamMetrics.weeklyCloseRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly MRR</p>
                <p className="text-2xl font-bold">${teamMetrics.mrr.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Follow-ups Alert */}
      {overdueFollowUps.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  {overdueFollowUps.length} Overdue Follow-ups
                </p>
                <p className="text-sm text-orange-700">
                  {overdueFollowUps.map(o => o.office_name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Reps Leaderboard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Rep Leaderboard</CardTitle>
          <Button onClick={() => { setEditingRep(null); setShowRepDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rep
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Rep</th>
                  <th className="text-center">Offices</th>
                  <th className="text-center">Visited</th>
                  <th className="text-center">Proposals</th>
                  <th className="text-center">Closed</th>
                  <th className="text-center">Close Rate</th>
                  <th className="text-center">Revenue</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reps.sort((a, b) => b.revenue_generated - a.revenue_generated).map(rep => (
                  <tr key={rep.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">{rep.name}</td>
                    <td className="text-center">{rep.total_offices_assigned}</td>
                    <td className="text-center">{rep.offices_visited}</td>
                    <td className="text-center">{rep.proposals_sent}</td>
                    <td className="text-center">{rep.deals_closed}</td>
                    <td className="text-center">{rep.close_rate.toFixed(1)}%</td>
                    <td className="text-center">${rep.revenue_generated.toLocaleString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingRep(rep); setShowRepDialog(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Pipeline</CardTitle>
          <Button onClick={() => { setEditingOffice(null); setShowOfficeDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Office
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {['cold', 'contacted', 'follow_up', 'proposal_sent', 'closed_won', 'closed_lost'].map(stage => {
              const stageOffices = offices.filter(o => o.stage === stage);
              const stageLabel = stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              
              return (
                <div key={stage} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{stageLabel}</h3>
                  <p className="text-2xl font-bold text-teal-600">{stageOffices.length}</p>
                  <div className="mt-3 space-y-2">
                    {stageOffices.slice(0, 3).map(office => (
                      <div
                        key={office.id}
                        className="bg-white p-2 rounded text-sm cursor-pointer hover:bg-gray-100"
                        onClick={() => { setEditingOffice(office); setShowOfficeDialog(true); }}
                      >
                        {office.office_name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}