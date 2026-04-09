import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Circle, Clock, XCircle, ChevronDown, ChevronUp,
  Printer, Package, CreditCard, ShoppingBag, PartyPopper, AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STEP_IDS = ["calibration", "printer", "filament", "stripe"];

export default function MakerOnboarding({ user, printers, filament, onNavigate, onComplete }) {
  const [minimized, setMinimized] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState(null); // null | "pending" | "approved" | "rejected"
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  const storageKey = `maker_onboarding_done_${user?.id}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") {
      setDismissed(true);
      return;
    }
    loadCalibration();
  }, [user?.maker_id]);

  useEffect(() => {
    if (!dismissed) checkCompletion();
  }, [calibrationStatus, printers, filament, user]);

  const loadCalibration = async () => {
    if (!user?.maker_id) return;
    try {
      const subs = await base44.entities.CalibrationSubmission.filter({ maker_id: user.maker_id });
      const sorted = subs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setCalibrationStatus(sorted[0]?.status || null);
    } catch (e) {
      console.error(e);
    }
  };

  const checkCompletion = () => {
    if (
      calibrationStatus === "approved" &&
      (printers?.length || 0) >= 1 &&
      (filament?.length || 0) >= 1 &&
      user?.stripe_connect_account_id
    ) {
      setShowSuccess(true);
      setTimeout(() => {
        localStorage.setItem(storageKey, "true");
        setDismissed(true);
        if (onComplete) onComplete();
      }, 4000);
    }
  };

  const steps = [
    {
      id: "calibration",
      icon: <Printer className="w-5 h-5" />,
      title: "Print Quality Verification",
      description: "Download test files, print them, and upload photos for admin approval.",
      cta: "Go to Setup",
      onCta: () => onNavigate("setup"),
      status: calibrationStatus === "approved"
        ? "complete"
        : calibrationStatus === "pending"
        ? "waiting"
        : calibrationStatus === "rejected"
        ? "rejected"
        : "not_started",
      required: true,
    },
    {
      id: "printer",
      icon: <Printer className="w-5 h-5" />,
      title: "Add Your Printer",
      description: "Register at least one 3D printer to your maker profile.",
      cta: "Add Printer",
      onCta: () => onNavigate("setup"),
      status: (printers?.length || 0) >= 1 ? "complete" : calibrationStatus === "approved" ? "not_started" : "locked",
      required: true,
    },
    {
      id: "filament",
      icon: <Package className="w-5 h-5" />,
      title: "Add Your Filament",
      description: "Add at least one filament type and color to your inventory.",
      cta: "Add Filament",
      onCta: () => onNavigate("setup"),
      status: (filament?.length || 0) >= 1 ? "complete" : calibrationStatus === "approved" ? "not_started" : "locked",
      required: true,
    },
    {
      id: "stripe",
      icon: <CreditCard className="w-5 h-5" />,
      title: "Connect Stripe Account",
      description: "Required to receive payouts when your orders are completed.",
      cta: "Connect Stripe",
      onCta: () => onNavigate("settings"),
      status: user?.stripe_connect_account_id ? "complete" : "not_started",
      required: true,
    },
    {
      id: "supplies",
      icon: <ShoppingBag className="w-5 h-5" />,
      title: "Review Optional Supplies",
      description: "Order shipping kits and filament for easier fulfillment. Recommended, not required.",
      cta: "Browse Supplies",
      onCta: () => onNavigate("exp"),
      status: "optional",
      required: false,
    },
  ];

  const completedRequired = steps.filter(s => s.required && s.status === "complete").length;
  const totalRequired = steps.filter(s => s.required).length;
  const allRequiredDone = completedRequired === totalRequired;

  if (dismissed) return null;

  if (showSuccess) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border-2 border-green-400 p-6 w-80 text-center animate-in slide-in-from-bottom-4">
        <PartyPopper className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900 mb-1">Congrats, you're fully set up! 🎉</h3>
        <p className="text-sm text-gray-600">Your maker profile is ready to receive orders.</p>
      </div>
    );
  }

  const StatusBadge = ({ status }) => {
    if (status === "complete") return <Badge className="bg-green-100 text-green-800 text-xs">✓ Complete</Badge>;
    if (status === "waiting") return <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ Waiting Approval</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-800 text-xs">✗ Rejected</Badge>;
    if (status === "locked") return <Badge className="bg-gray-100 text-gray-500 text-xs">🔒 Locked</Badge>;
    if (status === "optional") return <Badge className="bg-blue-100 text-blue-700 text-xs">Optional</Badge>;
    return <Badge className="bg-gray-100 text-gray-700 text-xs">Not started</Badge>;
  };

  const StepIcon = ({ status }) => {
    if (status === "complete") return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
    if (status === "waiting") return <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
    if (status === "rejected") return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    if (status === "locked") return <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />;
    return <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />;
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-teal-600 hover:bg-teal-700 text-white rounded-full px-4 py-3 shadow-xl flex items-center gap-2 font-medium"
      >
        <AlertTriangle className="w-4 h-4" />
        Finish setup ({completedRequired}/{totalRequired} complete)
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 max-h-[85vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-sm">Maker Setup Checklist</h3>
          <p className="text-xs text-teal-100">{completedRequired}/{totalRequired} required steps complete</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 bg-teal-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${(completedRequired / totalRequired) * 100}%` }}
            />
          </div>
          <button onClick={() => setMinimized(true)} className="text-teal-100 hover:text-white ml-1">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        {steps.map((step, idx) => (
          <div key={step.id} className={`p-4 ${step.status === "complete" ? "bg-green-50/50" : step.status === "locked" ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <StepIcon status={step.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-sm font-semibold ${step.status === "complete" ? "text-green-800 line-through" : "text-gray-900"}`}>
                    {idx + 1}. {step.title}
                  </span>
                  <StatusBadge status={step.status} />
                </div>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed">{step.description}</p>
                {step.status === "rejected" && (
                  <p className="text-xs text-red-600 mb-2 font-medium">Please reprint and re-upload your photos to continue.</p>
                )}
                {step.status !== "complete" && step.status !== "locked" && (
                  <Button
                    size="sm"
                    onClick={step.onCta}
                    className={`text-xs h-7 ${
                      step.status === "optional"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : step.status === "rejected"
                        ? "bg-red-600 hover:bg-red-700"
                        : step.status === "waiting"
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-teal-600 hover:bg-teal-700"
                    }`}
                  >
                    {step.cta}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {allRequiredDone && (
        <div className="p-3 bg-green-50 border-t border-green-200 text-center flex-shrink-0">
          <p className="text-sm font-semibold text-green-800">🎉 All required steps complete!</p>
          <p className="text-xs text-green-600">Check out the optional supplies above.</p>
        </div>
      )}
      <div className="px-4 py-2 border-t flex-shrink-0 text-center">
        <button
          onClick={() => {
            localStorage.setItem(storageKey, "true");
            setDismissed(true);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Dismiss (I'll set up later)
        </button>
      </div>
    </div>
  );
}