import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpRewardsSection from "./ExpRewardsSection";
import ExpProductsSection from "./ExpProductsSection";
import ExpRewardOrdersSection from "./ExpRewardOrdersSection";

export default function ExpManagementSection() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900 border-slate-700">
          <TabsTrigger value="rewards" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            EXP Rewards
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            EXP Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300">
            Reward Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <ExpRewardsSection />
        </TabsContent>

        <TabsContent value="products">
          <ExpProductsSection />
        </TabsContent>

        <TabsContent value="orders">
          <ExpRewardOrdersSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}