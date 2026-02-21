import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Pause, Play, Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function RecurringOrderManager({ user, subscriptions, onUpdate }) {
  const [pausingSub, setPausingSub] = useState(null);
  const { toast } = useToast();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePauseResume = async (sub) => {
    setPausingSub(sub.id);
    try {
      const newStatus = sub.status === 'active' ? 'paused' : 'active';
      await base44.entities.BusinessSubscription.update(sub.id, { status: newStatus });
      toast({ 
        title: newStatus === 'paused' ? "Subscription paused" : "Subscription resumed",
        description: newStatus === 'paused' ? "Your recurring orders are paused" : "Recurring orders will resume"
      });
      onUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update subscription", variant: "destructive" });
    }
    setPausingSub(null);
  };

  const handleCancelSubscription = async (sub) => {
    if (!confirm('Are you sure you want to cancel this recurring order? This cannot be undone.')) return;
    
    try {
      await base44.entities.BusinessSubscription.update(sub.id, { status: 'cancelled' });
      toast({ title: "Recurring order cancelled" });
      onUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel subscription", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recurring Orders</h2>
          <p className="text-gray-600 text-sm">Automate your regular product orders</p>
        </div>
        <Button asChild className="bg-purple-600 hover:bg-purple-700">
          <Link to={createPageUrl("BusinessMarketplace")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Recurring Order
          </Link>
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recurring orders</h3>
            <p className="text-gray-600 mb-4">
              Set up automatic recurring orders to save time and never run out of inventory
            </p>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <Link to={createPageUrl("BusinessMarketplace")}>
                Browse Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map(sub => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg capitalize">
                      {sub.frequency} Recurring Order
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {sub.items?.length || 0} products • ${sub.total_per_cycle?.toFixed(2)} per cycle
                    </p>
                  </div>
                  <Badge className={
                    sub.status === 'active' ? 'bg-green-100 text-green-800' :
                    sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {sub.next_order_date && (
                      <div>
                        <span className="text-gray-600">Next Order:</span>
                        <p className="font-medium">{formatDate(sub.next_order_date)}</p>
                      </div>
                    )}
                    {sub.last_order_date && (
                      <div>
                        <span className="text-gray-600">Last Order:</span>
                        <p className="font-medium">{formatDate(sub.last_order_date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Order Items:</p>
                    <div className="space-y-2">
                      {sub.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span>{item.product_name}</span>
                          <span className="text-gray-600">Qty: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePauseResume(sub)}
                      disabled={pausingSub === sub.id || sub.status === 'cancelled'}
                    >
                      {sub.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelSubscription(sub)}
                      disabled={sub.status === 'cancelled'}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
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