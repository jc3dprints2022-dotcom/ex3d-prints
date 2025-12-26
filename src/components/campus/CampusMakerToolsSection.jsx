import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Package, Printer, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
  { value: "erau_daytona", label: "ERAU Daytona" },
  { value: "arizona_state", label: "Arizona State University" },
];

export default function CampusMakerToolsSection({ campusLocation }) {
  const [makers, setMakers] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaker, setSelectedMaker] = useState(null);
  const [showMakerDialog, setShowMakerDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMakers();
  }, [campusLocation]);

  const loadMakers = async () => {
    setLoading(true);
    try {
      const [users, allPrinters, allFilaments] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Printer.list(),
        base44.entities.Filament.list()
      ]);
      
      // Filter makers for this campus
      const campusMakers = users.filter(u => 
        u.business_roles?.includes('maker') && 
        u.maker_id &&
        (u.campus_location || 'erau_prescott') === campusLocation
      );
      
      setMakers(campusMakers);
      setPrinters(allPrinters);
      setFilaments(allFilaments);
    } catch (error) {
      console.error("Failed to load makers:", error);
    }
    setLoading(false);
  };

  const getMakerPrinters = (makerId) => printers.filter(p => p.maker_id === makerId);
  const getMakerFilaments = (makerId) => filaments.filter(f => f.maker_id === makerId);

  const handleViewMaker = (maker) => {
    setSelectedMaker(maker);
    setShowMakerDialog(true);
  };

  const getCampusLabel = (value) => CAMPUS_LOCATIONS.find(c => c.value === value)?.label || 'Not Set';

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Campus Makers ({makers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
              </div>
            ) : makers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No makers at this campus</p>
            ) : (
              makers.map(maker => {
                const makerPrinters = getMakerPrinters(maker.maker_id);
                const makerFilaments = getMakerFilaments(maker.maker_id);
                
                return (
                  <div key={maker.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-white">{maker.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                          <Mail className="w-4 h-4" />
                          {maker.email}
                        </div>
                        {maker.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Phone className="w-4 h-4" />
                            {maker.phone}
                          </div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleViewMaker(maker)} className="bg-cyan-600">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                          <Printer className="w-4 h-4" />
                          Printers ({makerPrinters.length})
                        </div>
                        {makerPrinters.length > 0 ? (
                          <div className="space-y-1">
                            {makerPrinters.slice(0, 2).map(printer => (
                              <div key={printer.id} className="text-xs text-gray-400">
                                {printer.brand} {printer.model}
                                {printer.multi_color_capable && <Badge className="ml-1 bg-purple-600 text-xs">Multi-color</Badge>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No printers</p>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                          <Package className="w-4 h-4" />
                          Filaments ({makerFilaments.length})
                        </div>
                        {makerFilaments.length > 0 ? (
                          <div className="space-y-1">
                            {makerFilaments.slice(0, 2).map(filament => (
                              <div key={filament.id} className="text-xs text-gray-400">
                                {filament.material_type} - {filament.color}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No filaments</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maker Details Dialog */}
      <Dialog open={showMakerDialog} onOpenChange={setShowMakerDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Maker Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedMaker?.full_name} - {selectedMaker?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedMaker && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-cyan-400">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300"><strong>Email:</strong> {selectedMaker.email}</p>
                  {selectedMaker.phone && <p className="text-gray-300"><strong>Phone:</strong> {selectedMaker.phone}</p>}
                  <p className="text-gray-300"><strong>Campus:</strong> {getCampusLabel(selectedMaker.campus_location)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-cyan-400">Capacity</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Hours This Week:</strong> {selectedMaker.hours_printed_this_week || 0}h</p>
                  <p><strong>Max Hours/Week:</strong> {selectedMaker.max_hours_per_week || 40}h</p>
                  <p><strong>Experience:</strong> {selectedMaker.experience_level || 'Not set'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-cyan-400">Printers</h3>
                <div className="space-y-3">
                  {getMakerPrinters(selectedMaker.maker_id).map(printer => (
                    <div key={printer.id} className="p-3 bg-slate-900 border border-slate-700 rounded-lg">
                      <p className="font-medium text-white">{printer.name || `${printer.brand} ${printer.model}`}</p>
                      <p className="text-sm text-gray-400">{printer.brand} - {printer.model}</p>
                      {printer.print_volume && (
                        <p className="text-sm text-gray-400">
                          Build: {printer.print_volume.length}×{printer.print_volume.width}×{printer.print_volume.height}mm
                        </p>
                      )}
                      {printer.multi_color_capable && <Badge className="bg-purple-600 mt-2">Multi-color</Badge>}
                    </div>
                  ))}
                  {getMakerPrinters(selectedMaker.maker_id).length === 0 && (
                    <p className="text-sm text-gray-500">No printers registered</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-cyan-400">Filament Inventory</h3>
                <div className="grid grid-cols-2 gap-3">
                  {getMakerFilaments(selectedMaker.maker_id).map(filament => (
                    <div key={filament.id} className="p-3 bg-slate-900 border border-slate-700 rounded-lg">
                      <p className="font-medium text-white">{filament.material_type}</p>
                      <p className="text-sm text-gray-400">{filament.color} - {filament.quantity_kg}kg</p>
                      <Badge className={filament.in_stock ? 'bg-green-600' : 'bg-red-600'}>
                        {filament.in_stock ? 'In Stock' : 'Out'}
                      </Badge>
                    </div>
                  ))}
                </div>
                {getMakerFilaments(selectedMaker.maker_id).length === 0 && (
                  <p className="text-sm text-gray-500">No filaments in inventory</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}