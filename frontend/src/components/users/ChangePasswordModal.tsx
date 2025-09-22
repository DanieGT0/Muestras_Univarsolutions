import { useState } from 'react';
import { X, Lock, Eye, EyeOff, User, Shield, Key } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import type { User as UserType } from '../../types';

interface ChangePasswordModalProps {
  user: UserType;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
  onClose: () => void;
}

export function ChangePasswordModal({ user, onSubmit, onClose }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es obligatoria';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña debe contener al menos una letra minúscula';
    } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña debe contener al menos una letra mayúscula';
    } else if (!/(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña debe contener al menos un número';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme la nueva contraseña';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Confirmación adicional
    if (!window.confirm(`¿Estás seguro de que quieres cambiar la contraseña de ${user.full_name}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(user.id, formData.newPassword);
      onClose();
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar errores al empezar a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-md bg-white max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Cambiar Contraseña
              </h2>
              <p className="text-sm text-gray-500">
                Establecer nueva contraseña para el usuario
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Información del Usuario */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Usuario</h3>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600 uppercase font-medium">
                      {user.role === 'ADMIN' ? 'Administrador' : user.role === 'USER' ? 'Usuario' : 'Comercial'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia de Seguridad */}
          <Alert className="border-orange-200 bg-orange-50">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Importante:</strong> Esta acción cambiará la contraseña del usuario.
              El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
            </AlertDescription>
          </Alert>

          {/* Nueva Contraseña */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">Nueva Contraseña</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                Contraseña *
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Mínimo 8 caracteres, mayúsculas, minúsculas y números"
                  className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Contraseña *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Indicador de fortaleza de contraseña */}
            {formData.newPassword && (
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-2">Fortaleza de la contraseña:</div>
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${formData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${formData.newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Al menos 8 caracteres
                  </div>
                  <div className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Al menos una minúscula
                  </div>
                  <div className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Al menos una mayúscula
                  </div>
                  <div className={`flex items-center gap-2 ${/(?=.*\d)/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    Al menos un número
                  </div>
                </div>
              </div>
            )}
          </div>

          </form>
        </div>

        {/* Botones de Acción - Fijos en la parte inferior */}
        <div className="flex-shrink-0 border-t bg-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.newPassword || !formData.confirmPassword}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cambiando...
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Key className="w-4 h-4" />
                  <span className="hidden sm:inline">Cambiar Contraseña</span>
                  <span className="sm:hidden">Cambiar</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}