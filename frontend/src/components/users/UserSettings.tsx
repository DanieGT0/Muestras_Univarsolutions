import { useState, useEffect } from 'react';
import {
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Key,
  Users,
  Search,
  Filter,
  UserX,
  UserCheck,
  Shield,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from '../../hooks/use-toast';
import { usersAPI, countriesAPI } from '../../lib/api';
import type {
  User,
  CreateUserData,
  UpdateUserData,
  Country,
  UserStats,
} from '../../types';
import { UserRole } from '../../types';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';
import { ChangePasswordModal } from './ChangePasswordModal';

export function UserSettings() {
  // Estados principales
  const [users, setUsers] = useState<User[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de interfaz
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Configuración de roles
  const ROLE_CONFIG = {
    [UserRole.ADMIN]: {
      label: 'Admin',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '👑',
    },
    [UserRole.USER]: {
      label: 'Usuario',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '👤',
    },
    [UserRole.COMMERCIAL]: {
      label: 'Comercial',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '💼',
    },
  };

  // Load data from API
  useEffect(() => {
    loadInitialData();
  }, [currentPage, searchTerm, roleFilter, statusFilter, countryFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load users from API
      const usersResponse = await usersAPI.getUsers(currentPage, itemsPerPage);
      // Add default values for fields that might not exist in the database
      const usersWithDefaults = usersResponse.data.map(user => ({
        ...user,
        countries: user.countries || [],
        has_transactions: user.has_transactions || false,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
      }));
      setUsers(usersWithDefaults);

      // Load user statistics
      const statsResponse = await usersAPI.getUserStats();
      setStats(statsResponse);

      // Load countries from API
      const countriesResponse = await countriesAPI.getCountries();
      setCountries(countriesResponse.data);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
    toast({
      title: 'Actualizado',
      description: 'Los datos se han actualizado correctamente',
    });
  };

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      await usersAPI.createUser(data);

      setShowForm(false);
      setEditingUser(null);

      toast({
        title: 'Usuario creado',
        description: `${data.full_name} ha sido creado exitosamente`,
      });

      // Reload data after creation
      await loadInitialData();

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (userId: string, data: UpdateUserData) => {
    try {
      await usersAPI.updateUser(userId, data);

      setShowForm(false);
      setEditingUser(null);

      toast({
        title: 'Usuario actualizado',
        description: 'Los cambios han sido guardados exitosamente',
      });

      // Reload data after update
      await loadInitialData();

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: boolean) => {
    try {
      await handleUpdateUser(userId, { is_active: newStatus });

      toast({
        title: newStatus ? 'Usuario activado' : 'Usuario desactivado',
        description: `El usuario ha sido ${newStatus ? 'activado' : 'desactivado'} correctamente`,
      });

    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.has_transactions) {
      toast({
        title: 'No se puede eliminar',
        description: 'Este usuario tiene transacciones registradas. Solo se puede desactivar.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar a ${user.full_name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await usersAPI.deleteUser(userId);

      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado exitosamente',
      });

      // Reload data after deletion
      await loadInitialData();

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleChangePassword = (user: User) => {
    setChangingPasswordUser(user);
    setShowChangePassword(true);
  };

  const handleChangePasswordSubmit = async (userId: string, newPassword: string) => {
    try {
      await usersAPI.changePassword(userId, newPassword);

      toast({
        title: 'Contraseña actualizada',
        description: 'La contraseña del usuario ha sido cambiada exitosamente',
      });

      setShowChangePassword(false);
      setChangingPasswordUser(null);

    } catch (error) {
      console.error('Error changing user password:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la contraseña del usuario',
        variant: 'destructive',
      });
    }
  };

  const handleExportUsers = () => {
    toast({
      title: 'Preparando exportación...',
      description: 'Generando archivo Excel con los usuarios',
    });

    // Aquí iría la lógica de exportación
    console.log('Exporting users...');
  };

  // Filtros aplicados
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    const matchesCountry = countryFilter === 'all' ||
                          user.countries.some(c => c.id.toString() === countryFilter);

    return matchesSearch && matchesRole && matchesStatus && matchesCountry;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Administrar usuarios y permisos del sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            variant="outline"
            onClick={handleExportUsers}
            disabled={filteredUsers.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>

          <Button
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Usuario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  Total Usuarios
                </p>
                <p className="text-3xl font-bold text-slate-700">{stats.total_users}</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-600">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  Usuarios Activos
                </p>
                <p className="text-3xl font-bold text-emerald-600">{stats.active_users}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  Usuarios Inactivos
                </p>
                <p className="text-3xl font-bold text-red-600">{stats.inactive_users}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-600">
                <UserX className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  Administradores
                </p>
                <p className="text-3xl font-bold text-purple-600">{stats.users_by_role.ADMIN}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-600">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Filtros:</span>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.USER}>Usuario</SelectItem>
                <SelectItem value={UserRole.COMMERCIAL}>Comercial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.cod} - {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Lista de Usuarios</h2>
            {filteredUsers.length > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando {paginatedUsers.length} de {filteredUsers.length} usuarios
              </p>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || countryFilter !== 'all'
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios registrados'
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || countryFilter !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda.'
                  : 'Comienza creando el primer usuario del sistema.'
                }
              </p>
              {(!searchTerm && roleFilter === 'all' && statusFilter === 'all' && countryFilter === 'all') && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Usuario
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Países</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead>Transacciones</TableHead>
                    <TableHead className="w-[250px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role];
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={`${roleConfig.color} font-medium`}>
                            <span className="mr-1">{roleConfig.icon}</span>
                            {roleConfig.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={user.is_active
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {user.role === UserRole.ADMIN ? (
                            <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
                              🌍 Todos los países
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {user.countries.slice(0, 2).map((country) => (
                                <Badge key={country.id} variant="outline" className="text-xs">
                                  {country.cod}
                                </Badge>
                              ))}
                              {user.countries.length > 2 && (
                                <Badge variant="outline" className="text-xs bg-gray-100">
                                  +{user.countries.length - 2}
                                </Badge>
                              )}
                              {user.countries.length === 0 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  Sin países
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm text-gray-600">
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString()
                            : 'Nunca'
                          }
                        </TableCell>

                        <TableCell>
                          {user.has_transactions ? (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs">Con datos</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Sin datos</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(user)}
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleChangePassword(user)}
                              title="Cambiar contraseña"
                              className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                            >
                              <Key className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user.id, !user.is_active)}
                              title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                              className={user.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>

                            {!user.has_transactions && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                title="Eliminar usuario"
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Anterior
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber: number;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-10 h-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          countries={countries}
          onSubmit={editingUser
            ? (data) => handleUpdateUser(editingUser.id, data as UpdateUserData)
            : (data) => handleCreateUser(data as CreateUserData)
          }
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={() => {
            setShowDetails(false);
            setSelectedUser(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            handleEditUser(selectedUser);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && changingPasswordUser && (
        <ChangePasswordModal
          user={changingPasswordUser}
          onSubmit={handleChangePasswordSubmit}
          onClose={() => {
            setShowChangePassword(false);
            setChangingPasswordUser(null);
          }}
        />
      )}
    </div>
  );
}