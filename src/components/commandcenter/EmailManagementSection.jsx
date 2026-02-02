import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailComposerSection from "./EmailComposerSection";
import EmailAutomationSection from "./EmailAutomationSection";

export default function EmailManagementSection() {
  return (
    <div className="space-y-6">
      <EmailComposerSection />
    </div>
  );
}