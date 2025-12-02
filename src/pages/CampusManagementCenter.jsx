import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Package, Users, DollarSign, TrendingUp,
  Building, Printer, ShoppingCart, AlertCircle, CheckCircle
} from "lucide-react";

const CAMPUS_LOCATIONS = [
  { value: "erau_prescott", label: "ERAU Prescott" },
  { value: "erau_daytona", label: "ERAU Daytona" },
  { value: "arizona_state", label: "Arizona State University" },
];

export default function CampusManagementCenter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campus, setCampus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [makers, setMakers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeMakers: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      
      if (!currentUser.business_roles?.includes('campus_manager') || !currentUser.managed_campus) {
        toast({
          title: "Access Denied",
          description: "You are not authorized to access this page",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }

      setUser(currentUser);
      setCampus(currentUser.managed_campus);

      // Load all data for this campus
      const [allOrders, allUsers] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.User.list()
      ]);

      // Filter orders for this campus
      const campusOrders = allOrders.filter(o => 
        (o.campus_location || 'erau_prescott') === currentUser.managed_campus
      );
      setOrders(campusOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

      // Filter makers for this campus
      const campusMakers = allUsers.filter(u => 
        u.business_roles?.includes('maker') && 
        (u.campus_location || 'erau_prescott') === currentUser.managed_campus
      );
      setMakers(campusMakers);

      // Filter customers who have ordered from this campus
      const customerIds = new Set(campusOrders.map(o => o.customer_id));
      const campusCustomers = allUsers.filter(u => customerIds.has(u.id));
      setCustomers(campusCustomers);

      // Calculate stats
      const pendingOrders = campusOrders.filter(o => 
        ['pending', 'accepted', 'printing'].includes(o.status)
      ).length;
      const completedOrders = campusOrders.filter(o => 
        ['completed', 'dropped_off', 'delivered'].includes(o.status)
      ).length;
      const totalRevenue = campusOrders
        .filter(o => ['completed', 'dropped_off', 'delivered'].includes(o.status))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        totalOrders: campusOrders.length,
        pendingOrders,
        completedOrders,
        totalRevenue,
        activeMakers: campusMakers.filter(m => m.account_status === 'active').length
      });

    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const getCampusLabel = (value) => {
    return CAMPUS_LOCATIONS.find(c => c.value === value)?.label || value;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-900',
      accepted: 'bg-blue-100 text-blue-900',
      printing: 'bg-purple-100 text-purple-900',
      completed: 'bg-green-100 text-green-900',
      dropped_off: 'bg-teal-100 text-teal-900',
      delivered: 'bg-emerald-100 text-emerald-900',
      cancelled: 'bg-red-100 text-red-900',
      unassigned: 'bg-gray-100 text-gray-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-900';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Campus Management Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-600 text-white text-lg px-4 py-1">
              {getCampusLabel(campus)}
            </Badge>
            <span className="text-gray-400">• Managed by {user?.full_name}</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                </div>
                <Package className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingOrders}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-teal-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-teal-400">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Makers</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.activeMakers}</p>
                </div>
                <Printer className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-600">
              <Package className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="makers" className="data-[state=active]:bg-cyan-600">
              <Printer className="w-4 h-4 mr-2" />
              Makers
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-cyan-600">
              <Users className="w-4 h-4 mr-2" />
              Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="bg-slate-800 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Campus Orders ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No orders for this campus yet</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {orders.map(order => (
                      <div key={order.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-white">Order #{order.id.slice(-8)}</h3>
                            <p className="text-sm text-gray-400">
                              {new Date(order.created_date).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusBadgeColor(order.status)}>
                              {order.status}
                            </Badge>
                            {order.is_priority && (
                              <Badge className="bg-orange-500">⚡ Priority</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Items:</span>
                            <span className="text-white ml-2">
                              {order.items?.length || 0} item(s)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Total:</span>
                            <span className="text-cyan-400 font-semibold ml-2">
                              ${order.total_amount?.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Maker:</span>
                            <span className="text-white ml-2">
                              {order.maker_id ? 
                                makers.find(m => m.maker_id === order.maker_id)?.full_name || 'Assigned' 
                                : 'Unassigned'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Customer:</span>
                            <span className="text-white ml-2">
                              {customers.find(c => c.id === order.customer_id)?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="makers">
            <Card className="bg-slate-800 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Campus Makers ({makers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {makers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No makers at this campus yet</p>
                ) : (
                  <div className="space-y-4">
                    {makers.map(maker => (
                      <div key={maker.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{maker.full_name}</h3>
                            <p className="text-sm text-gray-400">{maker.email}</p>
                            {maker.phone && (
                              <p className="text-sm text-gray-400">{maker.phone}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={
                              maker.account_status === 'active' ? 'bg-green-600' :
                              maker.account_status === 'suspended' ? 'bg-red-600' :
                              'bg-gray-600'
                            }>
                              {maker.account_status}
                            </Badge>
                            {maker.vacation_mode && (
                              <Badge className="bg-yellow-600">On Vacation</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Hours This Week:</span>
                            <span className="text-white ml-2">
                              {maker.hours_printed_this_week || 0}h / {maker.max_hours_per_week || 40}h
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Experience:</span>
                            <span className="text-white ml-2 capitalize">
                              {maker.experience_level || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Weekly Capacity:</span>
                            <span className="text-white ml-2">
                              {maker.weekly_capacity || 'N/A'}h
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card className="bg-slate-800 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white">Campus Customers ({customers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No customers have ordered from this campus yet</p>
                ) : (
                  <div className="space-y-3">
                    {customers.map(customer => {
                      const customerOrders = orders.filter(o => o.customer_id === customer.id);
                      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                      
                      return (
                        <div key={customer.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-white">{customer.full_name}</h3>
                              <p className="text-sm text-gray-400">{customer.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400">{customerOrders.length} order(s)</p>
                              <p className="text-cyan-400 font-semibold">${totalSpent.toFixed(2)} total</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}