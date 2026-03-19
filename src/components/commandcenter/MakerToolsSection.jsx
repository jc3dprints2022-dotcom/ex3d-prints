import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Package, Printer, AlertCircle, MapPin, Loader2, Trash2, Trophy, TrendingUp, Award, CheckCircle, XCircle, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MakerToolsSection() {
  const [makers, setMakers] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [perfList, setPerfList] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaker, setSelectedMaker] = useState(null);
  const [showMakerDialog, setShowMakerDialog] = useState(false);
  const [deletingMaker, setDeletingMaker] = useState(null);
  const [processingApp, setProcessingApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingApp, setRejectingApp] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMakers();
  }, []);

  const loadMakers = async () => {
    setLoading(true);
    try {
      const [users, allPrinters, allFilaments, allPerformance, allApplications] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Printer.list(),
        base44.entities.Filament.list(),
        base44.entities.MakerPerformance.list(),
        base44.entities.MakerApplication.filter({ status: 'pending' })
      ]);
      
      const makerUsers = users.filter(u => 
        u.business_roles?.includes('maker') && u.maker_id
      );
      
      const perfMap = {};
      allPerformance.forEach(p => {
        if (!perfMap[p.maker_id] || new Date(p.week_start) > new Date(perfMap[p.maker_id].week_start)) {
          perfMap[p.maker_id] = p;
        }
      });
      
      setMakers(makerUsers);
      setPrinters(allPrinters);
      setFilaments(allFilaments);
      setPerformance(perfMap);
      setPerfList(Object.values(perfMap));
    } catch (error) {
      console.error("Failed to load makers:", error);
    }
    setLoading(false);
  };

  const getMakerPrinters = (makerId) => {
    return printers.filter(p => p.maker_id === makerId);
  };

  const getMakerFilaments = (makerId) => {
    return filaments.filter(f => f.maker_id === makerId);
  };

  const handleViewMaker = (maker) => {
    setSelectedMaker(maker);
    setShowMakerDialog(true);
  };

  const handleUpdateCampus = async (makerId, newCampus) => {
    setUpdatingCampus(makerId);
    try {
      await base44.entities.User.update(makerId, { campus_location: newCampus });
      toast({ title: "Campus location updated" });
      loadMakers();
    } catch (error) {
      console.error("Failed to update campus:", error);
      toast({ title: "Failed to update campus", variant: "destructive" });
    }
    setUpdatingCampus(null);
  };

  const getCampusLabel = (value) => {
    return CAMPUS_LOCATIONS.find(c => c.value === value)?.label || value || 'Not Set';
  };

  const handleDeleteMaker = async (maker) => {
    if (!confirm(`Are you sure you want to remove maker access from ${maker.full_name}? This will remove their maker role, maker_id, and all associated data.`)) {
      return;
    }

    setDeletingMaker(maker.id);
    try {
      // Remove maker role and maker_id from user
      const updatedRoles = (maker.business_roles || []).filter(role => role !== 'maker');
      
      await base44.entities.User.update(maker.id, {
        business_roles: updatedRoles,
        maker_id: null,
        campus_location: null,
        hours_printed_this_week: null,
        max_hours_per_week: null,
        weekly_capacity: null,
        experience_level: null,
        open_to_unowned_filaments: null,
        account_status: null
      });

      // Delete all associated printers
      const makerPrinters = getMakerPrinters(maker.maker_id);
      for (const printer of makerPrinters) {
        await base44.entities.Printer.delete(printer.id);
      }

      // Delete all associated filaments
      const makerFilaments = getMakerFilaments(maker.maker_id);
      for (const filament of makerFilaments) {
        await base44.entities.Filament.delete(filament.id);
      }

      toast({ title: "Maker access removed successfully" });
      loadMakers();
    } catch (error) {
      console.error("Failed to delete maker:", error);
      toast({ title: "Failed to remove maker access", variant: "destructive" });
    }
    setDeletingMaker(null);
  };

  const calculateWeeklyPerformance = async () => {
    try {
      await base44.functions.invoke('calculateMakerPerformance');
      toast({ title: "Performance calculated successfully!" });
      await loadMakers();
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tools">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900 border-slate-700">
          <TabsTrigger value="tools" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            🔧 Maker Tools
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            🏅 Maker Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools">
          <Card>
        <CardHeader>
          <CardTitle>Active Makers ({makers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <p>Loading makers...</p>
            ) : makers.length === 0 ? (
              <p className="text-gray-500">No active makers found</p>
            ) : (
              makers.map(maker => {
                const makerPrinters = getMakerPrinters(maker.maker_id);
                const makerFilaments = getMakerFilaments(maker.maker_id);
                
                return (
                  <div key={maker.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{maker.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Mail className="w-4 h-4" />
                          {maker.email}
                        </div>
                        {maker.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="w-4 h-4" />
                            {maker.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <Select
                            value={maker.campus_location || ''}
                            onValueChange={(value) => handleUpdateCampus(maker.id, value)}
                            disabled={updatingCampus === maker.id}
                          >
                            <SelectTrigger className="h-7 w-48 text-xs">
                              {updatingCampus === maker.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SelectValue placeholder="Set campus" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {CAMPUS_LOCATIONS.map(campus => (
                                <SelectItem key={campus.value} value={campus.value}>
                                  {campus.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewMaker(maker)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMaker(maker)}
                          disabled={deletingMaker === maker.id}
                        >
                          {deletingMaker === maker.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Printer className="w-4 h-4" />
                          Printers ({makerPrinters.length})
                        </div>
                        {makerPrinters.length > 0 ? (
                          <div className="space-y-1">
                            {makerPrinters.slice(0, 2).map(printer => (
                              <div key={printer.id} className="text-xs text-gray-600 flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {printer.brand} {printer.model}
                                </Badge>
                                {printer.multi_color_capable && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    Multi-color
                                  </Badge>
                                )}
                              </div>
                            ))}
                            {makerPrinters.length > 2 && (
                              <p className="text-xs text-gray-500">+{makerPrinters.length - 2} more</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No printers</p>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Package className="w-4 h-4" />
                          Filaments ({makerFilaments.length})
                          {maker.open_to_unowned_filaments && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Open to ordering
                            </Badge>
                          )}
                        </div>
                        {makerFilaments.length > 0 ? (
                          <div className="space-y-1">
                            {makerFilaments.slice(0, 3).map(filament => (
                              <div key={filament.id} className="text-xs text-gray-600">
                                {filament.material_type} - {filament.color}
                              </div>
                            ))}
                            {makerFilaments.length > 3 && (
                              <p className="text-xs text-gray-500">+{makerFilaments.length - 3} more</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No filaments</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Weekly Hours:</span>
                          <span className="font-medium ml-2">
                            {maker.hours_printed_this_week || 0}h / {maker.max_hours_per_week || 40}h
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            {maker.account_status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Performance Tier:</span>
                          {performance[maker.maker_id] ? (
                            <Badge className={`ml-2 ${
                              performance[maker.maker_id].tier === 'gold' ? 'bg-yellow-500 text-white' :
                              performance[maker.maker_id].tier === 'silver' ? 'bg-gray-400 text-white' :
                              'bg-orange-700 text-white'
                            }`}>
                              {performance[maker.maker_id].tier.toUpperCase()}
                            </Badge>
                          ) : (
                            <Badge className="ml-2 bg-gray-300 text-gray-700">
                              Not Rated
                            </Badge>
                          )}
                        </div>
                      </div>
                      {performance[maker.maker_id] && (
                        <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mt-2">
                          <div>On-time: {performance[maker.maker_id].on_time_delivery_rate.toFixed(1)}%</div>
                          <div>Defects: {performance[maker.maker_id].defect_rate.toFixed(1)}%</div>
                          <div>Volume: {performance[maker.maker_id].total_volume_fulfilled} orders</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Maker Performance & Merit System</h2>
              <Button onClick={calculateWeeklyPerformance}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Calculate Weekly Performance
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['gold', 'silver', 'bronze'].map(tier => {
                const tierMakers = perfList.filter(p => p.tier === tier);
                return (
                  <Card key={tier} className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400 capitalize">{tier} Tier</p>
                          <p className="text-2xl font-bold text-white">{tierMakers.length} Makers</p>
                        </div>
                        {getTierIcon(tier)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-600">
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
                      {perfList
                        .sort((a, b) => {
                          const tierOrder = { gold: 3, silver: 2, bronze: 1 };
                          if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[b.tier] - tierOrder[a.tier];
                          return b.on_time_delivery_rate - a.on_time_delivery_rate;
                        })
                        .map((perf, index) => (
                          <tr key={perf.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3">#{index + 1}</td>
                            <td>{perf.maker_id}</td>
                            <td className="text-center">
                              <Badge className={getTierColor(perf.tier)}>{perf.tier?.toUpperCase()}</Badge>
                            </td>
                            <td className="text-center">
                              <span className={perf.on_time_delivery_rate < 95 ? 'text-red-400' : 'text-green-400'}>
                                {perf.on_time_delivery_rate?.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={perf.defect_rate > 5 ? 'text-red-400' : 'text-green-400'}>
                                {perf.defect_rate?.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-center">{perf.average_turnaround_hours?.toFixed(1) || 0}h</td>
                            <td className="text-center">{perf.total_volume_fulfilled}</td>
                            <td className="text-center">
                              {perf.flagged_for_review && <Badge variant="destructive">Flagged</Badge>}
                              {perf.routing_priority_reduced && <Badge variant="destructive">Low Priority</Badge>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {perfList.filter(p => p.flagged_for_review).length > 0 && (
              <Card className="border-red-700 bg-red-950/50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-300">
                      {perfList.filter(p => p.flagged_for_review).length} Makers Flagged for Review
                    </p>
                    <p className="text-sm text-red-400">These makers have been below standard for 2+ consecutive weeks</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Maker Details Dialog */}
      <Dialog open={showMakerDialog} onOpenChange={setShowMakerDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maker Details</DialogTitle>
            <DialogDescription>
              {selectedMaker?.full_name} - {selectedMaker?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedMaker && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-2">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> {selectedMaker.email}</p>
                  {selectedMaker.phone && <p><strong>Phone:</strong> {selectedMaker.phone}</p>}
                  <p><strong>Maker ID:</strong> {selectedMaker.maker_id}</p>
                  <p><strong>Campus:</strong> {getCampusLabel(selectedMaker.campus_location)}</p>
                </div>
              </div>

              {/* Capacity Info */}
              <div>
                <h3 className="font-semibold mb-2">Capacity & Availability</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Hours This Week:</strong> {selectedMaker.hours_printed_this_week || 0}h</p>
                  <p><strong>Max Hours/Week:</strong> {selectedMaker.max_hours_per_week || 40}h</p>
                  <p><strong>Weekly Capacity:</strong> {selectedMaker.weekly_capacity || 'Not set'}</p>
                  <p><strong>Experience Level:</strong> {selectedMaker.experience_level || 'Not set'}</p>
                </div>
              </div>

              {/* Filaments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Filament Inventory</h3>
                  {selectedMaker.open_to_unowned_filaments && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Open to ordering unowned filaments
                    </Badge>
                  )}
                  {!selectedMaker.open_to_unowned_filaments && (
                    <Badge className="bg-gray-100 text-gray-800">
                      Only uses owned filaments
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {getMakerFilaments(selectedMaker.maker_id).map(filament => (
                    <div key={filament.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{filament.material_type}</p>
                          <p className="text-sm text-gray-600">{filament.color}</p>
                          <p className="text-sm text-gray-600">{filament.quantity_kg} kg</p>
                        </div>
                        <Badge className={filament.in_stock ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}>
                          {filament.in_stock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {getMakerFilaments(selectedMaker.maker_id).length === 0 && (
                  <p className="text-sm text-gray-500">No filaments in inventory</p>
                )}
              </div>

              {/* Printers */}
              <div>
                <h3 className="font-semibold mb-3">Registered Printers</h3>
                <div className="space-y-3">
                  {getMakerPrinters(selectedMaker.maker_id).map(printer => (
                    <div key={printer.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{printer.name || `${printer.brand} ${printer.model}`}</p>
                          <p className="text-sm text-gray-600">{printer.brand} - {printer.model}</p>
                        </div>
                        <Badge className={
                          printer.status === 'active' ? 'bg-green-100 text-green-900' :
                          printer.status === 'printing' ? 'bg-blue-100 text-blue-900' :
                          printer.status === 'maintenance' ? 'bg-yellow-100 text-yellow-900' :
                          'bg-gray-100 text-gray-900'
                        }>
                          {printer.status}
                        </Badge>
                      </div>
                      {printer.print_volume && (
                        <p className="text-sm text-gray-600">
                          Build Volume: {printer.print_volume.length}×{printer.print_volume.width}×{printer.print_volume.height}mm
                        </p>
                      )}
                      {printer.multi_color_capable && (
                        <Badge className="bg-purple-100 text-purple-800 mt-2">
                          Multi-color capable
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {getMakerPrinters(selectedMaker.maker_id).length === 0 && (
                  <p className="text-sm text-gray-500">No printers registered</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}