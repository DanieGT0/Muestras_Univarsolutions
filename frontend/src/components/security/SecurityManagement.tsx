import { useState, useEffect } from 'react';
import {
  Shield,
  Database,
  Download,
  Trash2,
  Lock,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/table';
import { toast } from '../../hooks/use-toast';
import { securityAPI, countriesAPI } from '../../lib/api';
import { useAuthStore } from '../../hooks/useAuth';

interface TableInfo {
  name: string;
  recordCount: number;
  sizeBytes: number;
  columns: number;
  error?: string;
}


interface Country {
  id: number;
  name: string;
  cod: string;
}

export function SecurityManagement() {
  // Get user from Zustand store
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [tablesInfo, setTablesInfo] = useState<TableInfo[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form visibility states
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const MASTER_PASSWORD_HINT = "Univarsv@@$$";

  useEffect(() => {
    // Solo ejecutar las funciones de carga si el usuario está autenticado y es admin
    if (isAuthenticated && user && user.role === 'ADMIN') {
      loadTablesInfo();
      loadCountries();
    }
  }, [user, isAuthenticated]);

  const loadTablesInfo = async () => {
    try {
      setLoading(true);
      console.log('🔄 Making request to security API...');

      const response = await securityAPI.getTablesInfo();
      console.log('📊 Full API response:', response);
      console.log('📋 Tables in response:', response.tables);
      console.log('📈 Tables length:', response.tables?.length);

      if (response.tables && response.tables.length > 0) {
        console.log('✅ Setting tables info with data');
        setTablesInfo(response.tables);
      } else {
        console.log('⚠️ No tables found or empty array');
        setTablesInfo([]);
        toast({
          title: 'Información',
          description: 'No se encontraron tablas con datos. Esto puede ser normal si la base de datos está vacía.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading tables info:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });

      toast({
        title: 'Error',
        description: `Error: ${error.response?.data?.message || error.message || 'No se pudo conectar con el backend'}`,
        variant: 'destructive',
      });
      setTablesInfo([]);
    } finally {
      setLoading(false);
    }
  };


  const loadCountries = async () => {
    try {
      const response = await countriesAPI.getCountries();
      setCountries(response.data || []);
    } catch (error) {
      console.error('Error loading countries:', error);
      setCountries([]);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const response = await securityAPI.createBackup();

      // Create downloadable file
      const blob = new Blob([response.backupSQL], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Creado',
        description: `Backup de ${response.tableCount} tablas creado y descargado exitosamente`,
      });

    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo crear el backup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTables = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos una tabla para eliminar',
        variant: 'destructive',
      });
      return;
    }

    if (!deletePassword) {
      toast({
        title: 'Error',
        description: 'Ingresa la contraseña de autorización',
        variant: 'destructive',
      });
      return;
    }

    const countryName = selectedCountry
      ? countries.find(c => c.id === selectedCountry)?.name || 'País seleccionado'
      : 'TODOS LOS PAÍSES';

    const confirmMessage = `¿Estás seguro de que quieres eliminar las filas de las siguientes tablas?\n\nTablas: ${selectedTables.join(', ')}\nPaís: ${countryName}\n\n⚠️ ESTA ACCIÓN ES IRREVERSIBLE ⚠️`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const requestData: any = {
        tables: selectedTables,
        password: deletePassword
      };

      if (selectedCountry) {
        requestData.country_id = selectedCountry;
      }

      const response = await securityAPI.deleteTablesMassive(requestData);

      toast({
        title: 'Tablas Eliminadas',
        description: response.message,
      });

      setSelectedTables([]);
      setDeletePassword('');
      setSelectedCountry(null);
      setShowDeleteForm(false);
      loadTablesInfo();
    } catch (error: any) {
      console.error('Error deleting tables:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudieron eliminar las tablas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'La nueva contraseña y su confirmación no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres cambiar la contraseña maestra? Esto afectará todas las operaciones de seguridad.')) {
      return;
    }

    try {
      setLoading(true);
      await securityAPI.changeMasterPassword({
        currentPassword,
        newPassword,
        confirmPassword
      });

      toast({
        title: 'Contraseña Cambiada',
        description: 'La contraseña maestra ha sido actualizada exitosamente',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo cambiar la contraseña',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check authentication and permissions
  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-100">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Módulo de Seguridad</h2>
            <p className="text-gray-600">Acceso restringido</p>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Acceso Denegado:</strong> Debes iniciar sesión como administrador para acceder al módulo de seguridad.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-100">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Módulo de Seguridad</h2>
            <p className="text-gray-600">Permisos insuficientes</p>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Permisos Insuficientes:</strong> Solo los administradores pueden acceder al módulo de seguridad.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && tablesInfo.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Seguridad</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-red-100">
          <Shield className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Seguridad</h2>
          <p className="text-gray-600">Gestión de backup y operaciones críticas del sistema</p>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>¡Zona de Alto Riesgo!</strong> Este módulo contiene operaciones críticas que pueden eliminar datos permanentemente.
          Asegúrese de tener respaldos antes de proceder.
        </AlertDescription>
      </Alert>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Backup */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Database className="w-5 h-5" />
              Backup de Base de Datos
            </CardTitle>
            <CardDescription>
              Generar y descargar un respaldo completo de todas las tablas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Generando...' : 'Crear Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Mass Table Deletion */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Eliminación Masiva
            </CardTitle>
            <CardDescription>
              Eliminar todas las filas de las tablas seleccionadas y reiniciar sus secuencias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowDeleteForm(!showDeleteForm)}
              variant="destructive"
              className="w-full"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showDeleteForm ? 'Cerrar Formulario' : 'Eliminar Tablas'}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Key className="w-5 h-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Modificar la contraseña maestra para operaciones de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              <Lock className="w-4 h-4 mr-2" />
              {showPasswordForm ? 'Cerrar Formulario' : 'Cambiar Contraseña'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Tables Form */}
      {showDeleteForm && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Formulario de Eliminación Masiva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-300 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Esta operación eliminará TODOS los datos de las tablas seleccionadas y reiniciará sus secuencias de ID.
                <strong> Esta acción es IRREVERSIBLE.</strong>
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-sm font-medium mb-3 block">Seleccionar Tablas:</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {tablesInfo.map((table) => (
                  <div key={table.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={table.name}
                      checked={selectedTables.includes(table.name)}
                      onCheckedChange={() => toggleTableSelection(table.name)}
                    />
                    <label htmlFor={table.name} className="text-sm font-medium cursor-pointer">
                      {table.name} ({table.recordCount})
                    </label>
                  </div>
                ))}
              </div>
              {selectedTables.length > 0 && (
                <p className="text-sm mt-2 text-red-600">
                  {selectedTables.length} tabla(s) seleccionada(s)
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">
                <Globe className="w-4 h-4 inline mr-1" />
                Filtrar por País (Opcional):
              </Label>
              <Select
                value={selectedCountry?.toString() || "all"}
                onValueChange={(value) => setSelectedCountry(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país (opcional - todos los países por defecto)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los países</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      {country.name} ({country.cod})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedCountry
                  ? `Solo se eliminarán datos relacionados con ${countries.find(c => c.id === selectedCountry)?.name || 'el país seleccionado'}`
                  : 'Si no seleccionas un país, se eliminarán datos de TODOS los países'
                }
              </p>
            </div>

            <div>
              <Label htmlFor="deletePassword" className="text-sm font-medium">
                Contraseña de Autorización *
              </Label>
              <div className="relative">
                <Input
                  id="deletePassword"
                  type={showDeletePassword ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Ingrese la contraseña maestra"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                >
                  {showDeletePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Contraseña requerida: {MASTER_PASSWORD_HINT}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDeleteTables}
                variant="destructive"
                disabled={loading || selectedTables.length === 0 || !deletePassword}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {loading ? 'Eliminando...' : 'Eliminar Tablas Seleccionadas'}
              </Button>
              <Button
                onClick={() => setShowDeleteForm(false)}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Form */}
      {showPasswordForm && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Key className="w-5 h-5" />
              Cambiar Contraseña Maestra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentPassword">Contraseña Actual *</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Contraseña actual"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 8 caracteres)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nueva contraseña"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Key className="w-4 h-4 mr-2" />
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
              <Button
                onClick={() => setShowPasswordForm(false)}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Información de Tablas
          </CardTitle>
          <CardDescription>
            Estado actual de las tablas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tablesInfo.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {loading ? 'Cargando información de tablas...' : 'No se pudo cargar la información de las tablas. Verifica la conexión con el backend.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabla</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Columnas</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tablesInfo.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {table.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{table.recordCount.toLocaleString()}</TableCell>
                      <TableCell>{formatBytes(table.sizeBytes)}</TableCell>
                      <TableCell>{table.columns}</TableCell>
                      <TableCell>
                        {table.error ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Activa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}