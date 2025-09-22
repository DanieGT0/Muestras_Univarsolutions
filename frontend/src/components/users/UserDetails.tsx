import { X, User, Mail, Shield, Globe, Calendar, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { User as UserType } from '../../types';
import { UserRole } from '../../types';

interface UserDetailsProps {
  user: UserType;
  onClose: () => void;
  onEdit?: () => void;
}

// Configuración de roles con colores y descripciones
const ROLE_CONFIG = {
  [UserRole.ADMIN]: {
    label: 'Administrador',
    description: 'Acceso completo a todos los módulos y configuraciones',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '👑',
    permissions: [
      'Gestión completa de usuarios',
      'Acceso a todos los módulos',
      'Configuraciones del sistema',
      'Reportes y estadísticas globales',
      'Gestión de países y ubicaciones'
    ]
  },
  [UserRole.USER]: {
    label: 'Usuario',
    description: 'Acceso a módulos operativos con restricción por país',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👤',
    permissions: [
      'Gestión de muestras',
      'Movimientos de inventario',
      'Transferencias entre ubicaciones',
      'Reportes por países asignados',
      'Consulta de kardex'
    ]
  },
  [UserRole.COMMERCIAL]: {
    label: 'Comercial',
    description: 'Acceso únicamente a dashboard con datos de países asignados',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '💼',
    permissions: [
      'Dashboard con métricas',
      'Estadísticas de países asignados',
      'Reportes de ventas y stock',
      'Indicadores comerciales'
    ]
  },
};

export function UserDetails({ user, onClose, onEdit }: UserDetailsProps) {
  const roleConfig = ROLE_CONFIG[user.role];

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = () => {
    if (user.is_active) {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
        text: 'Activo',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else {
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-600" />,
        text: 'Inactivo',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusInfo.className}`}>
              {statusInfo.icon}
              {statusInfo.text}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
              >
                Editar Usuario
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Información Personal */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Información Personal</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nombre Completo</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.full_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">ID de Usuario</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${statusInfo.className}`}>
                      {statusInfo.icon}
                      {statusInfo.text}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Rol y Permisos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Rol y Permisos</h3>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${roleConfig.color}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{roleConfig.icon}</span>
                  <div>
                    <h4 className="font-semibold">{roleConfig.label}</h4>
                    <p className="text-sm opacity-90">{roleConfig.description}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Permisos del Rol</h4>
                <ul className="space-y-2">
                  {roleConfig.permissions.map((permission, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Países Asignados */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Países Asignados</h3>
              <span className="text-xs text-gray-500">
                ({user.countries?.length || 0} países)
              </span>
            </div>

            {user.countries && user.countries.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {user.countries.map((country) => (
                    <div
                      key={country.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-md border"
                    >
                      <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {country.cod}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {country.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Este usuario no tiene países asignados
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actividad y Fechas */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Actividad</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    Fecha de Creación
                  </dt>
                  <dd className="text-sm text-gray-900">{formatDate(user.created_at)}</dd>
                </div>

                <div>
                  <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    Última Actualización
                  </dt>
                  <dd className="text-sm text-gray-900">{formatDate(user.updated_at)}</dd>
                </div>

                <div>
                  <dt className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
                    <Activity className="w-4 h-4" />
                    Último Acceso
                  </dt>
                  <dd className="text-sm text-gray-900">{formatDate(user.last_login)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Información de Seguridad */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Información de Seguridad</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado de Transacciones</dt>
                  <dd className="mt-1">
                    {user.has_transactions ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-orange-700">Tiene transacciones registradas</span>
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Solo desactivar
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Sin transacciones</span>
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Puede eliminarse
                        </Badge>
                      </div>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Restricciones</dt>
                  <dd className="mt-1">
                    <span className="text-sm text-gray-700">
                      {user.role === UserRole.COMMERCIAL ?
                        'Acceso limitado al dashboard' :
                        user.role === UserRole.USER ?
                        'Sin acceso a configuración de usuarios' :
                        'Sin restricciones'
                      }
                    </span>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end">
          <Button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700"
          >
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}