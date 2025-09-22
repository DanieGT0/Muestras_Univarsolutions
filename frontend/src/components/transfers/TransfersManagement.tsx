import { useState, useEffect } from 'react';
import { Plus, Download, Eye, Trash2, ArrowRightLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
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
import { toast } from '../../hooks/use-toast';
import type {
  Transfer,
  CreateTransferData
} from '../../types';
import { EstadoTransfer } from '../../types';
import { TransferForm } from './TransferForm';
import { TransferDetails } from './TransferDetails';
import { transfersAPI } from '../../lib/api';

export function TransfersManagement() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTransfers(1);
  }, []);

  const loadTransfers = async (page: number) => {
    try {
      setLoading(true);
      const response = await transfersAPI.getTransfers(page, itemsPerPage);
      setTransfers(response.data);
      setTotalCount(response.count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los traslados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (data: CreateTransferData) => {
    try {
      await transfersAPI.createTransfer(data);
      await loadTransfers(currentPage);
      setShowForm(false);
      toast({
        title: 'Éxito',
        description: 'Traslado creado correctamente',
      });
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el traslado',
        variant: 'destructive',
      });
    }
  };

  // Función para refrescar la lista después de cambios en TransferDetails
  const handleTransferUpdated = async () => {
    await loadTransfers(currentPage);
    setShowDetails(false);
    setSelectedTransfer(null);
  };

  const handleDeleteTransfer = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este traslado?')) {
      return;
    }

    try {
      await transfersAPI.deleteTransfer(id);
      await loadTransfers(currentPage);
      toast({
        title: 'Éxito',
        description: 'Traslado eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el traslado',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setShowDetails(true);
  };

  const getStatusIcon = (estado: EstadoTransfer) => {
    switch (estado) {
      case 'ENVIADO':
        return <Clock className="w-3 h-3" />;
      case 'COMPLETADO':
        return <CheckCircle className="w-3 h-3" />;
      case 'RECHAZADO':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (estado: EstadoTransfer) => {
    switch (estado) {
      case 'ENVIADO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETADO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RECHAZADO':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const enviados = transfers.filter(t => t.estado === 'ENVIADO').length;
  const completados = transfers.filter(t => t.estado === 'COMPLETADO').length;
  const rechazados = transfers.filter(t => t.estado === 'RECHAZADO').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Traslados</h1>
            <p className="text-gray-600 mt-1">Cargando traslados...</p>
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
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Traslados</h1>
            <p className="text-gray-600 mt-1">Gestión de traslados entre almacenes</p>
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

          <Button
            onClick={() => setShowForm(true)}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Traslado
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Total Traslados</p>
              <p className="text-3xl font-bold text-slate-700">{totalCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Enviados</p>
              <p className="text-3xl font-bold text-slate-700">{enviados}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-600">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Completados</p>
              <p className="text-3xl font-bold text-slate-700">{completados}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-600">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Rechazados</p>
              <p className="text-3xl font-bold text-slate-700">{rechazados}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-600">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Transfers Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Lista de Traslados</h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando {startItem} - {endItem} de {totalCount} traslados
              </p>
            )}
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ArrowRightLeft className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay traslados registrados
              </h3>
              <p className="text-gray-500 mb-4">
                Comienza creando el primer traslado entre almacenes.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Traslado
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Solicitud</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Muestra</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Comentarios</TableHead>
                    <TableHead className="w-[200px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm">
                        {new Date(transfer.fecha_solicitud).toLocaleDateString()}
                        <br />
                        {new Date(transfer.fecha_solicitud).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getStatusBadgeClass(transfer.estado)}`}
                        >
                          {getStatusIcon(transfer.estado)}
                          <span className="ml-1">{transfer.estado}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{transfer.muestra?.material}</p>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                            {transfer.muestra?.cod}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {transfer.cantidad}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{transfer.bodega_origen?.name}</p>
                          <p className="text-gray-500">{transfer.ubicacion_origen?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{transfer.bodega_destino?.name}</p>
                          <p className="text-gray-500">{transfer.ubicacion_destino?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="truncate text-sm">{transfer.comentarios || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(transfer)}
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {transfer.estado === 'ENVIADO' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(transfer)}
                                title="Aprobar/Rechazar traslado"
                                className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {(transfer.estado === 'COMPLETADO' || transfer.estado === 'RECHAZADO') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTransfer(transfer.id)}
                              title="Eliminar"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => loadTransfers(currentPage - 1)}
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
                      onClick={() => loadTransfers(pageNumber)}
                      className="w-10 h-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => loadTransfers(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Transfer Form Modal */}
      {showForm && (
        <TransferForm
          onSubmit={handleCreateTransfer}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Transfer Details Modal */}
      {showDetails && selectedTransfer && (
        <TransferDetails
          transfer={selectedTransfer}
          onClose={() => {
            setShowDetails(false);
            setSelectedTransfer(null);
          }}
          onUpdate={handleTransferUpdated}
        />
      )}
    </div>
  );
}