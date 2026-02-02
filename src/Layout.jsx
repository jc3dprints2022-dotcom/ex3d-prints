import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Menu, X, ShoppingCart, Heart, User as UserIcon,
  LogOut, Settings, Search, ChevronDown, LogIn, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import NewUserGiftPopup from "@/components/shared/NewUserGiftPopup";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [pendingAnnouncement, setPendingAnnouncement] = useState(null);
  const { toast } = useToast();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    
    const initLayout = async () => {
      if (isMounted) {
        await loadUserData();
        await checkForNewAnnouncements();
        await checkNewUserWelcome();
      }
    };
    
    initLayout();

    window.addEventListener('cartUpdated', loadUserData);
    window.addEventListener('wishlistUpdated', loadUserData);

    return () => {
      isMounted = false;
      window.removeEventListener('cartUpdated', loadUserData);
      window.removeEventListener('wishlistUpdated', loadUserData);
    };
  }, []);

  // Track page view
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  const checkNewUserWelcome = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) return;

      // Check if user was just created (within last 10 seconds) and hasn't received welcome bonus
      const userCreatedAt = new Date(currentUser.created_date);
      const now = new Date();
      const timeSinceCreation = (now - userCreatedAt) / 1000; // seconds

      // Check localStorage to see if we already sent the welcome email
      const welcomeSentKey = `welcome_sent_${currentUser.id}`;
      const welcomeAlreadySent = localStorage.getItem(welcomeSentKey);

      if (timeSinceCreation < 10 && !welcomeAlreadySent) {
        // New user - trigger welcome email and EXP bonus
        try {
          await base44.functions.invoke('onUserSignup', { userId: currentUser.id });
          localStorage.setItem(welcomeSentKey, 'true');
          
          // Reload user data to show updated EXP
          setTimeout(() => {
            loadUserData();
            toast({
              title: "Welcome to EX3D Prints! 🎉",
              description: "You've received 120 EXP as a welcome bonus! Check your email.",
              duration: 8000
            });
          }, 1000);
        } catch (error) {
          console.error('Failed to send welcome email:', error);
        }
      }
    } catch (error) {
      // User not logged in or other error - ignore
    }
  };

  const checkForNewAnnouncements = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) return;

      const allAnnouncements = await base44.entities.Announcement.list();
      const now = new Date();

      // Get last seen announcement timestamp from localStorage
      const lastSeenKey = `last_seen_announcement_${currentUser.id}`;
      const lastSeenTimestamp = localStorage.getItem(lastSeenKey);
      const lastSeen = lastSeenTimestamp ? new Date(lastSeenTimestamp) : null;

      // Find newest unread announcement
      const relevantAnnouncements = allAnnouncements.filter(announcement => {
        // Check if expired
        if (announcement.expiry_date && new Date(announcement.expiry_date) < now) {
          return false;
        }

        // Check if already read
        if (announcement.read_by?.includes(currentUser.id)) {
          return false;
        }

        // Check if it's newer than last seen
        const announcementDate = new Date(announcement.created_date);
        if (lastSeen && announcementDate <= lastSeen) {
          return false;
        }

        // Check target audience
        if (announcement.target_audience === 'all') return true;
        // Check if user is consumer AND NOT maker. A user can be both, but a maker is not *just* a consumer for maker-specific announcements.
        if (announcement.target_audience === 'consumers' && currentUser.business_roles?.includes('consumer') && !(currentUser.business_roles?.includes('maker'))) return true;
        if (announcement.target_audience === 'makers' && currentUser.business_roles?.includes('maker')) return true;
        if (announcement.target_audience === 'specific_user' && announcement.specific_user_id === currentUser.id) return true;

        return false;
      });

      // Show popup for the newest announcement
      if (relevantAnnouncements.length > 0) {
        const newestAnnouncement = relevantAnnouncements.sort(
          (a, b) => new Date(b.created_date) - new Date(a.created_date)
        )[0];
        
        setPendingAnnouncement(newestAnnouncement);
        setShowAnnouncementDialog(true);
        
        // Auto-dismiss after 15 seconds
        setTimeout(() => {
          // Check if the dialog is still open and the same announcement is pending
          if (showAnnouncementDialog && pendingAnnouncement?.id === newestAnnouncement.id) {
            handleDismissAnnouncement();
          }
        }, 15000);
      }
    } catch (error) {
      console.error('Failed to check announcements:', error);
    }
  };

  const handleAnnouncementClick = () => {
    if (pendingAnnouncement && user) {
      // Mark as seen in local storage
      const lastSeenKey = `last_seen_announcement_${user.id}`;
      localStorage.setItem(lastSeenKey, new Date().toISOString());
      
      setShowAnnouncementDialog(false);
      
      // Navigate to dashboard
      const dashboardUrl = getDashboardUrl();
      window.location.href = dashboardUrl;
    }
  };

  const handleDismissAnnouncement = async () => {
    if (pendingAnnouncement && user) {
      try {
        // Mark as read in database
        const announcement = pendingAnnouncement;
        const updatedReadBy = [...(announcement.read_by || []), user.id];
        
        await base44.entities.Announcement.update(announcement.id, {
          read_by: updatedReadBy
        });

        // Update localStorage to mark it as seen
        const lastSeenKey = `last_seen_announcement_${user.id}`;
        localStorage.setItem(lastSeenKey, new Date().toISOString());
      } catch (error) {
        console.error("Failed to dismiss announcement:", error);
      }
    }
    setShowAnnouncementDialog(false);
    setPendingAnnouncement(null);
  };

  const trackPageView = async () => {
    try {
      let userType = 'not_signed_in';
      let userId = null;

      try {
        const currentUser = await base44.auth.me();
        if (currentUser) {
          userId = currentUser.id;
          userType = currentUser.business_roles?.includes('maker') ? 'maker' : 'signed_in';
        }
      } catch (error) {
        // Not logged in, keep as not_signed_in
      }

      // Generate or retrieve session ID
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('session_id', sessionId);
      }

      await base44.entities.PageView.create({
        user_id: userId,
        user_type: userType,
        page_url: location.pathname,
        timestamp: new Date().toISOString(),
        session_id: sessionId
      }).catch(err => {
        // Silently catch PageView errors - non-critical
        console.log('PageView tracking skipped:', err.message);
      });
    } catch (error) {
      // Silently catch all tracking errors
      console.log('Page tracking skipped');
    }
  };

  const loadUserData = async () => {
    try {
      // Check if we have a cached user in sessionStorage to prevent re-auth on every page change
      const cachedUser = sessionStorage.getItem('cached_user');
      const cacheTime = sessionStorage.getItem('user_cache_time');
      const now = Date.now();
      
      // Use cache if less than 30 seconds old
      if (cachedUser && cacheTime && (now - parseInt(cacheTime)) < 30000) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        
        const cartItems = await base44.entities.Cart.filter({ user_id: userData.id }).catch(() => []);
        setCartCount(cartItems.length);
        setWishlistCount(userData.wishlist?.length || 0);
        return;
      }

      const userData = await base44.auth.me().catch(() => null);
      if (!userData) {
        setUser(null);
        sessionStorage.removeItem('cached_user');
        sessionStorage.removeItem('user_cache_time');
        const localCart = JSON.parse(localStorage.getItem('anonymousCart') || '[]');
        setCartCount(localCart.length);
        const localWishlist = JSON.parse(localStorage.getItem('anonymousWishlist') || '[]');
        setWishlistCount(localWishlist.length);
        return;
      }
      
      // Cache the user data
      sessionStorage.setItem('cached_user', JSON.stringify(userData));
      sessionStorage.setItem('user_cache_time', now.toString());
      
      setUser(userData);

      const cartItems = await base44.entities.Cart.filter({ user_id: userData.id }).catch(() => []);
      setCartCount(cartItems.length);

      setWishlistCount(userData.wishlist?.length || 0);
    } catch (error) {
      // Not logged in - this is fine for public pages
      setUser(null);
      sessionStorage.removeItem('cached_user');
      sessionStorage.removeItem('user_cache_time');
      const localCart = JSON.parse(localStorage.getItem('anonymousCart') || '[]');
      setCartCount(localCart.length);
      const localWishlist = JSON.parse(localStorage.getItem('anonymousWishlist') || '[]');
      setWishlistCount(localWishlist.length);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    setUser(null);
    setCartCount(0);
    setWishlistCount(0);
    localStorage.removeItem('anonymousCart');
    localStorage.removeItem('anonymousWishlist');
    sessionStorage.removeItem('cached_user');
    sessionStorage.removeItem('user_cache_time');
    window.location.href = createPageUrl("Home");
  };

  const handleLogin = async () => {
    window.location.href = '/api/auth/login?next=' + encodeURIComponent(window.location.href);
  };

  const getDashboardUrl = () => {
    if (!user) return createPageUrl("Home");

    if (user.role === 'admin') return createPageUrl("jc3dcommandcenter");

    const roles = user.business_roles || [];
    if (roles.includes('campus_manager')) return createPageUrl("CampusManagementCenter");
    if (roles.includes('maker')) return createPageUrl("MakerDashboard");
    return createPageUrl("ConsumerDashboard");
  };

  const getDashboardLabel = () => {
    if (!user) return "Dashboard";

    if (user.role === 'admin') return "Admin Command Center";

    const roles = user.business_roles || [];
    if (roles.includes('campus_manager')) return "Campus Management";
    if (roles.includes('maker')) return "Maker Dashboard";
    return "My Dashboard";
  };

  const getAvailableDashboards = () => {
    if (!user) return [];

    const dashboards = [];

    // Always show consumer dashboard
    dashboards.push({ name: 'My Dashboard', url: createPageUrl("ConsumerDashboard") });

    // Show maker dashboard if user is a maker
    if (user.maker_id && user.business_roles?.includes('maker')) {
      dashboards.push({ name: 'Maker Dashboard', url: createPageUrl("MakerDashboard") });
    }

    // Show designer dashboard if user is a designer
    if (user.designer_id && user.business_roles?.includes('designer')) {
      dashboards.push({ name: 'Designer Dashboard', url: createPageUrl("DesignerDashboard") });
    }

    // Show campus management center if user is a campus manager
    if (user.business_roles?.includes('campus_manager') && user.managed_campus) {
      dashboards.push({ name: 'Campus Management', url: createPageUrl("CampusManagementCenter") });
    }

    return dashboards;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `${createPageUrl("Marketplace")}?search=${encodeURIComponent(searchQuery)}`;
    } else {
      window.location.href = createPageUrl("Marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("Home")} className="flex items-center space-x-2" onClick={scrollToTop}>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png" alt="EXpressPrints Logo" className="h-12 w-auto"/>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to={createPageUrl("Home")}
                onClick={scrollToTop}
                className={`text-sm font-medium transition-colors hover:text-teal-600 ${
                  location.pathname === createPageUrl("Home")
                    ? "text-teal-600"
                    : "text-slate-600"
                }`}
              >
                Home
              </Link>

              <Link
                to={createPageUrl("Marketplace")}
                onClick={scrollToTop}
                className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                  location.pathname === createPageUrl("Marketplace")
                    ? "bg-teal-500 text-white"
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                }`}
              >
                Marketplace
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                      location.pathname === createPageUrl("ForMakers")
                        ? "bg-orange-500 text-white"
                        : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                    } flex items-center gap-1`}
                  >
                    For Makers
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("ForMakers")} onClick={scrollToTop}>Overview</Link>
                  </DropdownMenuItem>
                  {user && user.maker_id && (user.business_roles?.includes('maker')) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("MakerDashboard")} onClick={scrollToTop}>
                          <Settings className="w-4 h-4 mr-2" />
                          Maker Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {(!user || !(user.maker_id && user.business_roles?.includes('maker'))) && (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("MakerSignup")} onClick={scrollToTop}>
                        <span className="text-orange-600 font-semibold">Get Started</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                      location.pathname === createPageUrl("ForDesigners")
                        ? "bg-red-500 text-white"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    } flex items-center gap-1`}
                  >
                    For Designers
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("ForDesigners")} onClick={scrollToTop}>Overview</Link>
                  </DropdownMenuItem>
                  {user && user.designer_id && user.business_roles?.includes('designer') ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("DesignerDashboard")} onClick={scrollToTop}>
                          <Settings className="w-4 h-4 mr-2" />
                          Designer Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("DesignerSignup")} onClick={scrollToTop}>
                        <span className="text-red-600 font-semibold">Get Started</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 w-48"
                />
              </div>

              <Link to={createPageUrl("Wishlist")} onClick={scrollToTop}>
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to={createPageUrl("Cart")} onClick={scrollToTop}>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {user.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                           <UserIcon className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {user.business_roles && user.business_roles.length > 0 && user.business_roles.some(role => role !== 'consumer') && (
                        <p className="text-xs text-teal-600 capitalize">
                          {user.business_roles.filter(role => role !== 'consumer').join(', ')}
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to={getDashboardUrl()} onClick={scrollToTop} className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        {getDashboardLabel()}
                      </Link>
                    </DropdownMenuItem>

                    {getAvailableDashboards().length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                          Switch Dashboard
                        </div>
                        {getAvailableDashboards().map((dashboard, index) => (
                          <DropdownMenuItem key={index} asChild>
                            <Link to={dashboard.url} onClick={scrollToTop} className="pl-6">
                              {dashboard.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" onClick={handleLogin}>
                  Sign In
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white py-4">
              <Link
                to={createPageUrl("Home")}
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 hover:bg-gray-50"
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
              >
                Home
              </Link>
              <Link
                to={createPageUrl("Marketplace")}
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 hover:bg-gray-50"
                onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
              >
                Marketplace
              </Link>

              {/* For Makers Section */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">For Makers</p>
                <Link
                  to={createPageUrl("ForMakers")}
                  className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 hover:bg-gray-50"
                  onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                >
                  Overview
                </Link>
                {user && user.maker_id && user.business_roles?.includes('maker') && (
                  <Link
                    to={createPageUrl("MakerDashboard")}
                    className="block px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                  >
                    Maker Dashboard
                  </Link>
                )}
                {(!user || !(user.maker_id && user.business_roles?.includes('maker'))) && (
                  <Link
                    to={createPageUrl("MakerSignup")}
                    className="block px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                  >
                    Get Started
                  </Link>
                )}
              </div>

              {/* For Designers Section */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">For Designers</p>
                <Link
                  to={createPageUrl("ForDesigners")}
                  className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 hover:bg-gray-50"
                  onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                >
                  Overview
                </Link>
                {user && user.designer_id && user.business_roles?.includes('designer') ? (
                  <Link
                    to={createPageUrl("DesignerDashboard")}
                    className="block px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                  >
                    Designer Dashboard
                  </Link>
                ) : (
                  <Link
                    to={createPageUrl("DesignerSignup")}
                    className="block px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setMobileMenuOpen(false); scrollToTop(); }}
                  >
                    Get Started
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Announcement Popup Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              <DialogTitle>New Announcement</DialogTitle>
            </div>
            <DialogDescription>
              {pendingAnnouncement?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">{pendingAnnouncement?.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDismissAnnouncement}>
              Dismiss
            </Button>
            <Button onClick={handleAnnouncementClick} className="bg-teal-600 hover:bg-teal-700">
              View Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1">
        {children}
      </main>

      <NewUserGiftPopup />

      <footer className="bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d8b5f745d1a8c804de1fda/0fca6282c_EX3DPrintsLogo.png" alt="EXpressPrints Logo" className="h-10 w-auto"/>
              </div>
              <p className="text-gray-300 mb-4">
                The premier marketplace connecting 3D printing enthusiasts and makers worldwide.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to={createPageUrl("Marketplace")} onClick={scrollToTop} className="hover:text-white">Marketplace</Link></li>
                <li><Link to={createPageUrl("ForMakers")} onClick={scrollToTop} className="hover:text-white">For Makers</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link to={createPageUrl("HowItWorks")} onClick={scrollToTop} className="hover:text-white">How It Works</Link></li>
                <li><Link to={createPageUrl("FAQ")} onClick={scrollToTop} className="hover:text-white">FAQ</Link></li>
                <li><Link to={createPageUrl("Contact")} onClick={scrollToTop} className="hover:text-white">Contact Us</Link></li>
                <li><Link to={createPageUrl("ReportIssue")} onClick={scrollToTop} className="hover:text-white">Report Issue / Feature Request</Link></li>
                <li><Link to={createPageUrl("Privacy")} onClick={scrollToTop} className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to={createPageUrl("Terms")} onClick={scrollToTop} className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 EX3DPrints. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}