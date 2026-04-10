import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, ShoppingBag, ShoppingCart, LayoutDashboard } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BottomNav() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndCart();
    window.addEventListener('cartUpdated', loadUserAndCart);
    return () => window.removeEventListener('cartUpdated', loadUserAndCart);
  }, []);

  const loadUserAndCart = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData) {
        const marketplaceType = userData.account_type === 'business' ? 'business' : 'consumer';
        const cartItems = await base44.entities.Cart.filter({ 
          user_id: userData.id,
          marketplace_type: marketplaceType 
        });
        setCartCount(cartItems.length);
      } else {
        const localCart = JSON.parse(localStorage.getItem('anonymousCart') || '[]');
        setCartCount(localCart.length);
      }
    } catch (error) {
      setUser(null);
      const localCart = JSON.parse(localStorage.getItem('anonymousCart') || '[]');
      setCartCount(localCart.length);
    }
  };

  const isActive = (path) => location.pathname === path;

  const getNavItems = () => {
    const cartPath = user?.account_type === 'business' ? createPageUrl("BusinessCart") : createPageUrl("Cart");
    const marketplacePath = user?.account_type === 'business' ? createPageUrl("BusinessMarketplace") : '/shopnow';
    const dashboardPath = user?.account_type === 'business' ? createPageUrl("BusinessDashboard") : createPageUrl("ConsumerDashboard");

    return [
      { icon: Home, label: "Home", path: createPageUrl("Home") },
      { icon: ShoppingBag, label: user?.account_type === 'business' ? "Business" : "Marketplace", path: marketplacePath },
      { icon: ShoppingCart, label: "Cart", path: cartPath, badge: cartCount },
      { icon: LayoutDashboard, label: "Dashboard", path: dashboardPath },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-bottom shadow-lg">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full select-none touch-target transition-colors ${
                active ? "text-teal-600 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon className="w-6 h-6 mb-1" />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-teal-500 dark:bg-teal-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-semibold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}