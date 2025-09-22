import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RouteGuard } from '../components/auth/RouteGuard';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { SamplesManagement } from '../components/samples/SamplesManagement';
import { MovementsManagement } from '../components/movements/MovementsManagement';
import { KardexManagement } from '../components/kardex/KardexManagement';
import { TransfersManagement } from '../components/transfers/TransfersManagement';
import { ImportManagement } from '../components/imports/ImportManagement';
import { ConfigurationsManagement } from '../components/config/ConfigurationsManagement';
import { UserSettings } from '../components/users/UserSettings';
import { SecurityManagement } from '../components/security/SecurityManagement';
import { Module } from '../hooks/usePermissions';
import { securityUtils } from '../utils/securityUtils';

function AppRouter() {
  const { isAuthenticated, user } = useAuthStore();

  // Initialize security monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const sessionCheck = securityUtils.validateSession();
      if (!sessionCheck.isValid && window.location.pathname !== '/login') {
        securityUtils.logSecurityEvent('SESSION_INVALID', sessionCheck.reason || 'Unknown reason');
        window.location.href = '/login';
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Si no está autenticado, solo mostrar login
  if (!isAuthenticated || !user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm onSuccess={() => window.location.href = '/dashboard'} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // Si está autenticado, mostrar rutas protegidas
  return (
    <Router>
      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Login redirect to dashboard if already authenticated */}
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />

        {/* Protected routes with layout */}
        <Route
          path="/*"
          element={
            <RouteGuard>
              <MainLayout>
                <Routes>
                {/* Dashboard - Accessible to all authenticated users */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute
                      module={Module.DASHBOARD}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <DashboardOverview />
                    </ProtectedRoute>
                  }
                />

                {/* Samples Management */}
                <Route
                  path="/samples"
                  element={
                    <ProtectedRoute
                      module={Module.SAMPLES}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <SamplesManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Movements */}
                <Route
                  path="/movements"
                  element={
                    <ProtectedRoute
                      module={Module.MOVEMENTS}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <MovementsManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Kardex */}
                <Route
                  path="/kardex"
                  element={
                    <ProtectedRoute
                      module={Module.KARDEX}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <KardexManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Transfers */}
                <Route
                  path="/transfers"
                  element={
                    <ProtectedRoute
                      module={Module.TRANSFERS}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <TransfersManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Imports */}
                <Route
                  path="/imports"
                  element={
                    <ProtectedRoute
                      module={Module.SAMPLES}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <ImportManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Configuration */}
                <Route
                  path="/config"
                  element={
                    <ProtectedRoute
                      module={Module.CONFIG}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <ConfigurationsManagement />
                    </ProtectedRoute>
                  }
                />

                {/* User Management */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute
                      module={Module.USER_SETTINGS}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <UserSettings />
                    </ProtectedRoute>
                  }
                />

                {/* Security */}
                <Route
                  path="/security"
                  element={
                    <ProtectedRoute
                      module={Module.USER_SETTINGS}
                      userRole={user.role}
                      userCountries={user.countries?.map(c => c.id) || []}
                    >
                      <SecurityManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            </RouteGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default AppRouter;