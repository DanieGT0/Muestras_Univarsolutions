import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuth';
import { Card } from '../ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, user, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAccess = async () => {
      setIsValidating(true);

      // Check basic authentication
      const savedToken = localStorage.getItem('auth_token');

      if (!savedToken || !token || !isAuthenticated || !user) {
        console.log('🔒 RouteGuard: Access denied - Not authenticated');
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      // Validate token format and expiration
      try {
        const tokenParts = savedToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }

        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp < currentTime) {
          console.log('🔒 RouteGuard: Token expired');
          localStorage.removeItem('auth_token');
          navigate('/login', { replace: true });
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // Additional user validation
        if (!user.id || !user.email || !user.role) {
          console.log('🔒 RouteGuard: Invalid user data');
          localStorage.removeItem('auth_token');
          navigate('/login', { replace: true });
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        // All validations passed
        setIsValid(true);
        console.log('✅ RouteGuard: Access granted for user:', user.email);

      } catch (error) {
        console.log('🔒 RouteGuard: Token validation failed:', error);
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
        setIsValid(false);
      }

      setIsValidating(false);
    };

    validateAccess();
  }, [isAuthenticated, user, token, navigate, location.pathname]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Validando Acceso
          </h2>
          <p className="text-gray-600">
            Verificando permisos de usuario...
          </p>
        </Card>
      </div>
    );
  }

  // Show error if validation failed
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta página. Redirigiendo al login...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-600 h-2 rounded-full animate-pulse w-full"></div>
          </div>
        </Card>
      </div>
    );
  }

  // Render children if all validations passed
  return <>{children}</>;
}

// Higher-order component for route protection
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    return (
      <RouteGuard>
        <Component {...props} />
      </RouteGuard>
    );
  };
}