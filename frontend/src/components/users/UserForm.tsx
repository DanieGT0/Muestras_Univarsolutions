import { useState } from 'react';
import { X, User, Mail, Lock, Shield, Globe, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import type {
  User as UserType,
  CreateUserData,
  UpdateUserData,
  Country,
} from '../../types';
import { UserRole } from '../../types';

interface UserFormProps {
  user?: UserType | null;
  countries: Country[];
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  onClose: () => void;
}

// Configuración de roles con permisos y descripciones
const ROLE_CONFIG = {
  [UserRole.ADMIN]: {
    label: 'Administrador',
    description: 'Acceso completo a todos los módulos y configuraciones',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '👑',
  },
  [UserRole.USER]: {
    label: 'Usuario',
    description: 'Acceso a todos los módulos excepto configuración de usuarios',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '👤',
  },
  [UserRole.COMMERCIAL]: {
    label: 'Comercial',
    description: 'Acceso únicamente al módulo Dashboard',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '💼',
  },
};

export function UserForm({ user, countries, onSubmit, onClose }: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    email: user?.email || '',
    full_name: user?.full_name || '',
    password: '',
    confirm_password: '',
    role: user?.role || UserRole.USER,
    country_ids: user?.countries?.map(c => c.id) || [],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isEditing = !!user;

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    // Name validation
    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'El nombre completo es obligatorio';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Password validation (only for new users or when password is being changed)
    if (!isEditing || formData.password) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Confirme la contraseña';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Las contraseñas no coinciden';
      }
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Seleccione un rol';
    }

    // Countries validation (no aplica para ADMIN que tiene acceso a todos los países)
    if (formData.role !== UserRole.ADMIN && (!formData.country_ids || formData.country_ids.length === 0)) {
      newErrors.countries = 'Debe asignar al menos un país';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting user form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (countryId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      country_ids: checked
        ? [...(prev.country_ids || []), countryId]
        : (prev.country_ids || []).filter(id => id !== countryId)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Modificar información del usuario' : 'Configurar acceso y permisos'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Información Personal</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Nombre Completo *
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    full_name: e.target.value
                  }))}
                  placeholder="Ej: Juan Carlos Pérez"
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-600">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  placeholder="usuario@empresa.com"
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isEditing} // Email no se puede cambiar al editar
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contraseñas (solo para usuarios nuevos o cuando se quiere cambiar) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Seguridad</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      placeholder="Mínimo 8 caracteres"
                      className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium">
                    Confirmar Contraseña *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirm_password || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        confirm_password: e.target.value
                      }))}
                      placeholder="Repita la contraseña"
                      className={errors.confirm_password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-sm text-red-600">{errors.confirm_password}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rol y Permisos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Rol y Permisos</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Rol del Usuario *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData(prev => ({
                  ...prev,
                  role: value
                }))}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{config.icon}</span>
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role}</p>
              )}

              {/* Mostrar información del rol seleccionado */}
              {formData.role && (
                <div className={`mt-3 p-3 rounded-lg border ${ROLE_CONFIG[formData.role].color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{ROLE_CONFIG[formData.role].icon}</span>
                    <span className="font-medium text-sm">{ROLE_CONFIG[formData.role].label}</span>
                  </div>
                  <p className="text-xs opacity-90">{ROLE_CONFIG[formData.role].description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Asignación de Países */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Asignación de Países</h3>
              {formData.role !== UserRole.ADMIN && (
                <span className="text-xs text-gray-500 ml-2">
                  (El usuario tendrá acceso solo a la información de estos países)
                </span>
              )}
            </div>

            {formData.role === UserRole.ADMIN ? (
              <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">Acceso de Administrador</span>
                </div>
                <p className="text-sm text-red-700">
                  Los administradores tienen acceso completo a todos los países y configuraciones del sistema.
                  No es necesario asignar países específicos.
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                  {countries.map((country) => (
                    <div key={country.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`country-${country.id}`}
                        checked={formData.country_ids?.includes(country.id) || false}
                        onCheckedChange={(checked) =>
                          handleCountryChange(country.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`country-${country.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        <span className="font-mono text-xs bg-gray-200 px-1 rounded mr-1">
                          {country.cod}
                        </span>
                        {country.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.countries && (
                  <p className="text-sm text-red-600">{errors.countries}</p>
                )}
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </div>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}