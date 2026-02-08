import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Zap, TrendingUp, Crown, Rocket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SUBSCRIPTION_PLANS = [
  {
    id: 'lite',
    name: 'Lite',
    icon: Zap,
    color: 'blue',
    price: 10,
    priceMonthly: '$10/month',
    priceYearly: '$120/year',
    firstYearOffer: '$100 for first year',
    estimatedProfit: '$100+',
    maxHours: 30,
    printers: 1,
    benefits: [
      'Access to maker platform',
      'Basic order notifications',
      'Community support access'
    ],
    limitations: [
      'Pay for shipping kits ($15/kit for 10 orders)',
      'Purchase your own filament'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: TrendingUp,
    color: 'teal',
    price: 100,
    priceMonthly: '$100/month',
    priceYearly: '$1,200/year',
    firstYearOffer: '$1,000 for first year',
    estimatedProfit: '$1,000+',
    maxHours: 200,
    printers: '2+',
    popular: true,
    benefits: [
      'Priority order assignments',
      'Overtime eligible (200+ hours)',
      '2 FREE shipping kits per month',
      'Priority customer support'
    ],
    limitations: [
      'Purchase your own filament'
    ]
  },
  {
    id: 'express',
    name: 'Express',
    icon: Crown,
    color: 'purple',
    price: 250,
    priceMonthly: '$250/month',
    priceYearly: '$3,000/year',
    estimatedProfit: '$2,000+',
    maxHours: 600,
    printers: '3+',
    benefits: [
      'Highest priority orders',
      'Order filtering & preferences',
      '10% discount on all website items',
      '5 FREE shipping kits per month',
      'Dedicated support line'
    ],
    limitations: []
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    icon: Rocket,
    color: 'orange',
    price: 250,
    priceMonthly: '$250+/month',
    priceYearly: '$2,250+/year',
    estimatedProfit: '$5,000+',
    maxHours: '600+',
    printers: '4+',
    benefits: [
      'Everything in Express',
      '$2/hour over 600 hours',
      '+$1,000/month per additional printer',
      'Custom order routing',
      'Volume discounts on supplies'
    ],
    limitations: []
  }
];

export default function MakerSubscriptionSelect() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if user is exempt from subscription (like jc3dprints2022@gmail.com)
        if (currentUser.email === 'jc3dprints2022@gmail.com' || currentUser.subscription_exempt) {
          // Grant them maker access without subscription
          if (!currentUser.subscription_exempt) {
            await base44.auth.updateMe({ 
              subscription_exempt: true,
              subscription_plan: 'unlimited',
              account_status: 'active'
            });
          }
          window.location.href = createPageUrl("ConsumerDashboard") + "?tab=maker";
          return;
        }

        // If already a maker with subscription, redirect
        if (currentUser.business_roles?.includes('maker') && currentUser.subscription_plan) {
          window.location.href = createPageUrl("ConsumerDashboard") + "?tab=maker";
          return;
        }

        // If not a maker at all, redirect to signup
        if (!currentUser.business_roles?.includes('maker') && !currentUser.maker_application_id) {
          window.location.href = createPageUrl("MakerSignup");
          return;
        }
      } catch (error) {
        await base44.auth.redirectToLogin(window.location.href);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleSelectPlan = async (plan) => {
    setProcessing(true);
    try {
      // Create subscription checkout
      const { data } = await base44.functions.invoke('createMakerSubscriptionCheckout', {
        planId: plan.id,
        billingCycle: billingCycle
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
      toast({ 
        title: "Failed to proceed", 
        description: "Please try again or contact support.",
        variant: "destructive" 
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Maker Plan
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Select the subscription that fits your printing capacity
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const Icon = plan.icon;
            const isUnlimited = plan.id === 'unlimited';
            
            return (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-2xl ${
                  plan.popular ? 'ring-2 ring-teal-600 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-teal-600 text-white px-4 py-1 text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-br from-${plan.color}-50 to-${plan.color}-100 pb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-8 h-8 text-${plan.color}-600`} />
                    <Badge className={`bg-${plan.color}-600`}>{plan.name}</Badge>
                  </div>
                  
                  <CardTitle className="text-3xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  
                  {billingCycle === 'monthly' ? (
                    plan.id === 'lite' ? (
                      <div className="mt-2">
                        <p className="text-lg line-through text-gray-400">$10/month</p>
                        <p className="text-2xl font-bold text-green-600">$0 First Month</p>
                      </div>
                    ) : (
                      <p className="text-lg text-gray-600 mt-2">{plan.priceMonthly}</p>
                    )
                  ) : (
                    <div className="mt-2">
                      <p className="text-lg line-through text-gray-400">
                        ${typeof plan.price === 'number' ? plan.price * 12 : '3000+'}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        ${typeof plan.price === 'number' ? Math.floor(plan.price * 12 * 0.75) : '2250+'}
                        <span className="text-sm font-normal text-gray-600">/year</span>
                      </p>
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        💰 25% off first year
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-6 space-y-2">
                  <div className="text-center py-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600">Est. {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Profit</p>
                    <p className="text-xl font-bold text-green-700">
                      {billingCycle === 'yearly' && typeof plan.price === 'number' && plan.estimatedProfit.includes('$') 
                        ? `$${parseInt(plan.estimatedProfit.replace(/\D/g, '')) * 12}+`
                        : plan.estimatedProfit
                      }
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <p className="font-semibold text-gray-800 mb-3">Includes:</p>
                    {plan.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="font-semibold text-gray-600 text-xs mb-2">Note:</p>
                      {plan.limitations.map((limitation, idx) => (
                        <p key={idx} className="text-xs text-gray-600">• {limitation}</p>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={processing}
                    className={`w-full mt-6 bg-gradient-to-r from-${plan.color}-500 to-${plan.color}-700 hover:from-${plan.color}-600 hover:to-${plan.color}-800`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Get Started'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ✨ Upgrade Anytime
            </h3>
            <p className="text-gray-700">
              Start with any plan and upgrade as your business grows. You'll only pay the difference when you upgrade mid-month.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}