import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function DesignerEarningsTab({ user }) {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.designer_id) loadEarnings();
  }, [user]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.DesignerEarnings.filter({ designer_id: user.designer_id });
      setEarnings(all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch {
      setEarnings([]);
    }
    setLoading(false);
  };

  const pending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + e.royalty_amount, 0);
  const paid = earnings.filter(e => e.status === "paid").reduce((s, e) => s + e.royalty_amount, 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payout</p>
                <p className="text-2xl font-bold text-purple-600">${pending.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Paid on the 1st of next month</p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">${paid.toFixed(2)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{earnings.length}</p>
                <p className="text-xs text-gray-500 mt-1">10% royalty per sale</p>
              </div>
              <DollarSign className="w-8 h-8 text-teal-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No earnings yet. Sales will appear here.</p>
          ) : (
            <div className="space-y-2">
              {earnings.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{e.product_name || "Product"}</p>
                    <p className="text-xs text-gray-500">Order #{e.order_id?.slice(-8)} · {new Date(e.created_date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">Sale: ${e.order_amount?.toFixed(2)} → 10% royalty</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">${e.royalty_amount?.toFixed(2)}</p>
                    <Badge className={e.status === "paid" ? "bg-green-100 text-green-800" : e.status === "transfer_failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}