import { useState, useEffect } from 'react';
import { Download, Eye, Trash2, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { Button } from '../ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../../hooks/use-toast';
import type {
  Movement
} from '../../types';
import { MovementDetails } from './MovementDetails';
import { movementsAPI } from '../../lib/api';

export function MovementsManagement() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({ totalMovimientos: 0, totalEntradas: 0, totalSalidas: 0 });

  useEffect(() => {
    loadMovements(1);
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await movementsAPI.getMovementsStats();
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMovements = async (page: number, limit?: number) => {
    try {
      setLoading(true);
      const effectiveLimit = limit !== undefined ? limit : itemsPerPage;
      const response = await movementsAPI.getMovements(page, effectiveLimit);
      setMovements(response.data);
      setTotalCount(response.count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los movimientos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteMovement = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      return;
    }

    try {
      await movementsAPI.deleteMovement(id);
      await loadMovements(currentPage);
      toast({
        title: 'Éxito',
        description: 'Movimiento eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el movimiento',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (movement: Movement) => {
    setSelectedMovement(movement);
    setShowDetails(true);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
            <p className="text-gray-600 mt-1">Cargando movimientos...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
            <p className="text-gray-600 mt-1">Control de entradas y salidas de inventario</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {}}
            disabled={totalCount === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Total Movimientos</p>
              <p className="text-3xl font-bold text-slate-700">{totalCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Entradas</p>
              <p className="text-3xl font-bold text-slate-700">{stats.totalEntradas}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-600">
              <ArrowUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Salidas</p>
              <p className="text-3xl font-bold text-slate-700">{stats.totalSalidas}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-600">
              <ArrowDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Movements Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Lista de Movimientos</h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando {startItem} - {endItem} de {totalCount} movimientos
              </p>
            )}
          </div>

          {movements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay movimientos registrados
              </h3>
              <p className="text-gray-500 mb-4">
                Los movimientos aparecerán aquí automáticamente cuando uses los botones + y - en el módulo de muestras.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Muestra</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Saldo Anterior</TableHead>
                    <TableHead>Saldo Nuevo</TableHead>
                    <TableHead>Comentarios</TableHead>
                    <TableHead className="w-[150px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {new Date(movement.fecha_movimiento).toLocaleDateString()} {new Date(movement.fecha_movimiento).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            movement.tipo_movimiento === 'ENTRADA'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {movement.tipo_movimiento === 'ENTRADA' ? (
                            <ArrowUp className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowDown className="w-3 h-3 mr-1" />
                          )}
                          {movement.tipo_movimiento}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.sample?.material}</p>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                            {movement.sample?.cod}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {movement.cantidad_movida}
                      </TableCell>
                      <TableCell>{movement.cantidad_anterior}</TableCell>
                      <TableCell className="font-semibold">
                        {movement.cantidad_nueva}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate text-sm">{movement.comentarios || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(movement)}
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMovement(movement.id)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination - Solo mostrar si hay datos */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Mostrar:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    const newLimit = Number(value);
                    setItemsPerPage(newLimit);
                    setCurrentPage(1);
                    loadMovements(1, newLimit);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">
                  {startItem}-{endItem} de {totalCount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMovements(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>

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
                      onClick={() => loadMovements(pageNumber)}
                      className="w-10 h-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMovements(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Movement Details Modal */}
      {showDetails && selectedMovement && (
        <MovementDetails
          movement={selectedMovement}
          onClose={() => {
            setShowDetails(false);
            setSelectedMovement(null);
          }}
        />
      )}
    </div>
  );
}