import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Marketing Pages
import { LandingPage } from './pages/public/LandingPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { SparePartsPage } from './pages/public/SparePartsPage';
import { PricingPage } from './pages/public/PricingPage';
import { FaqPage } from './pages/public/FaqPage';
import { TermsPage } from './pages/public/TermsPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { SupportPage } from './pages/public/SupportPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { DownloadAppPage } from './pages/public/DownloadAppPage';

// Authenticated ERP Workspace
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/app/DashboardPage';
import { POSPage } from './pages/app/POSPage';
import { ProductsPage } from './pages/app/ProductsPage';
import { InventoryPage } from './pages/app/InventoryPage';
import { PurchasesPage } from './pages/app/PurchasesPage';
import { SalesPage } from './pages/app/SalesPage';
import { InvoicesPage } from './pages/app/InvoicesPage';
import { PaymentsPage } from './pages/app/PaymentsPage';
import { SuppliersPage } from './pages/app/SuppliersPage';
import { CustomersPage } from './pages/app/CustomersPage';
import { ReportsPage } from './pages/app/ReportsPage';
import { SettingsPage } from './pages/app/SettingsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Marketing & SEO Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/inventory-management" element={<FeaturesPage />} />
          <Route path="/billing" element={<FeaturesPage />} />
          <Route path="/spare-parts" element={<SparePartsPage />} />
          <Route path="/garage-management" element={<SparePartsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/download-app" element={<DownloadAppPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated ERP Application Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
