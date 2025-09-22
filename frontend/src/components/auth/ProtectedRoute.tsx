import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Lock, Shield } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { usePermissions, Module, Permission } from '../../hooks/usePermissions';
import { UserRole } from '../../types';
import { securityUtils } from '../../utils/securityUtils';

interface ProtectedRouteProps {
  children: ReactNode;
  module: Module;
  permission?: Permission;
  userRole: UserRole | null;
  userCountries?: number[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export function ProtectedRoute({
  children,
  module,
  permission = Permission.VIEW,
  userRole,
  userCountries = [],
  fallbackPath = '/dashboard',
  showAccessDenied = true,
}: ProtectedRouteProps) {
  const permissions = usePermissions({ userRole, userCountries });

  // Log access attempts
  useEffect(() => {
    securityUtils.logSecurityEvent('MODULE_ACCESS_ATTEMPT', `Module: ${module}, Role: ${userRole}, Permission: ${permission}`);
  }, [module, userRole, permission]);

  // Si no tiene rol (no autenticado), redirigir al login
  if (!userRole) {
    securityUtils.logSecurityEvent('ACCESS_DENIED', `No role provided for module: ${module}`);
    return <Navigate to="/login" replace />;
  }

  // Verificar si puede acceder al módulo
  const canAccessModule = permissions.canAccess(module);

  // Verificar si puede realizar la acción específica
  const canPerformAction = permission ? permissions.canPerform(module, permission) : true;

  // Si tiene acceso completo, mostrar el contenido
  if (canAccessModule && canPerformAction) {
    securityUtils.logSecurityEvent('ACCESS_GRANTED', `Module: ${module}, Role: ${userRole}`);
    return <>{children}</>;
  }

  // Log access denied
  securityUtils.logSecurityEvent('ACCESS_DENIED', `Module: ${module}, Role: ${userRole}, Can Access: ${canAccessModule}, Can Perform: ${canPerformAction}`);

  // Si no debe mostrar mensaje de acceso denegado, redirigir
  if (!showAccessDenied) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Mostrar página de acceso denegado
  return <AccessDeniedPage module={module} userRole={userRole} />;
}

interface AccessDeniedPageProps {
  module: Module;
  userRole: UserRole;
}

function AccessDeniedPage({ module, userRole }: AccessDeniedPageProps) {
  const getModuleName = (module: Module): string => {
    const moduleNames = {
      [Module.DASHBOARD]: 'Dashboard',
      [Module.SAMPLES]: 'Gestión de Muestras',
      [Module.MOVEMENTS]: 'Movimientos',
      [Module.TRANSFERS]: 'Transferencias',
      [Module.KARDEX]: 'Kardex',
      [Module.USER_SETTINGS]: 'Gestión de Usuarios',
      [Module.CONFIG]: 'Configuración',
    };
    return moduleNames[module] || 'Módulo';
  };

  const getRoleInfo = (role: UserRole) => {
    const roleInfo = {
      [UserRole.ADMIN]: {
        name: 'Administrador',
        description: 'Acceso completo al sistema',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      },
      [UserRole.USER]: {
        name: 'Usuario',
        description: 'Acceso a módulos operativos',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      },
      [UserRole.COMMERCIAL]: {
        name: 'Comercial',
        description: 'Acceso limitado al dashboard',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      },
    };
    return roleInfo[role];
  };

  const roleInfo = getRoleInfo(userRole);
  const moduleName = getModuleName(module);

  const getAccessMessage = (): string => {
    switch (userRole) {
      case UserRole.COMMERCIAL:
        return 'Los usuarios comerciales solo tienen acceso al Dashboard para consultar métricas y estadísticas de sus países asignados.';
      case UserRole.USER:
        if (module === Module.USER_SETTINGS) {
          return 'Los usuarios no tienen permisos para gestionar otros usuarios del sistema. Esta funcionalidad está reservada para administradores.';
        }
        return 'Tu rol de usuario no tiene permisos para acceder a este módulo. Contacta al administrador si necesitas acceso.';
      default:
        return 'No tienes los permisos necesarios para acceder a este módulo.';
    }
  };

  const getRecommendations = (): string[] => {
    switch (userRole) {
      case UserRole.COMMERCIAL:
        return [
          'Puedes acceder al Dashboard para ver métricas de tus países asignados',
          'Consulta reportes y estadísticas comerciales',
          'Contacta al administrador si necesitas acceso a más módulos',
        ];
      case UserRole.USER:
        return [
          'Tienes acceso a la gestión de muestras, movimientos y transferencias',
          'Puedes consultar el kardex y generar reportes',
          'Para gestión de usuarios, contacta a un administrador',
        ];
      default:
        return [
          'Verifica que tu cuenta tenga los permisos correctos',
          'Contacta al administrador del sistema para solicitar acceso',
        ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white">
        <div className="p-8 text-center">
          {/* Icono de acceso denegado */}
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-red-600" />
          </div>

          {/* Título principal */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Acceso Denegado
          </h1>

          {/* Mensaje específico */}
          <div className="mb-6">
            <p className="text-lg text-gray-700 mb-2">
              No puedes acceder al módulo <strong>{moduleName}</strong>
            </p>
            <p className="text-gray-600">
              {getAccessMessage()}
            </p>
          </div>

          {/* Información del rol actual */}
          <div className={`${roleInfo.bgColor} ${roleInfo.borderColor} border rounded-lg p-4 mb-6`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${roleInfo.color}`} />
              <span className={`font-semibold ${roleInfo.color}`}>
                Tu rol actual: {roleInfo.name}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {roleInfo.description}
            </p>
          </div>

          {/* Recomendaciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">¿Qué puedes hacer?</span>
            </div>
            <ul className="text-left text-sm text-blue-800 space-y-2">
              {getRecommendations().map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              ← Volver Atrás
            </Button>

            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              Ir al Dashboard
            </Button>
          </div>

          {/* Información de contacto */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Si crees que esto es un error, contacta al administrador del sistema
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Componente helper para proteger acciones específicas
interface ProtectedActionProps {
  children: ReactNode;
  module: Module;
  permission: Permission;
  userRole: UserRole | null;
  userCountries?: number[];
  fallback?: ReactNode;
  showTooltip?: boolean;
}

export function ProtectedAction({
  children,
  module,
  permission,
  userRole,
  userCountries = [],
  fallback = null,
  showTooltip = false,
}: ProtectedActionProps) {
  const permissions = usePermissions({ userRole, userCountries });

  const hasPermission = userRole &&
    permissions.canAccess(module) &&
    permissions.canPerform(module, permission);

  if (!hasPermission) {
    if (showTooltip) {
      return (
        <div title="No tienes permisos para esta acción" className="opacity-50 cursor-not-allowed">
          {fallback}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}