import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
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

// Component to handle navigation within Router context
function NavigationHandler() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => {
      const sessionCheck = securityUtils.validateSession();
      if (!sessionCheck.isValid && window.location.pathname !== '/login') {
        securityUtils.logSecurityEvent('SESSION_INVALID', sessionCheck.reason || 'Unknown reason');
        navigate('/login', { replace: true });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  return null;
}

function AppRouter() {
  const { isAuthenticated, user, isInitialized, initialize } = useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Iniciando aplicación...
          </h2>
          <p className="text-gray-600">
            Cargando configuración de usuario
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <NavigationHandler />
      <Routes>
        {!isAuthenticated || !user ? (
          <>
            <Route path="/login" element={<LoginForm onSuccess={() => {}} />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Login redirect to dashboard if already authenticated */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes with layout */}
            <Route
              path="/*"
              element={
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
              }
            />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default AppRouter;