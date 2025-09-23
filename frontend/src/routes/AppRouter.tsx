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
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Router>
      <NavigationHandler />
      <Routes>
        {!isAuthenticated || !user ? (
          <>
            <Route path="/login" element={<LoginForm onSuccess={() => {}} />} />
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