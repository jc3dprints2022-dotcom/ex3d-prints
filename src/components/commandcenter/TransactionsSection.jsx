import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, DollarSign, CheckCircle, XCircle, Clock, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TransactionsSection() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stripeFilter, setStripeFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [orders, searchQuery, statusFilter, stripeFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const allOrders = await base44.entities.Order.list('-created_date', 100);
      setOrders(allOrders);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast({ 
        title: "Failed to load transactions", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    setLoading(false);
  };

  const filterTransactions = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.id?.toLowerCase().includes(query) ||
        order.customer_id?.toLowerCase().includes(query) ||
        order.stripe_payment_intent_id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Stripe filter
    if (stripeFilter === "with_stripe") {
      filtered = filtered.filter(order => order.stripe_payment_intent_id);
    } else if (stripeFilter === "without_stripe") {
      filtered = filtered.filter(order => !order.stripe_payment_intent_id);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
      accepted: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
      printing: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Clock },
      completed: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
      delivered: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
      cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
      unassigned: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getStripeBadge = (order) => {
    if (!order.stripe_payment_intent_id) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 border">
          No Stripe
        </Badge>
      );
    }

    // If order is completed/delivered, payment was successful
    if (['completed', 'delivered', 'dropped_off'].includes(order.status)) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Stripe Success
        </Badge>
      );
    }

    // If cancelled, payment might have failed or been refunded
    if (order.status === 'cancelled') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    }

    // Otherwise, payment is pending
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Stripe Pending
      </Badge>
    );
  };

  const calculateStats = () => {
    const withStripe = orders.filter(o => o.stripe_payment_intent_id).length;
    const successful = orders.filter(o => 
      o.stripe_payment_intent_id && ['completed', 'delivered', 'dropped_off'].includes(o.status)
    ).length;
    const totalRevenue = orders
      .filter(o => ['completed', 'delivered', 'dropped_off'].includes(o.status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return { withStripe, successful, totalRevenue };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Transactions</h2>
          <p className="text-cyan-400">Monitor payment processing and Stripe integration</p>
        </div>
        <Button 
          onClick={loadTransactions} 
          disabled={loading}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-cyan-500/30">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-white">
              ${stats.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-cyan-400">Total Revenue (Completed)</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-cyan-500/30">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-white">{stats.withStripe}</p>
            <p className="text-sm text-cyan-400">Transactions with Stripe</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-cyan-500/30">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-white">{stats.successful}</p>
            <p className="text-sm text-cyan-400">Successful Payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <Input
                placeholder="Search by Order ID, Customer ID, or Payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-cyan-500/30 text-white placeholder:text-slate-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-900 border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-cyan-500/30">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stripeFilter} onValueChange={setStripeFilter}>
              <SelectTrigger className="bg-slate-900 border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-cyan-500/30">
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="with_stripe">With Stripe</SelectItem>
                <SelectItem value="without_stripe">Without Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-400">
            Recent Transactions ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-cyan-400">Order ID</TableHead>
                  <TableHead className="text-cyan-400">Date</TableHead>
                  <TableHead className="text-cyan-400">Amount</TableHead>
                  <TableHead className="text-cyan-400">Status</TableHead>
                  <TableHead className="text-cyan-400">Stripe Status</TableHead>
                  <TableHead className="text-cyan-400">Payment ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-slate-700">
                    <TableCell className="text-white font-mono text-sm">
                      #{order.id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {new Date(order.created_date).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-white font-semibold">
                      ${order.total_amount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getStripeBadge(order)}
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-xs">
                      {order.stripe_payment_intent_id ? (
                        <span className="truncate block max-w-[200px]" title={order.stripe_payment_intent_id}>
                          {order.stripe_payment_intent_id}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400">No transactions found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}