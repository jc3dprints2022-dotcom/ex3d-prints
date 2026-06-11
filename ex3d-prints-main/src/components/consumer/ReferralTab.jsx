
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Users, Copy, Check, Gift, TrendingUp, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ReferralTab({ user, onUpdate }) {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralTransactions, setReferralTransactions] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      if (user.referral_code) {
        setReferralCode(user.referral_code);
      } else {
        const { data } = await base44.functions.invoke('generateReferralCode');
        if (data?.success) {
          setReferralCode(data.referral_code);
          await onUpdate();
        }
      }

      const allTransactions = await base44.entities.ExpTransaction.filter({
        user_id: user.id
      });
      const referralTxs = allTransactions.filter(tx => 
        tx.source === 'referral_given' || tx.source === 'referral_received'
      );
      setReferralTransactions(referralTxs);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast({ title: "Failed to load referral data", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: "Referral code copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Referral link copied!" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview - Using inline styles for guaranteed color rendering */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card 
          className="border-0 shadow-lg text-white" 
          style={{ background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)' }}
        >
          <CardContent className="p-6">
            <Users className="w-10 h-10 mb-4" style={{ opacity: 0.8 }} />
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Referrals</p>
            <p className="text-4xl font-bold">{user.referral_count || 0}</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg text-white" 
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
        >
          <CardContent className="p-6">
            <Gift className="w-10 h-10 mb-4" style={{ opacity: 0.8 }} />
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>EXP from Referrals</p>
            <p className="text-4xl font-bold">
              {referralTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg text-white" 
          style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
        >
          <CardContent className="p-6">
            <TrendingUp className="w-10 h-10 mb-4" style={{ opacity: 0.8 }} />
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>Referral Bonus</p>
            <p className="text-4xl font-bold">250 EXP</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Referral Code */}
      <Card className="border-purple-200 shadow-lg">
        <CardHeader style={{ background: 'linear-gradient(to right, #faf5ff, #fce7f3)' }}>
          <CardTitle className="flex items-center gap-2" style={{ color: '#581c87' }}>
            <Users className="w-5 h-5" style={{ color: '#9333ea' }} />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Alert style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
            <Gift className="w-4 h-4" style={{ color: '#9333ea' }} />
            <AlertDescription style={{ color: '#581c87' }}>
              <strong>How it works:</strong> Share your code with friends. When they sign up and make their first purchase, 
              you'll earn <strong>250 EXP</strong> and they'll get <strong>250 EXP</strong>!
            </AlertDescription>
          </Alert>

          <div 
            className="p-6 rounded-lg border-2" 
            style={{ 
              background: 'linear-gradient(135deg, #faf5ff 0%, #fce7f3 100%)',
              borderColor: '#e9d5ff'
            }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: '#581c87' }}>Your Unique Code</p>
            <div className="flex gap-2">
              <div 
                className="flex-1 px-4 py-3 rounded border-2 shadow-sm bg-white" 
                style={{ borderColor: '#d8b4fe' }}
              >
                <p className="text-2xl font-bold font-mono" style={{ color: '#9333ea' }}>
                  {referralCode}
                </p>
              </div>
              <Button 
                onClick={handleCopyCode} 
                size="lg" 
                variant="outline" 
                style={{ borderColor: '#d8b4fe' }}
                className="hover:bg-purple-50"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 mr-2" style={{ color: '#16a34a' }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" style={{ color: '#9333ea' }} />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCopyLink} 
              className="flex-1 shadow-md text-white"
              style={{ background: '#9333ea' }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Referral Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referralTransactions.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader style={{ background: '#f9fafb' }}>
            <CardTitle style={{ color: '#111827' }}>Referral History</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {referralTransactions.map(tx => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ 
                    background: 'linear-gradient(to right, #f0fdf4, #f0fdfa)',
                    borderColor: '#bbf7d0'
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: '#111827' }}>{tx.description}</p>
                    <p className="text-sm" style={{ color: '#6b7280' }}>
                      {new Date(tx.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="shadow-sm text-white" style={{ background: '#10b981' }}>
                    +{tx.amount} EXP
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
