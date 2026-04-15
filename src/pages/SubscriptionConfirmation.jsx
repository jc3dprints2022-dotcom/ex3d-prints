import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Package, Upload } from "lucide-react";

export default function SubscriptionConfirmation() {
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscription_id');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subscriptionId) {
      loadSubscription();
    }
  }, [subscriptionId]);

  const loadSubscription = async () => {
    try {
      const sub = await base44.entities.BusinessSubscription.get(subscriptionId);
      setSubscription(sub);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={createPageUrl("ConsumerDashboard")}>Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl">Subscription Active!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Your subscription has been successfully activated. Here's what happens next:
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Production Begins Within 7 Days</h3>
                  <p className="text-gray-600">
                    Your first production run will start within the next week. Items will be manufactured locally by our network of student makers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <Upload className="w-6 h-6 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Logo Files Will Be Reviewed</h3>
                  <p className="text-gray-600">
                    {subscription.logo_url 
                      ? "Our team will review your logo and prepare it for production." 
                      : "Please upload your logo in your dashboard to ensure it's ready for your first production run."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <Package className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">Delivery Before Next Billing</h3>
                  <p className="text-gray-600">
                    Your first order will be delivered before your next billing cycle on {new Date(subscription.next_production_date).toLocaleDateString()}.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Subscription Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="font-semibold">{subscription.items_per_month} Items / Month</p>
                </div>
                <div>
                  <p className="text-gray-500">Monthly Cost</p>
                  <p className="font-semibold">${subscription.monthly_price}</p>
                </div>
                <div>
                  <p className="text-gray-500">Selected Products</p>
                  <p className="font-semibold">{subscription.selected_products?.length || 0} Products</p>
                </div>
                <div>
                  <p className="text-gray-500">Colors</p>
                  <p className="font-semibold">{subscription.selected_colors?.join(", ") || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button asChild className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Link to={`${createPageUrl("ConsumerDashboard")}?tab=subscription`}>
                  Manage Subscription
                </Link>
              </Button>
              {!subscription.logo_url && (
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`${createPageUrl("ConsumerDashboard")}?tab=subscription`}>
                    Upload Logo Now
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}