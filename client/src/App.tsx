import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfessionalLoader } from "@/components/ui/professional-loader";
import React, { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/LoginPage";

import WorkerAttendance from "@/pages/worker-attendance";

import DailyExpenses from "@/pages/daily-expenses";
import MaterialPurchase from "@/pages/material-purchase";
import Reports from "@/pages/reports";

import ProjectTransfers from "@/pages/project-transfers";
import ProjectTransactionsPage from "@/pages/project-transactions-simple";

import ProjectsPage from "@/pages/projects";
import WorkersPage from "@/pages/workers";
import WorkerAccountsPage from "@/pages/worker-accounts";
import SuppliersProPage from "@/pages/suppliers-professional";
import SupplierAccountsPage from "@/pages/supplier-accounts";
import AutocompleteAdminPage from "@/pages/autocomplete-admin";
import { EquipmentManagement } from "@/pages/equipment-management";
import AdvancedReports from "@/pages/advanced-reports";
import WorkersUnifiedReports from "@/pages/workers-unified-reports";
import NotificationsPage from "@/pages/notifications";
import AdminNotificationsPage from "@/pages/admin-notifications";
import AISystemDashboard from "@/pages/AISystemDashboard";
import SmartErrorsPage from "@/pages/SmartErrorsPage";
import { SecurityPoliciesPage } from "@/pages/SecurityPoliciesPage";

import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import FloatingAddButton from "@/components/layout/floating-add-button";
import { FloatingButtonProvider } from "@/components/layout/floating-button-context";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import RegisterPage from "@/pages/RegisterPage";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pb-20">
        {children}
      </main>
      <BottomNavigation />
      <FloatingAddButton />
    </>
  );
}

function Router() {
  console.log('🧭 [App.Router] بدء تحميل Router...', new Date().toISOString());
  
  return (
    <Switch>
      {/* صفحات غير محمية - بدون شريط علوي أو سفلي */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* صفحات محمية - مع شريط علوي وسفلي */}
      <Route path="/">
        <ProtectedRoute>
          <AuthLayout>
            <Dashboard />
          </AuthLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/projects">
        <ProtectedRoute>
          <AuthLayout>
            <ProjectsPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/workers">
        <ProtectedRoute>
          <AuthLayout>
            <WorkersPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/worker-accounts">
        <AdminRoute>
          <AuthLayout>
            <WorkerAccountsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/suppliers">
        <ProtectedRoute>
          <AuthLayout>
            <SuppliersProPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/suppliers-pro">
        <ProtectedRoute>
          <AuthLayout>
            <SuppliersProPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/supplier-accounts">
        <AdminRoute>
          <AuthLayout>
            <SupplierAccountsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/worker-attendance">
        <ProtectedRoute>
          <AuthLayout>
            <WorkerAttendance />
          </AuthLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/daily-expenses">
        <ProtectedRoute>
          <AuthLayout>
            <DailyExpenses />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/material-purchase">
        <ProtectedRoute>
          <AuthLayout>
            <MaterialPurchase />
          </AuthLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/material-purchases">
        <ProtectedRoute>
          <AuthLayout>
            <MaterialPurchase />
          </AuthLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/project-transfers">
        <AdminRoute>
          <AuthLayout>
            <ProjectTransfers />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/project-transactions">
        <AdminRoute>
          <AuthLayout>
            <ProjectTransactionsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/autocomplete-admin">
        <AdminRoute>
          <AuthLayout>
            <AutocompleteAdminPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/equipment">
        <AdminRoute>
          <AuthLayout>
            <EquipmentManagement />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/equipment-management">
        <AdminRoute>
          <AuthLayout>
            <EquipmentManagement />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/reports">
        <AdminRoute>
          <AuthLayout>
            <Reports />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/advanced-reports">
        <AdminRoute>
          <AuthLayout>
            <AdvancedReports />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/workers-unified-reports">
        <AdminRoute>
          <AuthLayout>
            <WorkersUnifiedReports />
          </AuthLayout>
        </AdminRoute>
      </Route>
      
      <Route path="/notifications">
        <ProtectedRoute>
          <AuthLayout>
            <NotificationsPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin-notifications">
        <AdminRoute>
          <AuthLayout>
            <AdminNotificationsPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/ai-system">
        <AdminRoute>
          <AuthLayout>
            <AISystemDashboard />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route path="/smart-errors">
        <ProtectedRoute>
          <AuthLayout>
            <SmartErrorsPage />
          </AuthLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/security-policies">
        <AdminRoute>
          <AuthLayout>
            <SecurityPoliciesPage />
          </AuthLayout>
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // تم إزالة كود DOM manipulation لتجنب الأخطاء

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <FloatingButtonProvider>
            <div className="min-h-screen bg-background text-foreground" dir="rtl">
              <Router />
              <Toaster />
            </div>
          </FloatingButtonProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
