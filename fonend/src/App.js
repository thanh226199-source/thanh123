import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// auth
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// dashboard & modules
import DashboardPage from "./pages/DashboardPage";
import MaterialsPage from "./pages/MaterialsPage";
import StockInPage from "./pages/StockInPage";
import StockOutPage from "./pages/StockOutPage";

// employees
import EmployeesPage from "./pages/EmployeesPage";
import CreateEmployeePage from "./pages/CreateEmployeePage";

// invoices
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceCreatePage from "./pages/InvoiceCreatePage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import InvoicePublicViewPage from "./pages/InvoicePublicViewPage"; // ✅ view public by QR

// loyalty
import LoyalCustomersPage from "./pages/LoyalCustomersPage";
import LoyaltyRulesPage from "./pages/LoyaltyRulesPage";

// reports
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* materials */}
        <Route
          path="/materials"
          element={
            <ProtectedRoute>
              <MaterialsPage />
            </ProtectedRoute>
          }
        />

        {/* stock */}
        <Route
          path="/stock/in"
          element={
            <ProtectedRoute>
              <StockInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/out"
          element={
            <ProtectedRoute>
              <StockOutPage />
            </ProtectedRoute>
          }
        />

        {/* employees */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/create"
          element={
            <ProtectedRoute>
              <CreateEmployeePage />
            </ProtectedRoute>
          }
        />

        {/* invoices */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/create"
          element={
            <ProtectedRoute>
              <InvoiceCreatePage />
            </ProtectedRoute>
          }
        />

        {/* ✅ PUBLIC VIEW (QR) */}
        <Route path="/invoices/view/:invoiceNo" element={<InvoicePublicViewPage />} />

        {/* ✅ detail (internal) */}
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />

        {/* loyalty */}
        <Route
          path="/loyal-customers"
          element={
            <ProtectedRoute>
              <LoyalCustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty/rules"
          element={
            <ProtectedRoute>
              <LoyaltyRulesPage />
            </ProtectedRoute>
          }
        />

        {/* reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
