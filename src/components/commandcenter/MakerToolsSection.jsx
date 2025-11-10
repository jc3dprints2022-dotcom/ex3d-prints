import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Package, Printer, AlertCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [selectedMaker, setSelectedMaker] = useState(null);
  const [showMakerDialog, setShowMakerDialog] = useState(false);

  useEffect(() => {
    loadMakers();
  }, []);

  const loadMakers = async () => {
    setLoading(true);
    try {
      const [users, allPrinters, allFilaments] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Printer.list(),
        base44.entities.Filament.list()
      ]);
      
      const makerUsers = users.filter(u => 
        u.business_roles?.includes('maker') && u.maker_id
      );
      
      setMakers(makerUsers);
      setPrinters(allPrinters);
      setFilaments(allFilaments);
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

  return (
    <div className="space-y-6">
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
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleViewMaker(maker)}
                      >
                        View Details
                      </Button>
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
                      <div className="grid grid-cols-2 gap-4 text-sm">
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