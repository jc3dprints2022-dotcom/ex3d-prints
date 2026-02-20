/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccountInfo from './pages/AccountInfo';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminPortalJC3D from './pages/AdminPortalJC3D';
import BusinessCADUpload from './pages/BusinessCADUpload';
import BusinessCart from './pages/BusinessCart';
import BusinessCatalog from './pages/BusinessCatalog';
import BusinessCheckout from './pages/BusinessCheckout';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessMarketplace from './pages/BusinessMarketplace';
import BusinessProductDetail from './pages/BusinessProductDetail';
import CampusManagementCenter from './pages/CampusManagementCenter';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ConsumerDashboard from './pages/ConsumerDashboard';
import Contact from './pages/Contact';
import CustomPrintRequest from './pages/CustomPrintRequest';
import DesignerDashboard from './pages/DesignerDashboard';
import DesignerHowItWorks from './pages/DesignerHowItWorks';
import DesignerProfile from './pages/DesignerProfile';
import DesignerSignup from './pages/DesignerSignup';
import FAQ from './pages/FAQ';
import FixMakers from './pages/FixMakers';
import ForDesigners from './pages/ForDesigners';
import ForMakers from './pages/ForMakers';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import MakerDashboard from './pages/MakerDashboard';
import MakerHowItWorks from './pages/MakerHowItWorks';
import MakerSignup from './pages/MakerSignup';
import Marketplace from './pages/Marketplace';
import PaymentSuccess from './pages/PaymentSuccess';
import Privacy from './pages/Privacy';
import ProductDetail from './pages/ProductDetail';
import ReportIssue from './pages/ReportIssue';
import SubscriptionConfirmation from './pages/SubscriptionConfirmation';
import SystemDebug from './pages/SystemDebug';
import Terms from './pages/Terms';
import Wishlist from './pages/Wishlist';
import jc3dcommandcenter from './pages/jc3dcommandcenter';
import businessmarketplaceArchived from './pages/BusinessMarketplace.archived';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountInfo": AccountInfo,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminPortalJC3D": AdminPortalJC3D,
    "BusinessCADUpload": BusinessCADUpload,
    "BusinessCart": BusinessCart,
    "BusinessCatalog": BusinessCatalog,
    "BusinessCheckout": BusinessCheckout,
    "BusinessDashboard": BusinessDashboard,
    "BusinessMarketplace": BusinessMarketplace,
    "BusinessProductDetail": BusinessProductDetail,
    "CampusManagementCenter": CampusManagementCenter,
    "Cart": Cart,
    "Checkout": Checkout,
    "ConsumerDashboard": ConsumerDashboard,
    "Contact": Contact,
    "CustomPrintRequest": CustomPrintRequest,
    "DesignerDashboard": DesignerDashboard,
    "DesignerHowItWorks": DesignerHowItWorks,
    "DesignerProfile": DesignerProfile,
    "DesignerSignup": DesignerSignup,
    "FAQ": FAQ,
    "FixMakers": FixMakers,
    "ForDesigners": ForDesigners,
    "ForMakers": ForMakers,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "MakerDashboard": MakerDashboard,
    "MakerHowItWorks": MakerHowItWorks,
    "MakerSignup": MakerSignup,
    "Marketplace": Marketplace,
    "PaymentSuccess": PaymentSuccess,
    "Privacy": Privacy,
    "ProductDetail": ProductDetail,
    "ReportIssue": ReportIssue,
    "SubscriptionConfirmation": SubscriptionConfirmation,
    "SystemDebug": SystemDebug,
    "Terms": Terms,
    "Wishlist": Wishlist,
    "jc3dcommandcenter": jc3dcommandcenter,
    "BusinessMarketplace.archived": businessmarketplaceArchived,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};