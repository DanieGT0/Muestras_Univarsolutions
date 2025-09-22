import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../hooks/useAuth';
import { securityUtils } from '../utils/securityUtils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const login = useAuthStore((state) => state.login);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Función para limpiar errores cuando el usuario empiece a escribir
  const handleInputChange = () => {
    // NUNCA limpiar errores automáticamente - solo cuando el usuario haga submit exitoso
    // if (error && !isLoading && !isProcessing && !showSuccess) {
    //   setError(null);
    // }
  };

  const onSubmit = async (data: LoginFormData) => {
    // Prevenir múltiples clics
    if (isLoading || isProcessing) return;

    setIsLoading(true);
    setIsProcessing(true);
    // NO limpiar errores previos - dejar que permanezcan visibles

    try {
      // Simular proceso de conexión con delay mínimo
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await authAPI.login(data.email, data.password);

      // Log successful login
      securityUtils.logSecurityEvent('LOGIN_SUCCESS', `User: ${data.email}`);

      // Solo limpiar error en caso de éxito
      setError(null);
      setShowSuccess(true);
      setAttemptCount(0);

      // Delay para mostrar el éxito
      await new Promise(resolve => setTimeout(resolve, 1500));

      login(response.access_token, response.user);
      onSuccess();

    } catch (err: any) {
      // Incrementar contador de intentos
      setAttemptCount(prev => prev + 1);

      // Log failed login attempt
      securityUtils.logSecurityEvent('LOGIN_FAILED', `Email: ${data.email}, Status: ${err.response?.status || 'Unknown'}, Attempt: ${attemptCount + 1}`);

      // Mensaje de error más específico y claro que permanece visible
      if (err.response?.status === 401) {
        setError(`Su correo o contraseña es incorrecta. Vuelva a intentarlo. (Intento ${attemptCount + 1})`);
      } else if (err.response?.status === 403) {
        setError('Su cuenta está desactivada. Contacte al administrador.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al iniciar sesión. Verifique su conexión e intente nuevamente.');
      }
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-28 h-28 object-contain"
                onError={(e) => {
                  // Fallback si no se encuentra la imagen
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="w-28 h-28 bg-orange-500 rounded-full flex items-center justify-center"><span class="text-white font-bold text-3xl">S</span></div>';
                }}
              />
            </div>
          </div>

          <CardTitle className="text-2xl text-center text-orange-600">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Sistema de Gestión de Muestras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        disabled={isLoading || isProcessing}
                        onChange={(e) => {
                          field.onChange(e);
                          handleInputChange();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading || isProcessing}
                        onChange={(e) => {
                          field.onChange(e);
                          handleInputChange();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Mensaje de éxito */}
              {showSuccess && (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg shadow-sm">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="text-sm text-green-800 font-semibold block">¡Acceso autorizado!</span>
                      <span className="text-xs text-green-600 mt-1 block">Redirigiendo al sistema...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de error */}
              {error && !showSuccess && (
                <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg shadow-lg animate-bounce" style={{ animationIterationCount: 2 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-red-700 mt-0.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-center flex-1">
                        <span className="text-base text-red-900 font-bold block">{error}</span>
                        <span className="text-sm text-red-700 mt-2 block font-medium">⚠️ Corrija los datos e intente nuevamente</span>
                        <span className="text-xs text-red-600 mt-1 block italic">El mensaje permanecerá visible hasta que lo cierre</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors p-1"
                      title="Cerrar mensaje"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                className={`w-full transition-all duration-300 ${
                  showSuccess
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : isLoading || isProcessing
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
                disabled={isLoading || isProcessing || showSuccess}
              >
                <div className="flex items-center justify-center gap-2">
                  {isLoading && !showSuccess && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                  {showSuccess && (
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span>
                    {showSuccess
                      ? '¡Acceso Autorizado!'
                      : isLoading || isProcessing
                      ? 'Conectando...'
                      : 'Iniciar Sesión'
                    }
                  </span>
                </div>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}