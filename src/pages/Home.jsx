import React from "react";
import HeroSection from "../components/home/HeroSection";
import FeaturedGrid from "../components/home/FeaturedGrid";
import { HowItWorksHome, WhyUsSection, CustomSection } from "../components/home/HomeSections";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturedGrid />
      <HowItWorksHome />
      <WhyUsSection />
      <CustomSection />
    </div>
  );
}