import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';
import SaturnV from './pages/SaturnV';
import SLS from './pages/SLS';
import Starship from './pages/Starship';
import StripeSetupComplete from './pages/StripeSetupComplete';
import AffiliateSignup from './pages/AffiliateSignup';
import About from './pages/About';
import MoonMissionsCollection from './pages/MoonMissionsCollection';
import HeavyLiftCollection from './pages/HeavyLiftCollection';
import { Navigate } from 'react-router-dom';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}><ErrorBoundary>{children}</ErrorBoundary></Layout>
  : <ErrorBoundary>{children}</ErrorBoundary>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/StripeSetupComplete" element={<LayoutWrapper currentPageName="StripeSetupComplete"><StripeSetupComplete /></LayoutWrapper>} />
      <Route path="/AffiliateSignup" element={<LayoutWrapper currentPageName="AffiliateSignup"><AffiliateSignup /></LayoutWrapper>} />
      <Route path="/About" element={<LayoutWrapper currentPageName="About"><About /></LayoutWrapper>} />
      <Route path="/MoonMissionsCollection" element={<MoonMissionsCollection />} />
      <Route path="/HeavyLiftCollection" element={<HeavyLiftCollection />} />
      <Route path="/StarshipLaunch" element={<Starship />} />
      <Route path="/Starship" element={<Starship />} />
      <Route path="/SaturnV" element={<SaturnV />} />
      <Route path="/SLS" element={<SLS />} />
      {/* Legacy aliases — redirect so old links and ads still work */}
      <Route path="/rocketcollection" element={<Navigate to="/HeavyLiftCollection" replace />} />
      <Route path="/HeavyLift" element={<Navigate to="/HeavyLiftCollection" replace />} />
      <Route path="/MoonMissions" element={<Navigate to="/MoonMissionsCollection" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App