import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Package, Truck } from 'lucide-react';

export default function FinancialsTab({ orders, users, subscriptions, products, shippingKitOrders, auditLogs }) {
  // Calculate subscription revenue
  const monthlySubscriptions = subscriptions.filter(s => s.billing_cycle === 'monthly' && s.status === 'active');
  const annualSubscriptions = subscriptions.filter(s => s.billing_cycle === 'annual' && s.status === 'active');
  
  const monthlyRevenue = monthlySubscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
  const annualRevenue = annualSubscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalSubscriptionRevenue = monthlyRevenue + annualRevenue;

  // Calculate order-based revenue
  const completedOrders = orders.filter(o => ['completed', 'delivered', 'shipped'].includes(o.status));
  const totalOrderRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  
  // Calculate platform profit (20% of orders)
  const platformProfit = totalOrderRevenue * 0.20;
  
  // Calculate payouts
  const totalPaidToMakers = totalOrderRevenue * 0.50; // 50% to makers
  const totalPaidToDesigners = totalOrderRevenue * 0.10; // 10% to designers on physical prints
  
  // Calculate shipping kit revenue
  const shippingKitRevenue = shippingKitOrders.reduce((sum, kit) => sum + (kit.cost || 0), 0);
  
  // Calculate shipping label revenue
  const shippingLabelRevenue = auditLogs
    .filter(log => log.event_type === 'shipping_label_purchase')
    .reduce((sum, log) => sum + (log.details?.cost || 0), 0);
  
  // Total revenue = subscriptions + platform cut from orders + shipping kits + shipping labels
  const totalRevenue = totalSubscriptionRevenue + platformProfit + shippingKitRevenue + shippingLabelRevenue;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">${platformProfit.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Profit from Sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'active').length}</p>
            <p className="text-sm text-gray-600">Active Subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Package className="w-8 h-8 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
            <p className="text-sm text-gray-600">Completed Orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Subscription Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="font-medium text-gray-900">Monthly Subscriptions</span>
              <span className="text-lg font-bold text-gray-900">${monthlyRevenue.toFixed(2)}/mo</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
              <span className="font-medium text-gray-900">Annual Subscriptions</span>
              <span className="text-lg font-bold text-gray-900">${annualRevenue.toFixed(2)}/yr</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded border-2 border-green-200">
              <span className="font-semibold text-gray-900">Total Subscription Revenue</span>
              <span className="text-xl font-bold text-green-700">${totalSubscriptionRevenue.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {monthlySubscriptions.length} monthly + {annualSubscriptions.length} annual subscriptions
            </p>
          </CardContent>
        </Card>

        {/* Order Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Order Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="font-medium text-gray-900">Total Order Value</span>
              <span className="text-lg font-bold text-gray-900">${totalOrderRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-medium text-gray-900">Platform Cut (20%)</span>
              <span className="text-lg font-bold text-green-700">${platformProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span className="font-medium text-gray-900">Paid to Makers (50%)</span>
              <span className="text-lg font-bold text-orange-700">${totalPaidToMakers.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-pink-50 rounded">
              <span className="font-medium text-gray-900">Paid to Designers (10%)</span>
              <span className="text-lg font-bold text-pink-700">${totalPaidToDesigners.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Revenue Streams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping Services Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-teal-50 rounded">
              <span className="font-medium text-gray-900">Shipping Kits Sold</span>
              <span className="text-lg font-bold text-teal-700">${shippingKitRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-cyan-50 rounded">
              <span className="font-medium text-gray-900">Shipping Labels</span>
              <span className="text-lg font-bold text-cyan-700">${shippingLabelRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
              <span className="font-semibold text-gray-900">Total Shipping Revenue</span>
              <span className="text-xl font-bold text-blue-700">${(shippingKitRevenue + shippingLabelRevenue).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subscriptions</span>
              <span className="font-bold text-gray-900">{((totalSubscriptionRevenue / totalRevenue) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Order Fees</span>
              <span className="font-bold text-gray-900">{((platformProfit / totalRevenue) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Shipping Services</span>
              <span className="font-bold text-gray-900">{(((shippingKitRevenue + shippingLabelRevenue) / totalRevenue) * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <span className="text-lg font-semibold text-gray-900">Total Platform Revenue</span>
            <span className="text-2xl font-bold text-green-700">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-blue-50 rounded text-center">
              <p className="text-sm text-gray-600">From Subscriptions</p>
              <p className="text-xl font-bold text-blue-700">${totalSubscriptionRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded text-center">
              <p className="text-sm text-gray-600">From Order Fees</p>
              <p className="text-xl font-bold text-green-700">${platformProfit.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-teal-50 rounded text-center">
              <p className="text-sm text-gray-600">From Shipping Kits</p>
              <p className="text-xl font-bold text-teal-700">${shippingKitRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-cyan-50 rounded text-center">
              <p className="text-sm text-gray-600">From Labels</p>
              <p className="text-xl font-bold text-cyan-700">${shippingLabelRevenue.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}