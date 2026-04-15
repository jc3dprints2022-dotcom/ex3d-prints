import AccountInfo from './pages/AccountInfo';
import AccountTypeSelect from './pages/AccountTypeSelect';
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
import MakerHowItWorks from './pages/MakerHowItWorks';
import MakerSignup from './pages/MakerSignup';
import Marketplace from './pages/Marketplace';
import PaymentSuccess from './pages/PaymentSuccess';
import Privacy from './pages/Privacy';
import ProductDetail from './pages/ProductDetail';
import ReportIssue from './pages/ReportIssue';
import Terms from './pages/Terms';
import Wishlist from './pages/Wishlist';
import jc3dcommandcenter from './pages/jc3dcommandcenter';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AccountInfo": AccountInfo,
    "AccountTypeSelect": AccountTypeSelect,
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
    "MakerHowItWorks": MakerHowItWorks,
    "MakerSignup": MakerSignup,
    "Marketplace": Marketplace,
    "PaymentSuccess": PaymentSuccess,
    "Privacy": Privacy,
    "ProductDetail": ProductDetail,
    "ReportIssue": ReportIssue,
    "Terms": Terms,
    "Wishlist": Wishlist,
    "jc3dcommandcenter": jc3dcommandcenter,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};