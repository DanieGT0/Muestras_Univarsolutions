import { X, ArrowUp, ArrowDown, Calendar, Package2, User, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { Movement } from '../../types';

interface MovementDetailsProps {
  movement: Movement;
  onClose: () => void;
}

export function MovementDetails({ movement, onClose }: MovementDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                movement.tipo_movimiento === 'ENTRADA'
                  ? 'bg-emerald-600'
                  : 'bg-red-600'
              }`}>
                {movement.tipo_movimiento === 'ENTRADA' ? (
                  <ArrowUp className="w-4 h-4 text-white" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del Movimiento
                </h2>
                <p className="text-sm text-gray-600">
                  ID: {movement.id}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Tipo y Estado */}
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className={`px-4 py-2 text-sm font-medium ${
                  movement.tipo_movimiento === 'ENTRADA'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {movement.tipo_movimiento === 'ENTRADA' ? (
                  <ArrowUp className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-2" />
                )}
                {movement.tipo_movimiento}
              </Badge>
            </div>

            {/* Información Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <h3 className="font-medium text-gray-900">Información del Movimiento</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Fecha y Hora</p>
                    <p className="font-medium">
                      {new Date(movement.fecha_movimiento).toLocaleDateString()} a las{' '}
                      {new Date(movement.fecha_movimiento).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cantidad Movida</p>
                    <p className="font-bold text-lg">{movement.cantidad_movida}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-slate-600" />
                  <h3 className="font-medium text-gray-900">Control de Inventario</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Saldo Anterior</p>
                    <p className="font-medium">{movement.cantidad_anterior}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Saldo Nuevo</p>
                    <p className="font-bold text-lg text-slate-700">{movement.cantidad_nueva}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Información de la Muestra */}
            {movement.sample && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Información de la Muestra</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Código</p>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {movement.sample.cod}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-600">Material</p>
                    <p className="font-medium">{movement.sample.material}</p>
                  </div>
                  {movement.sample.lote && (
                    <div>
                      <p className="text-gray-600">Lote</p>
                      <p className="font-medium">{movement.sample.lote}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Unidad de Medida</p>
                    <p className="font-medium">{'unidad_medida' in movement.sample ? (movement.sample as any).unidad_medida : 'No especificada'}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Usuario */}
            {movement.usuario && (
              <Card className="p-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-slate-600" />
                  <h3 className="font-medium text-gray-900">Usuario</h3>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{movement.usuario.nombre || movement.usuario.email}</p>
                  <p className="text-gray-600">{movement.usuario.email}</p>
                </div>
              </Card>
            )}

            {/* Comentarios */}
            {movement.comentarios && (
              <Card className="p-4 bg-slate-50 border-slate-200">
                <h3 className="font-medium text-gray-900 mb-2">Comentarios</h3>
                <p className="text-sm text-gray-700">{movement.comentarios}</p>
              </Card>
            )}

            {/* Cambio en el Inventario */}
            <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
              <h3 className="font-medium text-gray-900 mb-4">Resumen del Movimiento</h3>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Saldo Anterior</p>
                  <p className="text-2xl font-bold text-gray-700">{movement.cantidad_anterior}</p>
                </div>
                <div className="flex items-center">
                  {movement.tipo_movimiento === 'ENTRADA' ? (
                    <div className="flex items-center text-emerald-600">
                      <span className="text-xl font-bold mr-2">+{movement.cantidad_movida}</span>
                      <ArrowUp className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <span className="text-xl font-bold mr-2">-{movement.cantidad_movida}</span>
                      <ArrowDown className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Saldo Nuevo</p>
                  <p className="text-2xl font-bold text-slate-700">{movement.cantidad_nueva}</p>
                </div>
              </div>
            </Card>
          </div>

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