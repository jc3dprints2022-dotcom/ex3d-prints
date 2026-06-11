import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailComposerSection from "./EmailComposerSection";
import EmailAutomationSection from "./EmailAutomationSection";
import EmailTemplateEditor from "./EmailTemplateEditor";

export default function EmailManagementSection() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="campaigns">
        <TabsList className="bg-slate-800 border border-cyan-500/30">
          <TabsTrigger value="campaigns" className="text-white data-[state=active]:bg-cyan-600">
            📧 Automated Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-white data-[state=active]:bg-cyan-600">
            ✏️ Notification Templates
          </TabsTrigger>
          <TabsTrigger value="composer" className="text-white data-[state=active]:bg-cyan-600">
            ✉️ Compose & Send
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns">
          <EmailAutomationSection />
        </TabsContent>
        <TabsContent value="templates">
          <EmailTemplateEditor />
        </TabsContent>
        <TabsContent value="composer">
          <EmailComposerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}