import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StripeSetupComplete() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const isRefresh = urlParams.get("refresh") === "true";

  useEffect(() => {
    handleSetupComplete();
  }, []);

  const handleSetupComplete = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) { setLoading(false); return; }

      setUser(currentUser);

      if (!isRefresh) {
        // Mark onboarding complete and ensure both account ID fields are in sync
        const updates = { stripe_connect_onboarding_complete: true };
        // If only legacy field was set, copy it over
        if (currentUser.stripe_account_id && !currentUser.stripe_connect_account_id) {
          updates.stripe_connect_account_id = currentUser.stripe_account_id;
        }
        await base44.auth.updateMe(updates);

        await base44.functions.invoke("sendEmail", {
          to: currentUser.email,
          subject: "✅ Your Stripe Account is Set Up — EX3D Prints",
          body: `Hi ${currentUser.full_name},\n\nYour Stripe payment account has been successfully connected to EX3D Prints.\n\nYou will now automatically receive payments when your work is completed. Funds are typically available within 2–3 business days.\n\nBest regards,\nThe EX3D Prints Team`,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error completing Stripe setup:", err);
    }
    setLoading(false);
  };

  // Route user back to the right dashboard based on their roles
  const getDashboardUrl = () => {
    if (!user) return createPageUrl("ConsumerDashboard");
    const roles = user.business_roles || [];
    if (user.role === 'admin') return createPageUrl("jc3dcommandcenter");
    if (roles.includes('designer') && !roles.includes('maker')) {
      return createPageUrl("ConsumerDashboard") + "?tab=designer&subtab=settings";
    }
    return createPageUrl("ConsumerDashboard") + "?tab=maker";
  };

  const handleRetryOnboarding = async () => {
    try {
      const { data } = await base44.functions.invoke('createStripeConnectOnboarding');
      if (data?.onboarding_url) window.location.href = data.onboarding_url;
    } catch (err) {
      console.error('Failed to restart onboarding:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="p-8 text-center">
          {isRefresh ? (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Not Completed</h1>
              <p className="text-gray-600 mb-6">
                Your Stripe setup wasn't fully completed. You can try again or return to your dashboard and finish later.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleRetryOnboarding} className="w-full bg-teal-600 hover:bg-teal-700">
                  Try Again
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={getDashboardUrl()}>Return to Dashboard</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe Account Connected!</h1>
              <p className="text-gray-600 mb-2">
                Your Stripe payment account is now connected to EX3D Prints.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You'll automatically receive payments when your work is completed. A confirmation email has been sent.
              </p>
              <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
                <Link to={getDashboardUrl()}>Return to Dashboard</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}