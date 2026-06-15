import { Switch, Route } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDrivers from "./AdminDrivers";
import AdminOrders from "./AdminOrders";
import AdminRestaurants from "./AdminRestaurants";
import AdminMenuItems from "./AdminMenuItems";
import AdminOffers from "./AdminOffers";
import AdminCategories from "./AdminCategories";
import AdminUsers from "./AdminUsers";
import AdminProfile from "./AdminProfile";
import AdminUiSettings from "./admin/AdminUiSettings";
import AdminFinancialReports from "./AdminFinancialReports"; 
import AdminHRManagement from "./AdminHRManagement"; 
import AdminSecurity from "./AdminSecurity"; 
import AdminDriversAdvanced from "./AdminDriversAdvanced";
import AdminRestaurantsAdvanced from "./AdminRestaurantsAdvanced";
import AdminDashboard from "./admin/AdminDashboard";
import AdminDeliveryFees from "./admin/AdminDeliveryFees";
import AdminBackup from "./admin/AdminBackup";
import AdminCoupons from "./admin/AdminCoupons";
import AdminPaymentMethods from "./admin/AdminPaymentMethods";
import AdvancedReports from "./admin/AdvancedReports";
import AdminDetailedReports from "./admin/AdminDetailedReports";
import RestaurantReports from "./admin/RestaurantReports";
import RatingsManagement from "./RatingsManagement";
import WalletManagement from "./WalletManagement";
import NotFound from "./not-found";
import React from "react";

interface AdminAppProps {
  onLogout?: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = () => {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/menu-items" component={AdminMenuItems} />
        <Route path="/admin/drivers" component={AdminDrivers} />
        <Route path="/admin/drivers-advanced" component={AdminDriversAdvanced} />
        <Route path="/admin/delivery-fees" component={AdminDeliveryFees} />
        <Route path="/admin/offers" component={AdminOffers} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route path="/admin/financial-reports" component={AdminFinancialReports} />
        <Route path="/admin/hr-management" component={AdminHRManagement} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/ui-settings" component={AdminUiSettings} />
        <Route path="/admin/ratings" component={RatingsManagement} />
        <Route path="/admin/wallet" component={WalletManagement} />
        <Route path="/admin/backup" component={AdminBackup} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
        <Route path="/admin/detailed-reports" component={AdminDetailedReports} />
        <Route path="/admin/advanced-reports" component={AdvancedReports} />
        <Route path="/admin/restaurant-reports" component={RestaurantReports} />
        <Route path="/admin/restaurants-advanced" component={AdminRestaurantsAdvanced} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
};

export default AdminApp;
