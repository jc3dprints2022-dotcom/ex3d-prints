import React from "react";
import HeroSection from "../components/home/HeroSection";
import FeaturedGrid from "../components/home/FeaturedGrid";
import { HowItWorksHome, WhyUsSection } from "../components/home/HomeSections";
import FounderSection from "../components/home/FounderSection";

export default function Home() {
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