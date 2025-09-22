/*
 * EJEMPLO DE INTEGRACIÓN DEL MÓDULO USER SETTINGS
 *
 * Este archivo muestra cómo integrar el módulo User Settings en la aplicación principal.
 * Incluye ejemplos de:
 * - Protección de rutas con permisos
 * - Filtrado de datos por país según el rol
 * - Navegación basada en permisos
 * - Integración con el contexto de autenticación
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { UserSettings } from './UserSettings';
import { ProtectedRoute, ProtectedAction } from '../auth/ProtectedRoute';
import { Module, Permission, usePermissions } from '../../hooks/usePermissions';
import { UserRole } from '../../types';

// Ejemplo de contexto de autenticación (reemplazar con el real)
interface AuthContextType {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    countries: Array<{ id: number; cod: string; name: string }>;
  } | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Hook de ejemplo para usar el contexto de auth (reemplazar con el real)
function useAuth(): AuthContextType {
  // Esta sería la implementación real de tu contexto de autenticación
  return {
    user: {
      id: '1',
      email: 'admin@empresa.com',
      full_name: 'Juan Carlos Admin',
      role: UserRole.ADMIN,
      countries: [
        { id: 1, cod: 'CO', name: 'Colombia' },
        { id: 2, cod: 'US', name: 'Estados Unidos' },
      ],
    },
    isAuthenticated: true,
    login: async () => {},
    logout: () => {},
  };
}

// Ejemplo de cómo integrar en el App principal
export function AppWithUserSettings() {
  const { user, isAuthenticated } = useAuth();

  const userRole = user?.role || null;
  const userCountries = user?.countries?.map(c => c.id) || [];

  return (
    <Routes>
      {/* Ruta protegida para User Settings - Solo ADMIN puede acceder */}
      <Route
        path="/users"
        element={
          <ProtectedRoute
            module={Module.USER_SETTINGS}
            permission={Permission.VIEW}
            userRole={userRole}
            userCountries={userCountries}
          >
            <UserSettings />
          </ProtectedRoute>
        }
      />

      {/* Otras rutas protegidas de ejemplo */}
      <Route
        path="/samples"
        element={
          <ProtectedRoute
            module={Module.SAMPLES}
            permission={Permission.VIEW}
            userRole={userRole}
            userCountries={userCountries}
          >
            {/* <SamplesManagement /> */}
            <div>Gestión de Muestras</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            module={Module.DASHBOARD}
            permission={Permission.VIEW}
            userRole={userRole}
            userCountries={userCountries}
          >
            {/* <Dashboard /> */}
            <div>Dashboard</div>
          </ProtectedRoute>
        }
      />

      {/* Ruta por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Ejemplo de navegación con permisos
export function NavigationWithPermissions() {
  const { user } = useAuth();
  const userRole = user?.role || null;
  const userCountries = user?.countries?.map(c => c.id) || [];

  const permissions = usePermissions({ userRole, userCountries });

  const navigationItems = [
    {
      path: '/dashboard',
      module: Module.DASHBOARD,
      name: 'Dashboard',
      icon: '📊',
    },
    {
      path: '/samples',
      module: Module.SAMPLES,
      name: 'Muestras',
      icon: '🧪',
    },
    {
      path: '/movements',
      module: Module.MOVEMENTS,
      name: 'Movimientos',
      icon: '📦',
    },
    {
      path: '/transfers',
      module: Module.TRANSFERS,
      name: 'Transferencias',
      icon: '🔄',
    },
    {
      path: '/kardex',
      module: Module.KARDEX,
      name: 'Kardex',
      icon: '📋',
    },
    {
      path: '/users',
      module: Module.USER_SETTINGS,
      name: 'Usuarios',
      icon: '👥',
    },
    {
      path: '/config',
      module: Module.CONFIG,
      name: 'Configuración',
      icon: '⚙️',
    },
  ];

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => (
        permissions.canAccess(item.module) && (
          <a
            key={item.path}
            href={item.path}
            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </a>
        )
      ))}
    </nav>
  );
}

// Ejemplo de componente con acciones protegidas
export function SampleActionsExample() {
  const { user } = useAuth();
  const userRole = user?.role || null;
  const userCountries = user?.countries?.map(c => c.id) || [];

  return (
    <div className="flex items-center gap-2">
      {/* Botón de ver - Todos los roles que pueden acceder al módulo */}
      <ProtectedAction
        module={Module.SAMPLES}
        permission={Permission.VIEW}
        userRole={userRole}
        userCountries={userCountries}
      >
        <button className="btn-outline">Ver Detalles</button>
      </ProtectedAction>

      {/* Botón de crear - Solo usuarios con permiso de creación */}
      <ProtectedAction
        module={Module.SAMPLES}
        permission={Permission.CREATE}
        userRole={userRole}
        userCountries={userCountries}
      >
        <button className="btn-primary">Crear Muestra</button>
      </ProtectedAction>

      {/* Botón de eliminar - Solo usuarios con permiso de eliminación */}
      <ProtectedAction
        module={Module.SAMPLES}
        permission={Permission.DELETE}
        userRole={userRole}
        userCountries={userCountries}
        showTooltip={true}
        fallback={
          <button className="btn-outline opacity-50 cursor-not-allowed">
            Eliminar
          </button>
        }
      >
        <button className="btn-danger">Eliminar</button>
      </ProtectedAction>
    </div>
  );
}

// Ejemplo de filtrado de datos por país
export function DataFilteringExample() {
  const { user } = useAuth();
  const userRole = user?.role || null;
  const userCountries = user?.countries?.map(c => c.id) || [];

  const permissions = usePermissions({ userRole, userCountries });

  // Ejemplo de datos de muestras
  const allSamples = [
    { id: 1, name: 'Muestra A', country_id: 1 }, // Colombia
    { id: 2, name: 'Muestra B', country_id: 2 }, // Estados Unidos
    { id: 3, name: 'Muestra C', country_id: 3 }, // México
  ];

  // Filtrar datos según permisos del usuario
  const visibleSamples = permissions.getFilteredData(
    allSamples,
    (sample) => sample.country_id
  );

  return (
    <div>
      <h3>Muestras Visibles para {user?.full_name}</h3>
      <p>Rol: {userRole} | Países: {userCountries.join(', ')}</p>

      {permissions.canViewAllCountries() && (
        <p className="text-green-600">✅ Puede ver datos de todos los países</p>
      )}

      <ul>
        {visibleSamples.map((sample) => (
          <li key={sample.id}>
            {sample.name} (País ID: {sample.country_id})
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
 * INSTRUCCIONES DE INTEGRACIÓN:
 *
 * 1. Instalar dependencias necesarias (si no están instaladas):
 *    npm install @radix-ui/react-checkbox
 *
 * 2. Agregar la ruta de User Settings en tu App.tsx:
 *    <Route path="/users" element={
 *      <ProtectedRoute module={Module.USER_SETTINGS} userRole={currentUserRole}>
 *        <UserSettings />
 *      </ProtectedRoute>
 *    } />
 *
 * 3. Agregar el item de navegación (solo para ADMIN):
 *    {permissions.canAccess(Module.USER_SETTINGS) && (
 *      <NavigationItem path="/users" icon={<Users />} label="Usuarios" />
 *    )}
 *
 * 4. Integrar con tu sistema de autenticación:
 *    - Actualizar la interfaz User con los nuevos campos
 *    - Implementar las llamadas API para CRUD de usuarios
 *    - Agregar validación de permisos en el backend
 *
 * 5. Personalizar estilos si es necesario:
 *    - Los componentes usan las clases de Tailwind CSS estándar
 *    - Puedes personalizar colores y estilos según tu design system
 */