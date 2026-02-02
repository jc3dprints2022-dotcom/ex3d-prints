import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DesignerProductsSection from "./DesignerProductsSection";
import CustomRequestManagement from "./CustomRequestManagement";

export default function ItemManagementSection() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Designer Product Reviews</TabsTrigger>
          <TabsTrigger value="requests">Custom Print Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <DesignerProductsSection />
        </TabsContent>
        
        <TabsContent value="requests">
          <CustomRequestManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}