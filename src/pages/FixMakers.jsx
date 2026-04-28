import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Wrench } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function FixMakers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const users = await base44.entities.User.list();
      setAllUsers(users);
      
      const allPrinters = await base44.entities.Printer.list();
      setPrinters(allPrinters);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const fixMyBusinessRoles = async () => {
    setFixing('self');
    try {
      // Get current roles, ensure it's an array, add 'maker' if needed
      const currentRoles = Array.isArray(currentUser.business_roles) 
        ? currentUser.business_roles 
        : (currentUser.business_roles ? [currentUser.business_roles] : ['consumer']);
      
      const newRoles = currentRoles.includes('maker') ? currentRoles : [...currentRoles, 'maker'];
      
      await base44.auth.updateMe({
        business_roles: newRoles
      });
      
      toast({ title: "Success!", description: "Your business_roles has been updated to include 'maker'" });
      loadData();
    } catch (error) {
      console.error('Error fixing roles:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setFixing(null);
  };

  const checkMakerStatus = (user) => {
    const roles = Array.isArray(user.business_roles) ? user.business_roles : [];
    
    return {
      hasMakerId: !!user.maker_id,
      hasBusinessRolesArray: Array.isArray(user.business_roles),
      hasMakerInRoles: roles.includes('maker'),
      hasCompleteAddress: !!(user.address && user.address.street && user.address.city && user.address.state && user.address.zip),
      hasActivePrinters: printers.some(p => p.maker_id === user.maker_id && p.status === 'active'),
      currentRolesValue: user.business_roles
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const makersWithIssues = allUsers.filter(u => u.maker_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Maker Diagnostics & Fix Tool</h1>
          <p className="text-slate-600 mt-2">Diagnose and fix maker account issues</p>
        </div>

        {/* Current User Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p><strong>Name:</strong> {currentUser.full_name}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Maker ID:</strong> {currentUser.maker_id || 'None'}</p>
              <div>
                <strong>Business Roles:</strong>
                <div className="mt-2">
                  <code className="bg-gray-100 px-3 py-2 rounded block">
                    {JSON.stringify(currentUser.business_roles)}
                  </code>
                  <p className="text-sm text-gray-600 mt-2">
                    Type: {Array.isArray(currentUser.business_roles) ? 'Array ✓' : `${typeof currentUser.business_roles} ✗`}
                  </p>
                </div>
              </div>

              {currentUser.maker_id && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Action Required
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Your account needs business_roles to be an array containing 'maker' to receive orders.
                  </p>
                  <Button 
                    onClick={fixMyBusinessRoles}
                    disabled={fixing === 'self'}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {fixing === 'self' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4 mr-2" />
                        Fix My Business Roles Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Makers Status */}
        <Card>
          <CardHeader>
            <CardTitle>All Makers in System ({makersWithIssues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {makersWithIssues.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No maker accounts found</p>
            ) : (
              <div className="space-y-4">
                {makersWithIssues.map(maker => {
                  const status = checkMakerStatus(maker);
                  const isEligible = status.hasMakerId && status.hasBusinessRolesArray && 
                                    status.hasMakerInRoles && status.hasCompleteAddress && 
                                    status.hasActivePrinters;

                  return (
                    <div 
                      key={maker.id} 
                      className={`border rounded-lg p-4 ${isEligible ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{maker.full_name}</h4>
                          <p className="text-sm text-gray-600">{maker.email}</p>
                          <Badge className="mt-2">{maker.maker_id}</Badge>
                        </div>
                        <Badge className={isEligible ? 'bg-green-600' : 'bg-red-600'}>
                          {isEligible ? 'ELIGIBLE FOR ORDERS' : 'NOT ELIGIBLE'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {status.hasMakerId ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">Has maker_id: {status.hasMakerId ? 'YES' : 'NO'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status.hasBusinessRolesArray ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">
                            business_roles is Array: {status.hasBusinessRolesArray ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status.hasMakerInRoles ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">
                            'maker' in business_roles: {status.hasMakerInRoles ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status.hasCompleteAddress ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">Complete address: {status.hasCompleteAddress ? 'YES' : 'NO'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {status.hasActivePrinters ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm">
                            Active printers: {status.hasActivePrinters ? 'YES' : 'NO'} 
                            ({printers.filter(p => p.maker_id === maker.maker_id && p.status === 'active').length})
                          </span>
                        </div>

                        <div className="mt-3 p-3 bg-gray-100 rounded">
                          <p className="text-xs font-semibold mb-1">Current business_roles value:</p>
                          <code className="text-xs">{JSON.stringify(status.currentRolesValue)}</code>
                        </div>

                        {maker.id === currentUser.id && !isEligible && (
                          <div className="mt-4">
                            <Button 
                              onClick={fixMyBusinessRoles}
                              disabled={fixing === 'self'}
                              size="sm"
                              variant="outline"
                            >
                              {fixing === 'self' ? 'Fixing...' : 'Fix Now'}
                            </Button>
                          </div>
                        )}

                        {maker.id !== currentUser.id && !isEligible && (
                          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                            <strong>Fix required:</strong> This user needs to log in and visit the "/FixMakers" page to fix their business_roles.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
