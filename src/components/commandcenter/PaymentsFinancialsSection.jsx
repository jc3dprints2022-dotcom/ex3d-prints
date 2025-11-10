
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, Clock } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PaymentsFinancialsSection() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ordersTimeRange, setOrdersTimeRange] = useState('week');
  const [profitTimeRange, setProfitTimeRange] = useState('week');
  const [ordersChartData, setOrdersChartData] = useState([]);
  const [profitChartData, setProfitChartData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgPricePerHour, setAvgPricePerHour] = useState(0);
  const [avgPricePerListing, setAvgPricePerListing] = useState(0); // This state will now hold Platform Revenue
  const [makerProfit, setMakerProfit] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      generateOrdersChart();
      generateProfitChart();
    }
  }, [orders, ordersTimeRange, profitTimeRange]);

  const loadData = async () => {
    try {
      const [allOrders, allProducts] = await Promise.all([
        base44.entities.Order.list(),
        base44.entities.Product.list()
      ]);
      
      setOrders(allOrders);
      setProducts(allProducts);

      // Calculate total revenue from all paid orders
      const revenue = allOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      setTotalRevenue(revenue);

      // Calculate maker profit (70% of paid orders)
      const profit = allOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + ((o.total_amount || 0) * 0.7), 0);
      
      setMakerProfit(profit);

      // Calculate platform revenue (30% of paid orders)
      const platformRevenue = allOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + ((o.total_amount || 0) * 0.3), 0);
      setAvgPricePerListing(platformRevenue); // Reusing this state variable for platform revenue

      // Calculate average price per hour
      let totalHours = 0;
      let totalPrice = 0;
      allOrders.filter(o => o.payment_status === 'paid').forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            totalHours += (item.print_time_hours || 0) * (item.quantity || 1);
            totalPrice += item.total_price || 0;
          });
        }
      });
      setAvgPricePerHour(totalHours > 0 ? totalPrice / totalHours : 0);

    } catch (error) {
      console.error("Failed to load data:", error);
    }
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
      refunded: 'bg-gray-100 text-gray-800'
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
            <p className="text-xs text-muted-foreground mt-1">From all paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price/Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPricePerHour.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per print hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPricePerListing.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">30% of total revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maker Profits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${makerProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">70% of revenue</p>
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
