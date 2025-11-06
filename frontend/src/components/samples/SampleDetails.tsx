import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import type { Sample } from '../../types';

interface SampleDetailsProps {
  sample: Sample;
  onClose: () => void;
}

export function SampleDetails({ sample, onClose }: SampleDetailsProps) {
  const formatNumber = (value: number) => {
    return Number(value).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/30 bg-white/90 backdrop-blur-xl relative">
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 pointer-events-none rounded-lg"></div>

        <div className="sticky top-0 bg-gradient-to-r from-primary-600/90 to-secondary-500/90 backdrop-blur-sm px-6 py-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Detalles de la Muestra</h2>
            <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-1 font-semibold">
              {sample.cod}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-8 space-y-8 bg-white/40 backdrop-blur-sm relative z-10">
          {/* Basic Information */}
          <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
            {/* Glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-primary-600 font-bold">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Información Básica</h3>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="border-l-4 border-primary-500 pl-4">
                  <p className="text-xs font-bold text-primary-600 mb-2 tracking-wider">MATERIAL</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.material}</p>
                </div>

                <div className="border-l-4 border-secondary-500 pl-4">
                  <p className="text-xs font-bold text-secondary-600 mb-2 tracking-wider">LOTE</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.lote}</p>
                </div>

                <div className="border-l-4 border-gray-400 pl-4">
                  <p className="text-xs font-bold text-gray-600 mb-2 tracking-wider">CÓDIGO</p>
                  <Badge className="bg-primary-50 text-primary-700 border-primary-200 text-base px-4 py-2 font-semibold">
                    {sample.cod}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-xs font-bold text-blue-600 mb-2 tracking-wider">PAÍS</p>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-base px-4 py-2 font-semibold">
                    {sample.pais?.name || `ID: ${sample.pais_id}`}
                  </Badge>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-xs font-bold text-green-600 mb-2 tracking-wider">CATEGORÍA</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.categoria?.name || 'N/A'}</p>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Quantities and Measurements */}
          <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
            {/* Glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                  <span className="text-secondary-600 font-bold">⚖️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Cantidades y Medidas</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-primary-50/80 to-primary-100/60 backdrop-blur-sm p-6 rounded-xl border-l-4 border-primary-500 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/10 pointer-events-none"></div>
                  <div className="relative z-10">
                  <p className="text-xs font-bold text-primary-600 mb-3 tracking-wider">CANTIDAD</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-primary-700">
                      {Math.round(sample.cantidad)}
                    </p>
                    <span className="text-orange-500 text-sm font-medium">
                      {sample.cantidad === 1 ? 'Unidad' : 'Unidades'}
                    </span>
                  </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-secondary-50/80 to-secondary-100/60 backdrop-blur-sm p-6 rounded-xl border-l-4 border-secondary-500 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/10 pointer-events-none"></div>
                  <div className="relative z-10">
                  <p className="text-xs font-bold text-secondary-600 mb-3 tracking-wider">PESO UNITARIO</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-secondary-700">
                      {formatNumber(sample.peso_unitario)}
                    </p>
                    <span className="text-orange-500 text-xs font-medium">
                      {sample.unidad_medida || 'kg'}
                    </span>
                  </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50/80 to-green-100/60 backdrop-blur-sm p-6 rounded-xl border-l-4 border-green-500 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/10 pointer-events-none"></div>
                  <div className="relative z-10">
                  <p className="text-xs font-bold text-green-600 mb-3 tracking-wider">PESO TOTAL</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-green-700">
                      {formatNumber(sample.peso_total)}
                    </p>
                    <span className="text-orange-500 text-xs font-medium">
                      {sample.unidad_medida || 'kg'}
                    </span>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location and Responsible */}
          <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">📍</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Ubicación y Responsables</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-xs font-bold text-blue-600 mb-2 tracking-wider">PROVEEDOR</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.proveedor?.name || 'N/A'}</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-xs font-bold text-green-600 mb-2 tracking-wider">BODEGA</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.bodega?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-xs font-bold text-purple-600 mb-2 tracking-wider">UBICACIÓN</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.ubicacion?.name || 'N/A'}</p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="text-xs font-bold text-indigo-600 mb-2 tracking-wider">RESPONSABLE</p>
                  <p className="text-lg font-semibold text-gray-800">{sample.responsable?.name || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
            {/* Glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">📅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Fechas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-l-4 border-blue-500 shadow-sm">
                <p className="text-xs font-bold text-blue-600 mb-3 tracking-wider">FECHA DE REGISTRO</p>
                <p className="text-lg font-semibold text-blue-700">
                  {new Date(sample.fecha_registro).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {sample.fecha_vencimiento && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border-l-4 border-amber-500 shadow-sm">
                  <p className="text-xs font-bold text-amber-600 mb-3 tracking-wider">FECHA DE VENCIMIENTO</p>
                  <p className="text-lg font-semibold text-amber-700">
                    {new Date(sample.fecha_vencimiento).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Comments */}
          {sample.comentarios && (
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
              {/* Glass reflection effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
              <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 font-bold">💬</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Comentarios</h3>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-gray-400">
                <p className="text-gray-700 leading-relaxed text-lg">{sample.comentarios}</p>
              </div>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
            {/* Glass reflection effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-bold">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Estado</h3>
            </div>

            <div className="flex flex-wrap gap-4">
              <Badge
                className={`text-base px-6 py-3 font-semibold shadow-sm ${
                  sample.cantidad > 0
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {sample.cantidad > 0 ? '✅ En Stock' : '❌ Sin Stock'}
              </Badge>

              {sample.cantidad > 0 && sample.cantidad < 5 && (
                <Badge className="bg-primary-100 text-primary-700 border-primary-300 text-base px-6 py-3 font-semibold">
                  ⚠️ Stock Bajo
                </Badge>
              )}

              {sample.fecha_vencimiento && (
                <Badge
                  className={`text-base px-6 py-3 font-semibold ${
                    new Date(sample.fecha_vencimiento) < new Date()
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-blue-100 text-blue-700 border-blue-300'
                  }`}
                >
                  {new Date(sample.fecha_vencimiento) < new Date()
                    ? '⚠️ Vencido'
                    : '⏰ Con Fecha de Vencimiento'
                  }
                </Badge>
              )}
            </div>
            </div>
          </div>
        </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-white text-gray-800 hover:bg-gray-100 px-8 py-3 font-semibold shadow-lg"
          >
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}