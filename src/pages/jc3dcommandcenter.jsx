import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import all sections
import DashboardSection from "../components/commandcenter/DashboardSection";
import OrderRoutingSection from "../components/commandcenter/OrderRoutingSection";
import PaymentsFinancialsSection from "../components/commandcenter/PaymentsFinancialsSection";
import MakerToolsSection from "../components/commandcenter/MakerToolsSection";
import SystemSettingsSection from "../components/commandcenter/SystemSettingsSection";
import ItemManagementSection from "../components/commandcenter/ItemManagementSection";
import EmailManagementSection from "../components/commandcenter/EmailManagementSection";
import ExpManagementSection from "../components/commandcenter/ExpManagementSection";
import PerfectOrderDashboard from "../components/commandcenter/PerfectOrderDashboard";
import CalibrationApprovalSection from "../components/commandcenter/CalibrationApprovalSection";


export default function JC3DCommandCenter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      
      if (currentUser.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive"
        });
        window.location.href = '/';
        return;
      }
      
      setUser(currentUser);
    } catch (error) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access the command center",
        variant: "destructive"
      });
      window.location.href = '/';
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  const sections = [
    { value: "dashboard", label: "📊 Dashboard" },
    { value: "perfect_orders", label: "🎯 Perfect Orders" },
    { value: "calibration", label: "🔧 Calibration Approvals" },
    { value: "items", label: "📋 Item Management" },
    { value: "orders", label: "📦 Order Routing" },
    { value: "payments", label: "💰 Payments & Financials" },
    { value: "exp", label: "🏆 EXP Management" },
    { value: "email", label: "📧 Email Management" },
    { value: "makers", label: "🔧 Maker Tools & Performance" },
    { value: "settings", label: "⚙️ System Settings" }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection />;
      case "perfect_orders":
        return <PerfectOrderDashboard />;
      case "calibration":
        return <CalibrationApprovalSection />;
      case "orders":
        return <OrderRoutingSection />;
      case "payments":
        return <PaymentsFinancialsSection />;
      case "exp":
        return <ExpManagementSection />;
      case "email":
        return <EmailManagementSection />;
      case "makers":
        return <MakerToolsSection />;
      case "items":
        return <ItemManagementSection />;
      case "settings":
        return <SystemSettingsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            EX3D Prints Command Center
          </h1>
          <p className="text-cyan-400">
            Welcome back, {user?.full_name}! Manage your entire platform from here.
          </p>
        </div>

        {/* Section Selector */}
        <Card className="p-6 mb-8 bg-slate-900 border-cyan-500/30">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-cyan-400 whitespace-nowrap">
              Select Section:
            </label>
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="w-full max-w-md bg-slate-800 border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-cyan-500/30">
                {sections.map(section => (
                  <SelectItem 
                    key={section.value} 
                    value={section.value}
                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                  >
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Active Section Content */}
        <div>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}