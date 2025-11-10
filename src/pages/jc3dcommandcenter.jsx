
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
import UserManagementSection from "../components/commandcenter/UserManagementSection";
import ModelManagementSection from "../components/commandcenter/ModelManagementSection";
import OrderRoutingSection from "../components/commandcenter/OrderRoutingSection";
import PaymentsFinancialsSection from "../components/commandcenter/PaymentsFinancialsSection";
import SecurityDRMSection from "../components/commandcenter/SecurityDRMSection";
import MakerToolsSection from "../components/commandcenter/MakerToolsSection";
import SystemSettingsSection from "../components/commandcenter/SystemSettingsSection";
import MakerApplicationsSection from "../components/commandcenter/MakerApplicationsSection";
import CustomRequestManagement from "../components/commandcenter/CustomRequestManagement";
import AnnouncementsSection from "../components/commandcenter/AnnouncementsSection";
import CabinetStatusSection from "../components/commandcenter/CabinetStatusSection";
import MarketingResourcesSection from "../components/commandcenter/MarketingResourcesSection";
import HomepageFeaturedSection from "../components/commandcenter/HomepageFeaturedSection";
import EmailComposerSection from "../components/commandcenter/EmailComposerSection";
import EmailAutomationSection from "../components/commandcenter/EmailAutomationSection";
import ExpRewardsSection from "../components/commandcenter/ExpRewardsSection";
import ExpProductsSection from "../components/commandcenter/ExpProductsSection";
import ExpRewardOrdersSection from "../components/commandcenter/ExpRewardOrdersSection";

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
    { value: "homepage", label: "🏠 Homepage Featured" },
    { value: "users", label: "👥 User Management" },
    { value: "models", label: "🎨 Model Management" },
    { value: "orders", label: "📦 Order Routing" },
    { value: "payments", label: "💰 Payments & Financials" },
    { value: "exp-rewards", label: "🏆 EXP Rewards" },
    { value: "exp-products", label: "🎁 EXP Products" },
    { value: "exp-orders", label: "📦 EXP Reward Orders" },
    { value: "email", label: "📧 Email Composer" },
    { value: "automation", label: "🤖 Email Automation" },
    { value: "security", label: "🔒 Security & Audit Logs" },
    { value: "makers", label: "🔧 Maker Tools" },
    { value: "applications", label: "📝 Maker Applications" },
    { value: "custom-requests", label: "🎯 Custom Print Requests" },
    { value: "announcements", label: "📢 Announcements" },
    { value: "marketing", label: "🎨 Marketing Resources" },
    { value: "cabinets", label: "📫 Pickup Cabinets" },
    { value: "settings", label: "⚙️ System Settings" }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection />;
      case "homepage":
        return <HomepageFeaturedSection />;
      case "users":
        return <UserManagementSection />;
      case "models":
        return <ModelManagementSection />;
      case "orders":
        return <OrderRoutingSection />;
      case "payments":
        return <PaymentsFinancialsSection />;
      case "exp-rewards":
        return <ExpRewardsSection />;
      case "exp-products":
        return <ExpProductsSection />;
      case "exp-orders":
        return <ExpRewardOrdersSection />;
      case "email":
        return <EmailComposerSection />;
      case "automation":
        return <EmailAutomationSection />;
      case "security":
        return <SecurityDRMSection />;
      case "makers":
        return <MakerToolsSection />;
      case "applications":
        return <MakerApplicationsSection />;
      case "custom-requests":
        return <CustomRequestManagement />;
      case "announcements":
        return <AnnouncementsSection />;
      case "marketing":
        return <MarketingResourcesSection />;
      case "cabinets":
        return <CabinetStatusSection />;
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
