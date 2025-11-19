import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import ProductDetail from './pages/ProductDetail';
import Wishlist from './pages/Wishlist';
import Cart from './pages/Cart';
import ForMakers from './pages/ForMakers';
import HowItWorks from './pages/HowItWorks';
import Checkout from './pages/Checkout';
import MakerSignup from './pages/MakerSignup';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ConsumerDashboard from './pages/ConsumerDashboard';
import MakerDashboard from './pages/MakerDashboard';
import CustomPrintRequest from './pages/CustomPrintRequest';
import SystemDebug from './pages/SystemDebug';
import FixMakers from './pages/FixMakers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminPortalJC3D from './pages/AdminPortalJC3D';
import jc3dcommandcenter from './pages/jc3dcommandcenter';
import FAQ from './pages/FAQ';
import PaymentSuccess from './pages/PaymentSuccess';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Marketplace": Marketplace,
    "ProductDetail": ProductDetail,
    "Wishlist": Wishlist,
    "Cart": Cart,
    "ForMakers": ForMakers,
    "HowItWorks": HowItWorks,
    "Checkout": Checkout,
    "MakerSignup": MakerSignup,
    "Contact": Contact,
    "Privacy": Privacy,
    "Terms": Terms,
    "ConsumerDashboard": ConsumerDashboard,
    "MakerDashboard": MakerDashboard,
    "CustomPrintRequest": CustomPrintRequest,
    "SystemDebug": SystemDebug,
    "FixMakers": FixMakers,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminPortalJC3D": AdminPortalJC3D,
    "jc3dcommandcenter": jc3dcommandcenter,
    "FAQ": FAQ,
    "PaymentSuccess": PaymentSuccess,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};