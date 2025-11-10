import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Users, TrendingUp, Palette, DollarSign, Check, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RoleBundling({ user, onUpdate }) {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [designerInfo, setDesignerInfo] = useState({ designer_name: '', bio: '' });
  const [affiliateInfo, setAffiliateInfo] = useState({ promotion_channels: '' });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const currentRoles = user?.business_roles || ['consumer'];
  const hasMaker = currentRoles.includes('maker');
  const hasDesigner = currentRoles.includes('designer');
  const hasAffiliate = currentRoles.includes('affiliate');

  const availableRoles = [
    {
      id: 'designer',
      icon: Palette,
      name: 'Designer',
      description: 'Upload and sell your 3D designs',
      color: 'pink',
      available: !hasDesigner && hasMaker,
      benefits: ['10% royalty per sale', '5 free listings', 'No application required']
    },
    {
      id: 'affiliate',
      icon: TrendingUp,
      name: 'Affiliate',
      description: 'Earn commissions by referring users',
      color: 'green',
      available: !hasAffiliate && hasMaker,
      benefits: ['$25 per maker referral', '$15 per designer referral', '10% of customer first orders']
    }
  ];

  const roleColorClass = (color) => {
    const colors = {
      pink: 'bg-pink-50 border-pink-200',
      green: 'bg-green-50 border-green-200',
    };
    return colors[color] || 'bg-gray-50';
  };

  const calculatePrice = () => {
    if (selectedRoles.length === 0) return 0;
    if (selectedRoles.length === 1) return 10;
    // Bundle discount: 2 roles for the price of 1
    return 10;
  };

  const handleToggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (selectedRoles.length === 0) {
      toast({ title: "Please select at least one role", variant: "destructive" });
      return;
    }

    // Validate required info
    if (selectedRoles.includes('designer') && (!designerInfo.designer_name || !designerInfo.bio)) {
      toast({ title: "Please fill in designer information", variant: "destructive" });
      return;
    }

    if (selectedRoles.includes('affiliate') && !affiliateInfo.promotion_channels) {
      toast({ title: "Please describe how you'll promote EX3D", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const updateData = {
        business_roles: [...new Set([...currentRoles, ...selectedRoles])],
        has_bundle_discount: selectedRoles.length > 1
      };

      // Add role-specific IDs and data
      if (selectedRoles.includes('designer')) {
        updateData.designer_id = `designer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        updateData.designer_name = designerInfo.designer_name;
        updateData.bio = designerInfo.bio;
        updateData.free_listings_used = 0;
      }

      if (selectedRoles.includes('affiliate')) {
        updateData.affiliate_id = `affiliate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        updateData.promotion_channels = affiliateInfo.promotion_channels;
        updateData.referral_code = Math.random().toString(36).substring(2, 10).toUpperCase();
        updateData.affiliate_stats = {
          clicks: 0,
          signups: 0,
          conversions: 0,
          earnings: 0,
          pending_payout: 0
        };
      }

      await base44.auth.updateMe(updateData);

      toast({ 
        title: "Roles added successfully!", 
        description: selectedRoles.length > 1 ? "Bundle discount applied!" : "Your new role is now active."
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Failed to add roles", description: error.message, variant: "destructive" });
    }
    setProcessing(false);
  };

  const displayedRoles = availableRoles.filter(r => r.available);

  if (displayedRoles.length === 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Check className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          You have all available roles! Keep up the great work.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Users className="w-5 h-5 text-purple-500" />
          Add More Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-purple-200 bg-purple-50">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-gray-900">
            <strong>Bundle Discount:</strong> Add multiple roles for just $10/month total (normally $10 each)!
          </AlertDescription>
        </Alert>

        {/* Role Selection */}
        <div className="space-y-4">
          {displayedRoles.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRoles.includes(role.id);
            
            return (
              <div key={role.id} className={`border-2 rounded-lg p-4 transition-all ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'} ${roleColorClass(role.color)}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={role.id}
                    checked={isSelected}
                    onCheckedChange={() => handleToggleRole(role.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={role.id} className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-5 h-5 text-${role.color}-600`} />
                        <span className="font-semibold text-gray-900">{role.name}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{role.description}</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {role.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-600" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </Label>
                  </div>
                </div>

                {/* Role-Specific Forms */}
                {isSelected && role.id === 'designer' && (
                  <div className="mt-4 space-y-3 pl-8">
                    <div>
                      <Label htmlFor="designer_name" className="text-gray-900">Designer Name *</Label>
                      <Input
                        id="designer_name"
                        value={designerInfo.designer_name}
                        onChange={(e) => setDesignerInfo({...designerInfo, designer_name: e.target.value})}
                        placeholder="Your creative name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio" className="text-gray-900">Bio *</Label>
                      <Textarea
                        id="bio"
                        value={designerInfo.bio}
                        onChange={(e) => setDesignerInfo({...designerInfo, bio: e.target.value})}
                        placeholder="Tell us about your design style and experience..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {isSelected && role.id === 'affiliate' && (
                  <div className="mt-4 pl-8">
                    <Label htmlFor="channels" className="text-gray-900">How will you promote EX3D? *</Label>
                    <Textarea
                      id="channels"
                      value={affiliateInfo.promotion_channels}
                      onChange={(e) => setAffiliateInfo({...affiliateInfo, promotion_channels: e.target.value})}
                      placeholder="e.g., YouTube channel, Instagram, blog, word of mouth..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pricing Summary */}
        {selectedRoles.length > 0 && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 font-semibold">Selected Roles:</span>
              <span className="text-gray-900">
                {selectedRoles.map(r => displayedRoles.find(role => role.id === r)?.name).join(' + ')}
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-900 font-semibold">Monthly Cost:</span>
              <div className="text-right">
                {selectedRoles.length > 1 && (
                  <span className="text-sm text-gray-600 line-through mr-2">${selectedRoles.length * 10}</span>
                )}
                <span className="text-2xl font-bold text-purple-600">${calculatePrice()}/month</span>
              </div>
            </div>
            {selectedRoles.length > 1 && (
              <p className="text-sm text-purple-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                You're saving ${(selectedRoles.length * 10) - calculatePrice()}/month with the bundle discount!
              </p>
            )}
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={processing || selectedRoles.length === 0}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Add Roles - ${calculatePrice()}/month
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}