import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DesignerProductsSection from "./DesignerProductsSection";
import CustomRequestManagement from "./CustomRequestManagement";
import ModelManagementSection from "./ModelManagementSection";

export default function ItemManagementSection() {
  const [activeTab, setActiveTab] = useState("models");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">3D Model Management</TabsTrigger>
          <TabsTrigger value="products">Designer Products</TabsTrigger>
          <TabsTrigger value="requests">Custom Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="models">
          <ModelManagementSection />
        </TabsContent>
        
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