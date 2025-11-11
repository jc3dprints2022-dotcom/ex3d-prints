
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, Clock } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/components/ui/use-toast"; // Added for toast notifications

export default function PaymentsFinancialsSection() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ordersTimeRange, setOrdersTimeRange] = useState('week');
  const [profitTimeRange, setProfitTimeRange] = useState('week');
  const [ordersChartData, setOrdersChartData] = useState([]);
  const [profitChartData, setProfitChartData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgPricePerHour, setAvgPricePerHour] = useState(0); // This state will now hold Avg Price/Order
  const [platformRevenue, setPlatformRevenue] = useState(0); // New state for Platform Revenue
  const [makerProfits, setMakerProfits] = useState(0); // New state for Maker Profits
  const [loading, setLoading] = useState(true); // New loading state

  const { toast } = useToast();

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      generateOrdersChart();
      generateProfitChart();
    }
  }, [orders, ordersTimeRange, profitTimeRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const allOrders = await base44.entities.Order.list();
      const allProducts = await base44.entities.Product.list();
      
      setOrders(allOrders);
      setProducts(allProducts);

      // Calculate metrics based on completed and paid orders
      const completedOrders = allOrders.filter(o => 
        ['completed', 'delivered', 'dropped_off'].includes(o.status) && o.payment_status === 'paid'
      );
      
      const revenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      setTotalRevenue(revenue);

      // Calculate average price per order (reusing avgPricePerHour state for this)
      const avgPricePerOrder = completedOrders.length > 0 
        ? revenue / completedOrders.length 
        : 0;
      setAvgPricePerHour(avgPricePerOrder);

      // Platform revenue (30% + $0.30 per order)
      const calculatedPlatformRevenue = completedOrders.reduce((sum, o) => 
        sum + ((o.total_amount || 0) * 0.30) + 0.30, 0
      );
      setPlatformRevenue(calculatedPlatformRevenue);

      // Maker profits (70% - $0.30 per order)
      const calculatedMakerProfits = completedOrders.reduce((sum, o) => 
        sum + ((o.total_amount || 0) * 0.70) - 0.30, 0
      );
      setMakerProfits(calculatedMakerProfits);

      // The useEffect hook with [orders, ordersTimeRange, profitTimeRange] dependencies
      // will trigger generateOrdersChart and generateProfitChart after setOrders(allOrders).
      
    } catch (error) {
      console.error("Failed to load financial data:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    }
    setLoading(false);
  };

  const getTimeRangeDate = (range) => {
    const now = new Date();
    const startDate = new Date();
    
    switch(range) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'alltime':
        return null; // No filter for all time
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return startDate;
  };

  const generateOrdersChart = () => {
    const startDate = getTimeRangeDate(ordersTimeRange);
    const now = new Date();
    
    const filteredOrders = startDate 
      ? orders.filter(o => {
          const orderDate = new Date(o.created_date);
          return orderDate >= startDate && orderDate <= now;
        })
      : orders;

    // Group orders by date
    const groupedData = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groupedData[date]) {
        groupedData[date] = 0;
      }
      groupedData[date]++;
    });

    const chartData = Object.entries(groupedData)
      .map(([date, count]) => ({ date, orders: count }))
      .sort((a, b) => {
        const dateA = new Date(a.date + ', 2024');
        const dateB = new Date(b.date + ', 2024');
        return dateA - dateB;
      });

    setOrdersChartData(chartData);
  };

  const generateProfitChart = () => {
    const startDate = getTimeRangeDate(profitTimeRange);
    const now = new Date();
    
    const filteredOrders = startDate 
      ? orders.filter(o => {
          const orderDate = new Date(o.created_date);
          return orderDate >= startDate && orderDate <= now && o.payment_status === 'paid';
        })
      : orders.filter(o => o.payment_status === 'paid');

    // Group profit by date
    const groupedData = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groupedData[date]) {
        groupedData[date] = 0;
      }
      groupedData[date] += (order.total_amount || 0);
    });

    const chartData = Object.entries(groupedData)
      .map(([date, profit]) => ({ date, profit: parseFloat(profit.toFixed(2)) }))
      .sort((a, b) => {
        const dateA = new Date(a.date + ', 2024');
        const dateB = new Date(b.date + ', 2024');
        return dateA - dateB;
      });

    setProfitChartData(chartData);
  };

  const getStatusBadge = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      completed: 'bg-green-100 text-green-800', // Added for visibility
      delivered: 'bg-green-100 text-green-800', // Added for visibility
      dropped_off: 'bg-green-100 text-green-800' // Added for visibility
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From all completed paid orders</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              Avg Price/Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">${avgPricePerHour.toFixed(2)}</p>
            <p className="text-sm text-slate-400">Per completed order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${platformRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">30% + $0.30 per completed order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maker Profits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${makerProfits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">70% - $0.30 per completed order</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Over Time Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Orders Placed Over Time</CardTitle>
            <Tabs value={ordersTimeRange} onValueChange={setOrdersTimeRange}>
              <TabsList>
                <TabsTrigger value="day">Last Day</TabsTrigger>
                <TabsTrigger value="week">Last Week</TabsTrigger>
                <TabsTrigger value="30days">30 Days</TabsTrigger>
                <TabsTrigger value="90days">90 Days</TabsTrigger>
                <TabsTrigger value="alltime">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="orders" stroke="#14b8a6" name="Orders" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit Over Time Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Profit Over Time</CardTitle>
            <Tabs value={profitTimeRange} onValueChange={setProfitTimeRange}>
              <TabsList>
                <TabsTrigger value="day">Last Day</TabsTrigger>
                <TabsTrigger value="week">Last Week</TabsTrigger>
                <TabsTrigger value="30days">30 Days</TabsTrigger>
                <TabsTrigger value="90days">90 Days</TabsTrigger>
                <TabsTrigger value="alltime">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit ($)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orders
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .slice(0, 20)
              .map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-semibold">Order #{order.id.slice(-8)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${order.total_amount?.toFixed(2)}</p>
                    <Badge className={getStatusBadge(order.payment_status)}>
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
