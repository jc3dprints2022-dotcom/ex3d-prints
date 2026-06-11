import React from "react";
import { useEffect } from "react";
import HeroSection from "../components/home/HeroSection";
import FeaturedGrid from "../components/home/FeaturedGrid";
import { HowItWorksHome, WhyUsSection } from "../components/home/HomeSections";
import FounderSection from "../components/home/FounderSection";
import { base44 } from "@/api/base44Client";

export default function Home() {
  useEffect(() => {
    // Capture affiliate ref from ?ref= param on the homepage
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) {
      localStorage.setItem('affiliateRef', refParam);
      base44.entities.AffiliateClick.create({
        affiliate_id: refParam,
        referrer_url: document.referrer || '',
        session_id: localStorage.getItem('session_id') || '',
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturedGrid />
      <HowItWorksHome />
      <WhyUsSection />
      <FounderSection />
    </div>
  );
}