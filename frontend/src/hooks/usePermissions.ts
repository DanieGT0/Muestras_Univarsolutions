import { useMemo } from 'react';
import { UserRole } from '../types';

// Definición de módulos del sistema
export enum Module {
  DASHBOARD = 'DASHBOARD',
  SAMPLES = 'SAMPLES',
  MOVEMENTS = 'MOVEMENTS',
  TRANSFERS = 'TRANSFERS',
  KARDEX = 'KARDEX',
  USER_SETTINGS = 'USER_SETTINGS',
  CONFIG = 'CONFIG',
}

// Definición de acciones dentro de cada módulo
export enum Permission {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_ALL_COUNTRIES = 'VIEW_ALL_COUNTRIES',
}

// Configuración de permisos por rol
const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: {
    [Module.DASHBOARD]: [Permission.VIEW, Permission.EXPORT],
    [Module.SAMPLES]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.MOVEMENTS]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.TRANSFERS]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.KARDEX]: [Permission.VIEW, Permission.EXPORT],
    [Module.USER_SETTINGS]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.MANAGE_USERS],
    [Module.CONFIG]: [Permission.VIEW, Permission.EDIT],
    // Los ADMINs tienen acceso a todos los países
    global: [Permission.VIEW_ALL_COUNTRIES],
  },

  [UserRole.USER]: {
    [Module.DASHBOARD]: [Permission.VIEW, Permission.EXPORT],
    [Module.SAMPLES]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.MOVEMENTS]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.TRANSFERS]: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.DELETE, Permission.EXPORT],
    [Module.KARDEX]: [Permission.VIEW, Permission.EXPORT],
    // Los USERS NO tienen acceso a USER_SETTINGS
    [Module.CONFIG]: [Permission.VIEW], // Solo lectura en configuración
    // Los USERS solo ven datos de sus países asignados
    global: [],
  },

  [UserRole.COMMERCIAL]: {
    [Module.DASHBOARD]: [Permission.VIEW, Permission.EXPORT],
    // Los COMMERCIAL solo tienen acceso al dashboard
    // Solo ven datos de sus países asignados
    global: [],
  },
};

// Descripción de los módulos para UI
export const MODULE_INFO = {
  [Module.DASHBOARD]: {
    name: 'Dashboard',
    description: 'Panel de control con métricas y estadísticas',
    icon: '📊',
  },
  [Module.SAMPLES]: {
    name: 'Gestión de Muestras',
    description: 'Administrar muestras de laboratorio',
    icon: '🧪',
  },
  [Module.MOVEMENTS]: {
    name: 'Movimientos',
    description: 'Control de entradas y salidas de inventario',
    icon: '📦',
  },
  [Module.TRANSFERS]: {
    name: 'Transferencias',
    description: 'Traslados entre ubicaciones',
    icon: '🔄',
  },
  [Module.KARDEX]: {
    name: 'Kardex',
    description: 'Historial de movimientos detallado',
    icon: '📋',
  },
  [Module.USER_SETTINGS]: {
    name: 'Gestión de Usuarios',
    description: 'Administración de usuarios y permisos',
    icon: '👥',
  },
  [Module.CONFIG]: {
    name: 'Configuración',
    description: 'Configuraciones del sistema',
    icon: '⚙️',
  },
};

interface UsePermissionsParams {
  userRole: UserRole | null;
  userCountries?: number[]; // IDs de países asignados al usuario
}

interface PermissionCheck {
  canAccess: (module: Module) => boolean;
  canPerform: (module: Module, permission: Permission) => boolean;
  hasGlobalAccess: () => boolean;
  getAccessibleModules: () => Module[];
  getModulePermissions: (module: Module) => Permission[];
  canViewAllCountries: () => boolean;
  getFilteredData: <T>(data: T[], getCountryId: (item: T) => number) => T[];
}

export function usePermissions({ userRole, userCountries = [] }: UsePermissionsParams): PermissionCheck {
  return useMemo(() => {
    // Si no hay rol, no hay permisos
    if (!userRole) {
      return {
        canAccess: () => false,
        canPerform: () => false,
        hasGlobalAccess: () => false,
        getAccessibleModules: () => [],
        getModulePermissions: () => [],
        canViewAllCountries: () => false,
        getFilteredData: () => [],
      };
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole];
    const globalPermissions = rolePermissions.global || [];

    const canAccess = (module: Module): boolean => {
      return module in rolePermissions && rolePermissions[module].length > 0;
    };

    const canPerform = (module: Module, permission: Permission): boolean => {
      if (!canAccess(module)) return false;
      return rolePermissions[module].includes(permission);
    };

    const hasGlobalAccess = (): boolean => {
      return userRole === UserRole.ADMIN;
    };

    const getAccessibleModules = (): Module[] => {
      return Object.keys(rolePermissions)
        .filter(module => module !== 'global' && rolePermissions[module as Module].length > 0)
        .map(module => module as Module);
    };

    const getModulePermissions = (module: Module): Permission[] => {
      return rolePermissions[module] || [];
    };

    const canViewAllCountries = (): boolean => {
      return globalPermissions.includes(Permission.VIEW_ALL_COUNTRIES);
    };

    const getFilteredData = <T>(data: T[], getCountryId: (item: T) => number): T[] => {
      // Los ADMINs ven todos los datos
      if (canViewAllCountries()) {
        return data;
      }

      // Los demás usuarios solo ven datos de sus países asignados
      return data.filter(item => {
        const countryId = getCountryId(item);
        return userCountries.includes(countryId);
      });
    };

    return {
      canAccess,
      canPerform,
      hasGlobalAccess,
      getAccessibleModules,
      getModulePermissions,
      canViewAllCountries,
      getFilteredData,
    };
  }, [userRole, userCountries]);
}

// Hook específico para componentes de UI
export function useModulePermissions(module: Module, userRole: UserRole | null, userCountries?: number[]) {
  const permissions = usePermissions({ userRole, userCountries });

  return useMemo(() => ({
    canAccess: permissions.canAccess(module),
    canView: permissions.canPerform(module, Permission.VIEW),
    canCreate: permissions.canPerform(module, Permission.CREATE),
    canEdit: permissions.canPerform(module, Permission.EDIT),
    canDelete: permissions.canPerform(module, Permission.DELETE),
    canExport: permissions.canPerform(module, Permission.EXPORT),
    canManageUsers: permissions.canPerform(module, Permission.MANAGE_USERS),
  }), [permissions, module]);
}

// Utilidad para verificar si un usuario puede acceder a una ruta
export function canAccessRoute(route: string, userRole: UserRole | null): boolean {
  if (!userRole) return false;

  const routeModuleMap: Record<string, Module> = {
    '/dashboard': Module.DASHBOARD,
    '/samples': Module.SAMPLES,
    '/movements': Module.MOVEMENTS,
    '/transfers': Module.TRANSFERS,
    '/kardex': Module.KARDEX,
    '/users': Module.USER_SETTINGS,
    '/config': Module.CONFIG,
  };

  const module = routeModuleMap[route];
  if (!module) return true; // Rutas no mapeadas son accesibles por defecto

  const permissions = usePermissions({ userRole });
  return permissions.canAccess(module);
}

// Utilidad para obtener las rutas disponibles para un usuario
export function getAvailableRoutes(userRole: UserRole | null): Array<{
  path: string;
  module: Module;
  name: string;
  description: string;
  icon: string;
}> {
  if (!userRole) return [];

  const permissions = usePermissions({ userRole });
  const accessibleModules = permissions.getAccessibleModules();

  const routeModuleMap: Record<Module, string> = {
    [Module.DASHBOARD]: '/dashboard',
    [Module.SAMPLES]: '/samples',
    [Module.MOVEMENTS]: '/movements',
    [Module.TRANSFERS]: '/transfers',
    [Module.KARDEX]: '/kardex',
    [Module.USER_SETTINGS]: '/users',
    [Module.CONFIG]: '/config',
  };

  return accessibleModules.map(module => ({
    path: routeModuleMap[module],
    module,
    name: MODULE_INFO[module].name,
    description: MODULE_INFO[module].description,
    icon: MODULE_INFO[module].icon,
  }));
}