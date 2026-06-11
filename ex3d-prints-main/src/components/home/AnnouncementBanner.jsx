import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Gift, ArrowRight } from "lucide-react";

export default function AnnouncementBanner() {
  return (
    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-white">
          <Gift className="w-5 h-5 animate-bounce" />
          <p className="text-sm md:text-base font-medium">
            Earn Rewards on Every Purchase and Exchange for Free Prints!
          </p>
          <Link 
            to={`${createPageUrl("ConsumerDashboard")}?tab=referrals`}
            className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            Check Your Dashboard to Learn More
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}