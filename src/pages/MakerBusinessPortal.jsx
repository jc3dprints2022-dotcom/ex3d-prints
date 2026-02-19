import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, DollarSign, TrendingUp, Building2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function MakerBusinessPortal() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ listings: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser.business_roles?.includes('maker')) {
        window.location.href = createPageUrl("Home");
        return;
      }

      // Load stats
      const allProducts = await base44.entities.Product.list();
      const myListings = allProducts.filter(p => 
        p.seller_id === currentUser.id && 
        p.marketplace_type === 'business'
      );

      const allOrders = await base44.entities.Order.list();
      const myOrders = allOrders.filter(o => o.maker_id === currentUser.id);
      const revenue = myOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        listings: myListings.length,
        orders: myOrders.length,
        revenue
      });
    } catch (error) {
      console.error("Failed to load portal data:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Business Portal</h1>
          </div>
          <p className="text-orange-100">Manage your wholesale 3D printing business</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Listings</CardTitle>
              <Package className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.listings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Plus className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Create New Listing</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Upload a new wholesale product to the business marketplace
                  </p>
                  <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <Link to={createPageUrl("MakerNewListing")}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Listing
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Manage Listings</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    View and edit your existing business marketplace products
                  </p>
                  <Button asChild variant="outline">
                    <Link to={createPageUrl("MakerBusinessListings")}>
                      View Listings
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}