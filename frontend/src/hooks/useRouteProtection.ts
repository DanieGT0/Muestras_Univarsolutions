import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './useAuth';

export function useRouteProtection() {
  const { isAuthenticated, user, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if token exists in localStorage (for persistence)
    const savedToken = localStorage.getItem('auth_token');

    // If no token or not authenticated, redirect to login
    if (!savedToken || !token || !isAuthenticated || !user) {
      if (location.pathname !== '/login') {
        console.log('🔒 Unauthorized access blocked:', location.pathname);
        navigate('/login', { replace: true });
      }
      return;
    }

    // Additional token validation
    try {
      // Decode JWT to check expiration
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp < currentTime) {
        console.log('🔒 Token expired, redirecting to login');
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
        return;
      }
    } catch (error) {
      console.log('🔒 Invalid token, redirecting to login');
      localStorage.removeItem('auth_token');
      navigate('/login', { replace: true });
      return;
    }

    // If on login page but authenticated, redirect to dashboard
    if (location.pathname === '/login' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }

  }, [isAuthenticated, user, token, navigate, location.pathname]);

  return {
    isAuthenticated: isAuthenticated && !!user && !!token,
    user,
    isLoading: false
  };
}

// Hook to check if current route is protected
export function useRouteAuthCheck() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Public routes that don't require authentication
  const publicRoutes = ['/login'];

  const isPublicRoute = publicRoutes.includes(location.pathname);
  const shouldRedirectToLogin = !isPublicRoute && (!isAuthenticated || !user);
  const shouldRedirectToDashboard = isPublicRoute && isAuthenticated && user;

  return {
    isPublicRoute,
    shouldRedirectToLogin,
    shouldRedirectToDashboard,
    isAuthenticated: isAuthenticated && !!user
  };
}