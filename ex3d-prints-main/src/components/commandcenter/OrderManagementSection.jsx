import React from "react";
import OrderRoutingSection from "./OrderRoutingSection";
import ShipmentTrackingSection from "./ShipmentTrackingSection";

export default function OrderManagementSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Order Management</h2>
        <p className="text-cyan-400 text-sm">Manage order routing, assignments, and shipment tracking</p>
      </div>
      <OrderRoutingSection />
      <div className="border-t border-slate-700 pt-8">
        <ShipmentTrackingSection />
      </div>
    </div>
  );
}