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
import logoImage from '../assets/logo.png';
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-sm bg-white/95 relative z-10">
        <CardHeader className="space-y-6 pb-8">
          {/* Logo con efecto */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-105">
                <img
                  src={logoImage}
                  alt="Logo"
                  className="w-20 h-20 object-contain drop-shadow-xl"
                  onError={(e) => {
                    // Fallback si no se encuentra la imagen
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-white font-bold text-4xl">S</span>';
                  }}
                />
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Sistema de Gestión de Muestras
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-semibold">Correo Electrónico</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <Input
                          {...field}
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          className="pl-11 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                          disabled={isLoading || isProcessing}
                          onChange={(e) => {
                            field.onChange(e);
                            handleInputChange();
                          }}
                        />
                      </div>
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
                    <FormLabel className="text-gray-700 font-semibold">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-11 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                          disabled={isLoading || isProcessing}
                          onChange={(e) => {
                            field.onChange(e);
                            handleInputChange();
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Mensaje de éxito */}
              {showSuccess && (
                <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl shadow-lg">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-base text-green-800 font-bold block">¡Acceso Autorizado!</span>
                      <span className="text-sm text-green-600 mt-1 block">Redirigiendo al sistema...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de error */}
              {error && !showSuccess && (
                <div className="p-5 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-400 rounded-xl shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <span className="text-base text-red-900 font-bold block">{error}</span>
                        <span className="text-sm text-red-700 mt-1 block">Corrija los datos e intente nuevamente</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-100 rounded-full"
                      title="Cerrar mensaje"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                className={`w-full h-12 text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  showSuccess
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white'
                }`}
                disabled={isLoading || isProcessing || showSuccess}
              >
                <div className="flex items-center justify-center gap-2">
                  {isLoading && !showSuccess && (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                  {showSuccess && (
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
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