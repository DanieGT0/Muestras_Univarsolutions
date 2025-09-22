import { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Calendar, Package2, User, Building, MapPin, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from '../../hooks/use-toast';
import type { Transfer, Warehouse, Location, Responsible } from '../../types';
import { warehousesAPI, locationsAPI, responsiblesAPI, transfersAPI } from '../../lib/api';

interface TransferDetailsProps {
  transfer: Transfer;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TransferDetails({ transfer, onClose, onUpdate }: TransferDetailsProps) {
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Data for approval form
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  // Approval form data
  const [approvalData, setApprovalData] = useState({
    bodega_destino_id: 0,
    ubicacion_destino_id: 0,
    responsable_destino_id: 0,
    comentarios_aprobacion: ''
  });

  // Rejection form data
  const [rejectionData, setRejectionData] = useState({
    motivo_rechazo: ''
  });

  // Load data for approval form
  useEffect(() => {
    if (showApprovalForm) {
      loadApprovalData();
    }
  }, [showApprovalForm]);

  const loadApprovalData = async () => {
    try {
      setDataLoading(true);
      const [warehousesData, locationsData, responsiblesData] = await Promise.all([
        warehousesAPI.getWarehouses(),
        locationsAPI.getLocations(),
        responsiblesAPI.getResponsibles()
      ]);

      setWarehouses(warehousesData.data || []);
      setLocations(locationsData.data || []);
      setResponsibles(responsiblesData.data || []);
    } catch (error) {
      console.error('Error loading approval data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos para la aprobación',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleApprove = async () => {
    // Validations
    if (!approvalData.bodega_destino_id) {
      toast({
        title: 'Error',
        description: 'Selecciona una bodega de destino',
        variant: 'destructive',
      });
      return;
    }

    if (!approvalData.ubicacion_destino_id) {
      toast({
        title: 'Error',
        description: 'Selecciona una ubicación de destino',
        variant: 'destructive',
      });
      return;
    }

    if (!approvalData.responsable_destino_id) {
      toast({
        title: 'Error',
        description: 'Selecciona un responsable',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await transfersAPI.updateTransfer(transfer.id, {
        estado: 'COMPLETADO',
        comentarios_traslado: approvalData.comentarios_aprobacion,
        bodega_destino_id: approvalData.bodega_destino_id,
        ubicacion_destino_id: approvalData.ubicacion_destino_id,
        responsable_destino_id: approvalData.responsable_destino_id
      });

      toast({
        title: 'Éxito',
        description: 'Traslado aprobado correctamente. Se ha creado la muestra en destino.',
      });

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error approving transfer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el traslado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionData.motivo_rechazo.trim()) {
      toast({
        title: 'Error',
        description: 'Proporciona un motivo para el rechazo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await transfersAPI.updateTransfer(transfer.id, {
        estado: 'RECHAZADO',
        comentarios_traslado: rejectionData.motivo_rechazo
      });

      toast({
        title: 'Traslado Rechazado',
        description: 'El traslado ha sido rechazado. No se afectó el inventario.',
      });

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el traslado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'ENVIADO':
        return <Clock className="w-4 h-4" />;
      case 'COMPLETADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'RECHAZADO':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (estado: string) => {
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

  const canApproveReject = transfer.estado === 'ENVIADO';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del Traslado
                </h2>
                <p className="text-sm text-gray-600">
                  Código: {transfer.codigo_generado}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Estado y Acciones */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={`px-4 py-2 text-sm font-medium ${getStatusBadgeClass(transfer.estado)}`}
              >
                {getStatusIcon(transfer.estado)}
                <span className="ml-2">{transfer.estado}</span>
              </Badge>

              <div className="text-right text-sm">
                <p className="text-gray-600">
                  Solicitado: {new Date(transfer.fecha_solicitud).toLocaleDateString()} a las {new Date(transfer.fecha_solicitud).toLocaleTimeString()}
                </p>
                {transfer.fecha_recepcion && (
                  <p className="text-gray-600">
                    Procesado: {new Date(transfer.fecha_recepcion).toLocaleDateString()} a las {new Date(transfer.fecha_recepcion).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Botones de Acción para traslados ENVIADO */}
            {canApproveReject && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-medium text-amber-900">Acción Requerida</h3>
                </div>
                <p className="text-sm text-amber-800 mb-4">
                  Este traslado está pendiente de tu aprobación. Puedes aprobar el traslado y especificar la ubicación de destino, o rechazarlo.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowApprovalForm(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar Traslado
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              </Card>
            )}

            {/* Información Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Muestra */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Muestra</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Código</p>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {transfer.muestra?.cod}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Material</p>
                    <p className="font-medium">{transfer.muestra?.material}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lote</p>
                    <p className="font-medium">{transfer.muestra?.lote || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {/* Cantidad y País Destino */}
              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                  <h3 className="font-medium text-gray-900">Traslado</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Cantidad</p>
                    <p className="text-2xl font-bold text-slate-700">{transfer.cantidad}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">País Destino</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {transfer.pais_destino?.name} ({transfer.pais_destino?.cod})
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Origen */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="font-medium text-gray-900 mb-3">Ubicación de Origen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Bodega</p>
                  <p className="font-medium">{transfer.bodega_origen?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ubicación</p>
                  <p className="font-medium">{transfer.ubicacion_origen?.name || 'N/A'}</p>
                </div>
              </div>
            </Card>

            {/* Motivo y Comentarios */}
            <Card className="p-4 bg-slate-50 border-slate-200">
              <h3 className="font-medium text-gray-900 mb-3">Motivo del Traslado</h3>
              <p className="text-sm text-gray-700">{transfer.motivo}</p>
              {transfer.comentarios && (
                <>
                  <h4 className="font-medium text-gray-900 mt-4 mb-2">Comentarios</h4>
                  <p className="text-sm text-gray-700">{transfer.comentarios}</p>
                </>
              )}
            </Card>

            {/* Usuarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-slate-600" />
                  <h3 className="font-medium text-gray-900">Usuario Origen</h3>
                </div>
                <div className="text-sm">
                  {transfer.usuario_origen ? (
                    <>
                      <p className="font-medium">{transfer.usuario_origen.nombre || transfer.usuario_origen.email}</p>
                      <p className="text-gray-600">{transfer.usuario_origen.email}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">No disponible</p>
                  )}
                </div>
              </Card>

              {transfer.usuario_destino && (
                <Card className="p-4 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-medium text-gray-900">Usuario Destino</h3>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{transfer.usuario_destino.nombre || transfer.usuario_destino.email}</p>
                    <p className="text-gray-600">{transfer.usuario_destino.email}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Formulario de Aprobación */}
          {showApprovalForm && (
            <div className="border-t bg-emerald-50 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Aprobar Traslado</h3>
              {dataLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Cargando datos...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bodega_destino">Bodega Destino *</Label>
                      <Select
                        value={approvalData.bodega_destino_id.toString()}
                        onValueChange={(value) => setApprovalData(prev => ({
                          ...prev,
                          bodega_destino_id: parseInt(value)
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar bodega" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-slate-600" />
                                <span>{warehouse.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ubicacion_destino">Ubicación Destino *</Label>
                      <Select
                        value={approvalData.ubicacion_destino_id.toString()}
                        onValueChange={(value) => setApprovalData(prev => ({
                          ...prev,
                          ubicacion_destino_id: parseInt(value)
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-600" />
                                <span>{location.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="responsable_destino">Responsable *</Label>
                      <Select
                        value={approvalData.responsable_destino_id.toString()}
                        onValueChange={(value) => setApprovalData(prev => ({
                          ...prev,
                          responsable_destino_id: parseInt(value)
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          {responsibles.map((responsible) => (
                            <SelectItem key={responsible.id} value={responsible.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-600" />
                                <span>{responsible.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="comentarios_aprobacion">Comentarios de Aprobación</Label>
                    <Input
                      id="comentarios_aprobacion"
                      value={approvalData.comentarios_aprobacion}
                      onChange={(e) => setApprovalData(prev => ({
                        ...prev,
                        comentarios_aprobacion: e.target.value
                      }))}
                      placeholder="Comentarios adicionales (opcional)"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loading ? 'Aprobando...' : 'Confirmar Aprobación'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowApprovalForm(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulario de Rechazo */}
          {showRejectForm && (
            <div className="border-t bg-red-50 p-6">
              <h3 className="font-medium text-gray-900 mb-4">Rechazar Traslado</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="motivo_rechazo">Motivo del Rechazo *</Label>
                  <Input
                    id="motivo_rechazo"
                    value={rejectionData.motivo_rechazo}
                    onChange={(e) => setRejectionData(prev => ({
                      ...prev,
                      motivo_rechazo: e.target.value
                    }))}
                    placeholder="Explica por qué se rechaza el traslado"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant="destructive"
                  >
                    {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end p-6 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}