
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Printer } from '@/entities/Printer';
import { Order } from '@/entities/Order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Printer as PrinterIcon, Package, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function SystemDebug() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const users = await User.list();
      setAllUsers(users);
      
      const allPrinters = await Printer.list();
      setPrinters(allPrinters);
      
      const allOrders = await Order.list();
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading debug data:', error);
    }
    setLoading(false);
  };

  const fixMakerRole = async (userId, makerId) => {
    try {
      // This will only work if you're logged in as that user
      // Assume we are setting business_roles to only 'maker' for this fix operation.
      // In a real scenario, you might merge or provide an explicit UI for multi-role editing.
      await User.updateMyUserData({
        business_roles: ['maker']
      });
      toast({ title: "Success!", description: "Business role updated to 'maker'" });
      loadDebugData();
    } catch (error) {
      toast({ 
        title: "Cannot update", 
        description: "You can only update your own user data. Log in as that maker to fix this.",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Filters for different user types, adapted for business_roles array
  const makers = allUsers.filter(u => u.maker_id);
  const designers = allUsers.filter(u => u.business_roles?.includes('designer') && u.designer_id);
  const consumers = allUsers.filter(u => !u.business_roles?.includes('maker') && !u.business_roles?.includes('designer'));

  const checkMakerEligibility = (user) => {
    const roles = user.business_roles || [];
    const checks = {
      hasMakerId: !!user.maker_id,
      hasBusinessRole: roles.includes('maker'),
      hasCompleteAddress: !!(user.address && user.address.street && user.address.city && user.address.state && user.address.zip),
      hasPrinters: printers.some(p => p.maker_id === user.maker_id && p.status === 'active')
    };
    
    const eligible = checks.hasMakerId && checks.hasBusinessRole && checks.hasCompleteAddress && checks.hasPrinters;
    
    return { ...checks, eligible };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">System Debug Panel</h1>
          <p className="text-slate-600 mt-2">View all system data and diagnose order assignment issues</p>
        </div>

        {/* Current User */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>ID:</strong> {currentUser?.id}</p>
              <p><strong>Email:</strong> {currentUser?.email}</p>
              <p><strong>Name:</strong> {currentUser?.full_name}</p>
              <p><strong>Business Roles:</strong> {currentUser?.business_roles?.length > 0 ? currentUser.business_roles.join(', ') : 'consumer'}</p>
              {currentUser?.maker_id && <p><strong>Maker ID:</strong> {currentUser.maker_id}</p>}
              {currentUser?.designer_id && <p><strong>Designer ID:</strong> {currentUser.designer_id}</p>}
              {currentUser?.address && (
                <div>
                  <strong>Address:</strong>
                  <div className="ml-4 text-sm text-gray-600">
                    {currentUser.address.street}<br/>
                    {currentUser.address.city}, {currentUser.address.state} {currentUser.address.zip}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Makers</p>
                  <p className="text-2xl font-bold">{makers.length}</p>
                </div>
                <PrinterIcon className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Printers</p>
                  <p className="text-2xl font-bold">{printers.length}</p>
                </div>
                <PrinterIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Makers List with Eligibility Check */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PrinterIcon className="w-5 h-5" />
              Registered Makers - Eligibility Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {makers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Makers Registered</h3>
                <p className="text-slate-600">
                  To test order assignment, you need to register at least one maker account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {makers.map(maker => {
                  const eligibility = checkMakerEligibility(maker);
                  return (
                    <div key={maker.id} className={`border rounded-lg p-4 ${eligibility.eligible ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{maker.full_name}</h4>
                          <p className="text-sm text-gray-600">{maker.email}</p>
                          <Badge className="mt-1">{maker.maker_id}</Badge>
                        </div>
                        <Badge className={eligibility.eligible ? 'bg-green-600' : 'bg-red-600'}>
                          {eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                        </Badge>
                      </div>

                      {/* Eligibility Checklist */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          {eligibility.hasMakerId ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">Has maker_id: {maker.maker_id || 'NO'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {eligibility.hasBusinessRole ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">
                            Has 'maker' in business_roles: {eligibility.hasBusinessRole ? 'YES' : 'NO'}
                            {maker.business_roles && (
                              <span className="text-gray-600"> (roles: {maker.business_roles.join(', ')})</span>
                            )}
                            {!eligibility.hasBusinessRole && (
                              <strong className="text-red-600"> ← FIX THIS</strong>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {eligibility.hasCompleteAddress ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">Complete address: {eligibility.hasCompleteAddress ? 'YES' : 'NO'}</span>
                        </div>
                        {maker.address && eligibility.hasCompleteAddress && (
                          <div className="ml-7 text-xs text-gray-600">
                            {maker.address.street}, {maker.address.city}, {maker.address.state} {maker.address.zip}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {eligibility.hasPrinters ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">
                            Active printers: {printers.filter(p => p.maker_id === maker.maker_id && p.status === 'active').length}
                          </span>
                        </div>
                      </div>

                      {!eligibility.eligible && (
                        <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-sm">
                          <strong className="text-yellow-800">How to fix:</strong>
                          <ul className="list-disc ml-5 mt-1 text-yellow-800">
                            {!eligibility.hasBusinessRole && (
                              <li>
                                {currentUser?.id === maker.id ? (
                                  <>You need to set business_roles to include 'maker'. <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => fixMakerRole(maker.id, maker.maker_id)}>Fix Now</Button></>
                                ) : (
                                  <>Log in as this maker and go to Dashboard → Settings to add 'maker' to your business roles.</>
                                )}
                              </li>
                            )}
                            {!eligibility.hasCompleteAddress && (
                              <li>Complete your address in Maker Settings</li>
                            )}
                            {!eligibility.hasPrinters && (
                              <li>Add at least one active printer in Maker Dashboard</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 10).map(order => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Order #{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">Total: ${order.total_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Customer: {order.customer_id}</p>
                        {order.maker_id ? (
                          <p className="text-sm text-green-600">✓ Assigned to: {order.maker_id}</p>
                        ) : (
                          <p className="text-sm text-yellow-600">⚠️ Not assigned yet</p>
                        )}
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
