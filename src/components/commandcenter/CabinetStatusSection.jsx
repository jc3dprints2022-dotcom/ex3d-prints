import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CabinetStatusSection() {
  const [cabinets, setCabinets] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCabinetStatus();
  }, []);

  const loadCabinetStatus = async () => {
    setLoading(true);
    try {
      const cabinetData = await base44.entities.PickupCabinet.list();
      cabinetData.sort((a, b) => a.cabinet_number - b.cabinet_number);
      setCabinets(cabinetData);

      const queueData = await base44.entities.CabinetQueue.filter({ status: 'waiting' });
      queueData.sort((a, b) => a.queue_position - b.queue_position);
      setQueue(queueData);
    } catch (error) {
      console.error("Failed to load cabinet status:", error);
      toast({ title: "Failed to load cabinet status", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleReleaseOrder = async (cabinetId, orderId) => {
    try {
      await base44.functions.invoke('releaseCabinet', { orderId });
      toast({ title: "Order released from cabinet" });
      loadCabinetStatus();
    } catch (error) {
      toast({ title: "Failed to release order", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Cabinet Status</h2>
        <p className="text-gray-400">Monitor pickup cabinet occupancy and manage orders</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {cabinets.map((cabinet) => {
          const currentOrders = cabinet.current_orders || [];
          const slotsUsed = currentOrders.length;
          const totalSlots = 10;
          const percentageFull = (slotsUsed / totalSlots) * 100;

          return (
            <Card key={cabinet.id} className="bg-slate-900 border-cyan-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-cyan-400">
                    Cabinet {cabinet.cabinet_number}
                  </CardTitle>
                  <Badge 
                    className={
                      slotsUsed === 0 ? 'bg-green-500/20 text-green-400' :
                      slotsUsed < 7 ? 'bg-yellow-500/20 text-yellow-400' :
                      slotsUsed < 10 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }
                  >
                    {slotsUsed}/{totalSlots} Slots
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white">{cabinet.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Unlock Code:</span>
                    <span className="text-white font-mono">{cabinet.unlock_code}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Capacity:</span>
                    <span className="text-white">{slotsUsed} / {totalSlots} orders</span>
                  </div>
                  <Progress value={percentageFull} className="h-2" />
                </div>

                {currentOrders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-400">Current Orders:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {currentOrders.map((orderId, index) => (
                        <div 
                          key={orderId} 
                          className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs"
                        >
                          <span className="text-gray-300">
                            Slot {index + 1}: #{orderId.slice(-8)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReleaseOrder(cabinet.id, orderId)}
                            className="h-6 px-2 text-red-400 hover:text-red-300"
                          >
                            Release
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {queue.length > 0 && (
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400">Cabinet Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              {queue.length} order(s) waiting for cabinet space
            </p>
            <div className="space-y-2">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-800 p-3 rounded">
                  <div>
                    <span className="text-white font-semibold">Position {item.queue_position}</span>
                    <span className="text-gray-400 ml-3">Order #{item.order_id.slice(-8)}</span>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400">Waiting</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {cabinets.length === 0 && (
        <Card className="bg-slate-900 border-cyan-500/30">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No cabinets configured. Cabinets will be initialized automatically when the first order is completed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}