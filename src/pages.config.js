import AccountInfo from './pages/AccountInfo';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminPortalJC3D from './pages/AdminPortalJC3D';
import CampusManagementCenter from './pages/CampusManagementCenter';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import CustomPrintRequest from './pages/CustomPrintRequest';
import DesignerDashboard from './pages/DesignerDashboard';
import DesignerHowItWorks from './pages/DesignerHowItWorks';
import DesignerSignup from './pages/DesignerSignup';
import FAQ from './pages/FAQ';
import FixMakers from './pages/FixMakers';
import ForDesigners from './pages/ForDesigners';
import ForMakers from './pages/ForMakers';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import MakerSignup from './pages/MakerSignup';
import Marketplace from './pages/Marketplace';
import PaymentSuccess from './pages/PaymentSuccess';
import Privacy from './pages/Privacy';
import ProductDetail from './pages/ProductDetail';
import SystemDebug from './pages/SystemDebug';
import Terms from './pages/Terms';
import Wishlist from './pages/Wishlist';
import jc3dcommandcenter from './pages/jc3dcommandcenter';
import ConsumerDashboard from './pages/ConsumerDashboard';
import MakerDashboard from './pages/MakerDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountInfo": AccountInfo,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminPortalJC3D": AdminPortalJC3D,
    "CampusManagementCenter": CampusManagementCenter,
    "Cart": Cart,
    "Checkout": Checkout,
    "Contact": Contact,
    "CustomPrintRequest": CustomPrintRequest,
    "DesignerDashboard": DesignerDashboard,
    "DesignerHowItWorks": DesignerHowItWorks,
    "DesignerSignup": DesignerSignup,
    "FAQ": FAQ,
    "FixMakers": FixMakers,
    "ForDesigners": ForDesigners,
    "ForMakers": ForMakers,
    "Home": Home,
    "HowItWorks": HowItWorks,
    "MakerSignup": MakerSignup,
    "Marketplace": Marketplace,
    "PaymentSuccess": PaymentSuccess,
    "Privacy": Privacy,
    "ProductDetail": ProductDetail,
    "SystemDebug": SystemDebug,
    "Terms": Terms,
    "Wishlist": Wishlist,
    "jc3dcommandcenter": jc3dcommandcenter,
    "ConsumerDashboard": ConsumerDashboard,
    "MakerDashboard": MakerDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};