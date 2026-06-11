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
    <Alert>
      <Shield className="w-4 h-4" />
      <AlertDescription className="text-gray-900">
        Please expect an email from us with information to setup a payment account to receive payouts and make payments.
      </AlertDescription>
    </Alert>
  );
}