import { Switch, Route, useLocation as useWouterLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider, useUserLocation } from "./context/LocationContext";
import { UiSettingsProvider, useUiSettings } from "./context/UiSettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { LocationPermissionModal } from "./components/LocationPermissionModal";
import Layout from "./components/Layout";
import { AdminLayout } from "./components/admin/AdminLayout";
import FloatingCartNotification from "./components/FloatingCartNotification";
import { LoginPage } from "./pages/LoginPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import DriverLoginPage from "./pages/driver/DriverLoginPage";
import AdminApp from "./pages/AdminApp";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDeliveryFees from "./pages/admin/AdminDeliveryFees";
import AdminUiSettings from "./pages/admin/AdminUiSettings";
import AdvancedReports from "./pages/admin/AdvancedReports";
import RestaurantReports from "./pages/admin/RestaurantReports";
import AdminDriversAdvanced from "./pages/AdminDriversAdvanced";
import AdminFinancialReports from "./pages/AdminFinancialReports";
import AdminHRManagement from "./pages/AdminHRManagement";
import AdminRestaurantsAdvanced from "./pages/AdminRestaurantsAdvanced";
import AdminSecurity from "./pages/AdminSecurity";
import RatingsManagement from "./pages/RatingsManagement";
import WalletManagement from "./pages/WalletManagement";
import DriverAppPage from "./pages/driver/DriverApp";
import { useState } from "react";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Location from "./pages/Location";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import OrdersPage from "./pages/OrdersPage";
import TrackOrdersPage from "./pages/TrackOrdersPage";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import SearchPage from "./pages/SearchPage";
// Admin pages removed - now handled separately
import NotFound from "@/pages/not-found";

import SplashScreen from "./components/SplashScreen";

function MainApp() {
  const { location: userLocation } = useUserLocation();
  const [currentLocation, setLocation] = useWouterLocation();
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splash_seen');
  });
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('is_guest') === 'true';
  });

  const { isAuthenticated } = useAuth();

  // Handle splash finish
  const handleSplashFinish = () => {
    sessionStorage.setItem('splash_seen', 'true');
    setShowSplash(false);
  };

  // If not authenticated and not guest, redirect to auth (unless already on auth or login pages)
  const isAuthPage = currentLocation === '/auth' || 
                     currentLocation === '/admin-login' || 
                     currentLocation === '/driver-login';

  const isAdminRoute = currentLocation.startsWith('/admin');
  const isDriverRoute = currentLocation.startsWith('/driver');

  if (showSplash && !isAdminRoute && !isDriverRoute && !isAuthPage) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (!isAuthenticated && !isGuest && !isAuthPage && !currentLocation.startsWith('/admin') && !currentLocation.startsWith('/driver')) {
    setLocation('/auth');
    return null;
  }

  // Handle login pages first (without layout)
  if (currentLocation === '/admin-login') {
    return <AdminLoginPage />;
  }
  
  if (currentLocation === '/driver-login') {
    return <DriverLoginPage />;
  }

  // Handle admin routes
  if (currentLocation.startsWith('/admin')) {
    return (
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={AdminApp} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/delivery-fees" component={AdminDeliveryFees} />
          <Route path="/admin/ui-settings" component={AdminUiSettings} />
          <Route path="/admin/advanced-reports" component={AdvancedReports} />
          <Route path="/admin/restaurant-reports" component={RestaurantReports} />
          <Route path="/admin/drivers-advanced" component={AdminDriversAdvanced} />
          <Route path="/admin/financial-reports" component={AdminFinancialReports} />
          <Route path="/admin/hr-management" component={AdminHRManagement} />
          <Route path="/admin/restaurants-advanced" component={AdminRestaurantsAdvanced} />
          <Route path="/admin/security" component={AdminSecurity} />
          <Route path="/admin/ratings" component={RatingsManagement} />
          <Route path="/admin/wallet" component={WalletManagement} />
          <Route path="/admin/:rest*" component={AdminApp} />
        </Switch>
      </AdminLayout>
    );
  }

  // Handle driver routes
  if (currentLocation.startsWith('/driver')) {
    return <DriverAppPage />;
  }

  // Default customer app
  return (
    <>
      <Layout>
        <Router />
      </Layout>
      <FloatingCartNotification />
      
      {showLocationModal && !userLocation.hasPermission && (
        <LocationPermissionModal
          onPermissionGranted={(position) => {
            console.log('تم منح الإذن للموقع:', position);
            setShowLocationModal(false);
          }}
          onPermissionDenied={() => {
            console.log('تم رفض الإذن للموقع');
            setShowLocationModal(false);
          }}
        />
      )}
    </>
  );
}

import CategoryPage from "./pages/CategoryPage";
import ProductDetails from "./pages/ProductDetails";
import CustomerAuthPage from "./pages/CustomerAuthPage";
import Favorites from "./pages/Favorites";

function Router() {
  // Check UiSettings for page visibility
  const { isFeatureEnabled } = useUiSettings();
  const showOrdersPage = isFeatureEnabled('show_orders_page');
  const showTrackOrdersPage = isFeatureEnabled('show_track_orders_page');

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/category/:slug" component={CategoryPage} />
      <Route path="/product/:id" component={ProductDetails} />
      <Route path="/restaurant/:id" component={Restaurant} />
      <Route path="/cart" component={Cart} />
      <Route path="/profile" component={Profile} />
      <Route path="/auth" component={CustomerAuthPage} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/addresses" component={Location} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/orders/:orderId" component={OrderTrackingPage} />
      {showTrackOrdersPage && <Route path="/track-orders" component={TrackOrdersPage} />}
      <Route path="/settings" component={Settings} />
      <Route path="/privacy" component={Privacy} />
      
      {/* Authentication Routes */}
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/driver-login" component={DriverLoginPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

import { LanguageProvider } from "./context/LanguageContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <UiSettingsProvider>
                <LocationProvider>
                  <CartProvider>
                    <NotificationProvider>
                      <Toaster />
                      <MainApp />
                    </NotificationProvider>
                  </CartProvider>
                </LocationProvider>
              </UiSettingsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
