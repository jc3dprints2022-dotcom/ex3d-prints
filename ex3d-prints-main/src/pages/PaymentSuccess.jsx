import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Package, Mail } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (!sessionId) {
        throw new Error('No session ID found in URL');
      }

      // Retrieve any saved guest checkout data (set in Checkout.jsx before Stripe redirect)
      let pendingGuest = null;
      try {
        const raw = localStorage.getItem('pendingGuestCheckout');
        if (raw) pendingGuest = JSON.parse(raw);
      } catch { /* ignore parse errors */ }

      if (pendingGuest?.email) {
        setIsGuest(true);
        setGuestEmail(pendingGuest.email);
      }

      // Idempotency guard — don't call the backend again if already verified
      const cachedOrderId = localStorage.getItem(`verified_session_${sessionId}`);
      if (cachedOrderId) {
        setSuccess(true);
        setOrderId(cachedOrderId !== 'complete' ? cachedOrderId : null);
        setLoading(false);
        return;
      }

      // Build the payload — pass full guest data so the backend can create
      // a user account, place the order, and send a confirmation email.
      const payload = { sessionId };
      if (pendingGuest) {
        payload.guestEmail        = pendingGuest.email       || undefined;
        payload.guestName         = pendingGuest.name        || undefined;
        payload.shippingAddress   = pendingGuest.shippingAddress || undefined;
        payload.cartItems         = pendingGuest.cartItems   || undefined;
        payload.landingPageSource = pendingGuest.landing_page_source
          || pendingGuest.cartItems?.find(i => i.source)?.source
          || undefined;
      }

      const result = await base44.functions.invoke('verifyPaymentAndCreateOrder', payload);
      const data = result?.data || result;

      if (data?.success) {
        setSuccess(true);
        setOrderId(data.order_id);

        // Cache so a page refresh doesn't re-verify / re-create the order
        localStorage.setItem(`verified_session_${sessionId}`, data.order_id || 'complete');

        // Clear guest cart and pending checkout data now that order is confirmed
        localStorage.removeItem('anonymousCart');
        localStorage.removeItem('pendingGuestCheckout');

        // Axon: purchase
        if (typeof window.axon === 'function') {
          const pendingPurchase = JSON.parse(localStorage.getItem('axon_pending_purchase') || '{}');
          localStorage.removeItem('axon_pending_purchase');
          window.axon('track', 'purchase', {
            currency: 'USD',
            value: pendingPurchase.value || data.total_amount || 0,
            shipping: pendingPurchase.shipping || 0,
            tax: 0,
            transaction_id: data.order_id || sessionId,
            items: pendingPurchase.items || []
          });
        }

        toast({
          title: "Payment successful!",
          description: "Your order has been placed."
        });
      } else {
        throw new Error(data?.error || data?.details || 'Failed to create order');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setError(err.message || 'Failed to verify payment');
      toast({
        title: "Payment verification failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-teal-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing your order...
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your payment and place your order
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Payment Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">
              If you were charged, please contact us and we will locate your payment immediately.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.href = createPageUrl("Cart")}
                className="w-full"
              >
                Return to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = createPageUrl("Contact")}
                className="w-full"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Guest success screen ──────────────────────────────────────────────────
  if (success && isGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-gray-600">
                Thank you for your purchase! Your payment was successful and your order is being prepared.
              </p>
              {orderId && (
                <p className="text-sm text-gray-500">
                  Order ID: #{orderId.slice(-8)}
                </p>
              )}
            </div>

            {/* Email confirmation notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">Check your email</p>
                  {guestEmail ? (
                    <p className="text-sm text-blue-800 mt-1">
                      An order confirmation and account setup link has been sent to{' '}
                      <span className="font-semibold">{guestEmail}</span>.
                    </p>
                  ) : (
                    <p className="text-sm text-blue-800 mt-1">
                      An order confirmation has been sent to the email you provided at checkout.
                    </p>
                  )}
                  <p className="text-xs text-blue-700 mt-2">
                    The email includes your order details, tracking info once shipped, and a link
                    to set up your account so you can track orders anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <Package className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-700">
                We've assigned your order to a qualified maker. You'll receive shipping updates via email.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl("Marketplace")}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Logged-in user success screen ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              Thank you for your order! Your payment has been processed successfully.
            </p>
            {orderId && (
              <p className="text-sm text-gray-500">
                Order ID: #{orderId.slice(-8)}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-900">
              We've assigned your order to a qualified maker. You'll receive updates via email.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => window.location.href = createPageUrl("ConsumerDashboard")}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              View My Orders
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl("Marketplace")}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}