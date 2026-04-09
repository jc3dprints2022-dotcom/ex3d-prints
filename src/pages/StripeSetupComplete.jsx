import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StripeSetupComplete() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const isRefresh = urlParams.get("refresh") === "true";

  useEffect(() => {
    handleSetupComplete();
  }, []);

  const handleSetupComplete = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setLoading(false);
        return;
      }

      // Mark onboarding complete
      await base44.auth.updateMe({ stripe_connect_onboarding_complete: true });

      // Send confirmation email
      await base44.functions.invoke("sendEmail", {
        to: user.email,
        subject: "✅ Your Stripe Account is Set Up — EX3D Prints",
        body: `Hi ${user.full_name},\n\nGreat news! Your Stripe payment account has been successfully set up with EX3D Prints.\n\nYou will now automatically receive payments when your orders are completed. Funds are typically available within 2–3 business days after order completion.\n\nIf you have any questions, feel free to contact us.\n\nBest regards,\nThe EX3D Prints Team`
      });
    } catch (err) {
      console.error("Error completing Stripe setup:", err);
      setError(err.message);
    }
    setLoading(false);
  };

  const dashboardUrl = createPageUrl("ConsumerDashboard") + "?tab=maker";

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
                <ExternalLink className="w-8 h-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Not Complete</h1>
              <p className="text-gray-600 mb-6">
                Your Stripe setup wasn't fully completed. Please return to your dashboard and try again.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Stripe Account Set Up!</h1>
              <p className="text-gray-600 mb-2">
                Your Stripe payment account is now connected to EX3D Prints.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                A confirmation email has been sent to you. You'll automatically receive payments when orders are completed.
              </p>
            </>
          )}
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
            <Link to={dashboardUrl}>Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}