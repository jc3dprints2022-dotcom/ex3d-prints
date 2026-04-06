import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Package } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Get session_id from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (!sessionId) {
        throw new Error('No session ID found in URL');
      }

      // Verify payment and create order
      const { data } = await base44.functions.invoke('verifyPaymentAndCreateOrder', {
        sessionId: sessionId
      });

      if (data.success) {
        setSuccess(true);
        setOrderId(data.order_id);

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
        throw new Error(data.error || 'Failed to create order');
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
              Processing your payment...
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your order
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