import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Building2, CreditCard, CheckCircle, Loader2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BankInfoManager({ user, onUpdate }) {
  const [paymentMethod, setPaymentMethod] = useState(user?.payment_method || 'bank_account');
  const [bankInfo, setBankInfo] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    account_number_confirm: '',
    routing_number: '',
    account_type: 'checking'
  });
  const [paypalEmail, setPaypalEmail] = useState(user?.paypal_email || '');
  const [saving, setSaving] = useState(false);
  const [showAccountNumbers, setShowAccountNumbers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.bank_account_info) {
      setBankInfo(prev => ({
        ...prev,
        account_holder_name: user.bank_account_info.account_holder_name || '',
        bank_name: user.bank_account_info.bank_name || '',
        routing_number: user.bank_account_info.routing_number || '',
        account_type: user.bank_account_info.account_type || 'checking'
      }));
    }
    if (user?.payment_method) {
      setPaymentMethod(user.payment_method);
    }
    if (user?.paypal_email) {
      setPaypalEmail(user.paypal_email);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        payment_method: paymentMethod
      };

      if (paymentMethod === 'bank_account') {
        if (!bankInfo.account_holder_name || !bankInfo.bank_name || !bankInfo.account_number || !bankInfo.routing_number) {
          toast({ title: "Please fill in all bank account fields", variant: "destructive" });
          setSaving(false);
          return;
        }
        
        if (bankInfo.account_number !== bankInfo.account_number_confirm) {
          toast({ title: "Account numbers don't match", variant: "destructive" });
          setSaving(false);
          return;
        }

        updateData.bank_account_info = {
          account_holder_name: bankInfo.account_holder_name,
          bank_name: bankInfo.bank_name,
          account_number_last4: bankInfo.account_number.slice(-4),
          routing_number: bankInfo.routing_number,
          account_type: bankInfo.account_type,
          verified: false
        };
      } else if (paymentMethod === 'paypal') {
        if (!paypalEmail) {
          toast({ title: "Please enter your PayPal email", variant: "destructive" });
          setSaving(false);
          return;
        }
        updateData.paypal_email = paypalEmail;
      }
      
      await base44.auth.updateMe(updateData);
      toast({ title: "Payment information saved!", description: "Your payout method has been updated successfully." });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      toast({ title: "Failed to save payment info", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <CreditCard className="w-5 h-5" />
          Payment Account Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="w-4 h-4" />
          <AlertDescription className="text-gray-900">
            Please expect an email from us with information to setup a payment account.
          </AlertDescription>
        </Alert>

        <div>
          <Label className="text-gray-900 mb-3 block">Payout Method</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="bank_account" id="bank" />
              <Label htmlFor="bank" className="cursor-pointer text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Direct Deposit (Bank Account) - Recommended
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="cursor-pointer text-gray-900">
                PayPal
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {paymentMethod === 'bank_account' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Bank Account Information</h3>
            
            {user?.bank_account_info?.verified && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Bank account verified: {user.bank_account_info.bank_name} ••••{user.bank_account_info.account_number_last4}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_holder" className="text-gray-900">Account Holder Name *</Label>
                <Input
                  id="account_holder"
                  value={bankInfo.account_holder_name}
                  onChange={(e) => setBankInfo({...bankInfo, account_holder_name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="bank_name" className="text-gray-900">Bank Name *</Label>
                <Input
                  id="bank_name"
                  value={bankInfo.bank_name}
                  onChange={(e) => setBankInfo({...bankInfo, bank_name: e.target.value})}
                  placeholder="Chase, Bank of America, etc."
                />
              </div>

              <div>
                <Label htmlFor="routing" className="text-gray-900">Routing Number *</Label>
                <Input
                  id="routing"
                  value={bankInfo.routing_number}
                  onChange={(e) => setBankInfo({...bankInfo, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                  placeholder="9 digits"
                  maxLength={9}
                />
              </div>

              <div>
                <Label htmlFor="account_type" className="text-gray-900">Account Type *</Label>
                <Select value={bankInfo.account_type} onValueChange={(v) => setBankInfo({...bankInfo, account_type: v})}>
                  <SelectTrigger id="account_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_number" className="text-gray-900">Account Number *</Label>
                <Input
                  id="account_number"
                  type={showAccountNumbers ? "text" : "password"}
                  value={bankInfo.account_number}
                  onChange={(e) => setBankInfo({...bankInfo, account_number: e.target.value.replace(/\D/g, '')})}
                  placeholder="Account number"
                />
              </div>

              <div>
                <Label htmlFor="account_confirm" className="text-gray-900">Confirm Account Number *</Label>
                <Input
                  id="account_confirm"
                  type={showAccountNumbers ? "text" : "password"}
                  value={bankInfo.account_number_confirm}
                  onChange={(e) => setBankInfo({...bankInfo, account_number_confirm: e.target.value.replace(/\D/g, '')})}
                  placeholder="Re-enter account number"
                />
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAccountNumbers(!showAccountNumbers)}
              className="text-gray-700"
            >
              {showAccountNumbers ? "Hide" : "Show"} Account Numbers
            </Button>

            <p className="text-sm text-gray-600">
              * We securely store only the last 4 digits of your account number for verification. 
              Full account details are encrypted and only used for initiating payouts.
            </p>
          </div>
        )}

        {paymentMethod === 'paypal' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">PayPal Information</h3>
            
            <div>
              <Label htmlFor="paypal_email" className="text-gray-900">PayPal Email Address *</Label>
              <Input
                id="paypal_email"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-sm text-gray-600 mt-2">
                Enter the email address associated with your PayPal account. Payouts will be sent to this address.
              </p>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Payment Information
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}