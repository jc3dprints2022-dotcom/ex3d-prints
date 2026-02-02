import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailComposerSection from "./EmailComposerSection";
import EmailAutomationSection from "./EmailAutomationSection";

export default function EmailManagementSection() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="composer" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900 border-slate-700">
          <TabsTrigger value="composer" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Email Composer
          </TabsTrigger>
          <TabsTrigger value="automation" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Email Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="composer">
          <EmailComposerSection />
        </TabsContent>

        <TabsContent value="automation">
          <EmailAutomationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}