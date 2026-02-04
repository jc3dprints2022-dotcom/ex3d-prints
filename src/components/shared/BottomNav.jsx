import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, ShoppingBag, ShoppingCart, LayoutDashboard } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { icon: Home, label: "Home", path: createPageUrl("Home") },
    { icon: ShoppingBag, label: "Shop", path: createPageUrl("Marketplace") },
    { icon: ShoppingCart, label: "Cart", path: createPageUrl("Cart") },
    { icon: LayoutDashboard, label: "Dashboard", path: createPageUrl("ConsumerDashboard") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full select-none min-w-[44px] min-h-[44px] transition-colors ${
                active ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${active ? "fill-teal-600 dark:fill-teal-400" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}