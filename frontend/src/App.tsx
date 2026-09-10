import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";
import { ChallansPage } from "./pages/ChallansPage";
import { ChallanCreatePage } from "./pages/ChallanCreatePage";
import { ChallanDetailPage } from "./pages/ChallanDetailPage";

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <p className="mono" style={{ color: "var(--ink-muted)" }}>
          opening the console…
        </p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/challans" element={<ChallansPage />} />
        <Route path="/challans/new" element={<ChallanCreatePage />} />
        <Route path="/challans/:id" element={<ChallanDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}