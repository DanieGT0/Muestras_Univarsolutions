import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Eye,
  Package2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import type { Sample } from '../../types';

interface SamplesWithStockTableProps {
  samples: Sample[];
  loading?: boolean;
}

export function SamplesWithStockTable({ samples, loading = false }: SamplesWithStockTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const itemsPerPage = 10;

  // Filter samples with stock only
  const samplesWithStock = useMemo(() => {
    return samples.filter(sample => sample.cantidad > 0);
  }, [samples]);

  // Get unique filters
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    samplesWithStock.forEach(sample => {
      if (sample.pais?.name) {
        countrySet.add(sample.pais.name);
      }
    });
    return Array.from(countrySet).sort();
  }, [samplesWithStock]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    samplesWithStock.forEach(sample => {
      if (sample.categoria?.name) {
        categorySet.add(sample.categoria.name);
      }
    });
    return Array.from(categorySet).sort();
  }, [samplesWithStock]);

  // Filter and search samples
  const filteredSamples = useMemo(() => {
    let filtered = samplesWithStock;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(sample =>
        sample.cod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.lote?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply country filter
    if (countryFilter !== 'all') {
      filtered = filtered.filter(sample => sample.pais?.name === countryFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(sample => sample.categoria?.name === categoryFilter);
    }

    return filtered;
  }, [samplesWithStock, searchTerm, countryFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSamples.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSamples = filteredSamples.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setCountryFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/export/samples`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `muestras_con_stock_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar. Por favor intente nuevamente.');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package2 className="w-5 h-5 text-blue-600" />
            Muestras con Existencia
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredSamples.length} de {samplesWithStock.length} muestras disponibles
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Código, material, lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País:
            </label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los países" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría:
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Limpiar
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  País
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSamples.length > 0 ? (
                paginatedSamples.map((sample) => (
                  <tr key={sample.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sample.cod}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sample.material || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sample.lote || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-base font-semibold">
                          {sample.cantidad}
                        </Badge>
                        <span className="text-orange-500 text-xs font-medium">
                          {sample.cantidad === 1 ? 'Unidad' : 'Unidades'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-gray-900 font-medium">
                          {Number(sample.peso_unitario || 0).toFixed(2)}
                        </span>
                        <span className="text-orange-500 text-xs font-medium">
                          {sample.unidad_medida || 'kg'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-gray-900 font-semibold">
                          {Number(sample.peso_total || 0).toFixed(2)}
                        </span>
                        <span className="text-orange-500 text-xs font-medium">
                          {sample.unidad_medida || 'kg'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sample.pais?.name || 'Sin país'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">
                        {sample.categoria?.name || 'Sin categoría'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSample(sample)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Package2 className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg">No se encontraron muestras</p>
                      <p className="text-gray-400 text-sm">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">{startIndex + 1}</span>
                    {' '} a{' '}
                    <span className="font-medium">
                      {Math.min(startIndex + itemsPerPage, filteredSamples.length)}
                    </span>
                    {' '} de{' '}
                    <span className="font-medium">{filteredSamples.length}</span>
                    {' '} resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="rounded-r-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="rounded-none"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Sample Details Modal (simplified) */}
      {selectedSample && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                    <Package2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Detalles de la Muestra
                    </h3>
                    <p className="text-sm text-gray-600">{selectedSample.cod}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSample(null)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-primary-50/50 to-secondary-50/50 rounded-lg p-4 border-l-4 border-primary-500">
                  <h4 className="text-sm font-semibold text-primary-700 mb-3 uppercase tracking-wide">Información Básica</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-primary-600 mb-1 uppercase tracking-wider">Código</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.cod}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary-600 mb-1 uppercase tracking-wider">Material</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.material || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary-600 mb-1 uppercase tracking-wider">Lote</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.lote || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Quantities and Measurements */}
                <div className="bg-gradient-to-r from-secondary-50/50 to-primary-50/50 rounded-lg p-4 border-l-4 border-secondary-500">
                  <h4 className="text-sm font-semibold text-secondary-700 mb-3 uppercase tracking-wide">Cantidades y Medidas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-secondary-600 mb-1 uppercase tracking-wider">Cantidad</label>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.round(selectedSample.cantidad)}
                        </span>
                        <span className="text-orange-500 text-xs font-medium">
                          {selectedSample.cantidad === 1 ? 'Unidad' : 'Unidades'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary-600 mb-1 uppercase tracking-wider">Peso Unitario</label>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(selectedSample.peso_unitario || 0).toFixed(2)}
                        </span>
                        <span className="text-orange-500 text-xs font-medium">
                          {selectedSample.unidad_medida || 'kg'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary-600 mb-1 uppercase tracking-wider">Peso Total</label>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {Number(selectedSample.peso_total || 0).toFixed(2)}
                        </span>
                        <span className="text-orange-500 text-xs font-medium">
                          {selectedSample.unidad_medida || 'kg'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location and Responsible */}
                <div className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 rounded-lg p-4 border-l-4 border-gray-500">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Ubicación y Responsables</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-700 mb-1 uppercase tracking-wider">País</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.pais?.name || 'Sin país'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-green-700 mb-1 uppercase tracking-wider">Categoría</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.categoria?.name || 'Sin categoría'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1 uppercase tracking-wider">Proveedor</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.proveedor?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-teal-700 mb-1 uppercase tracking-wider">Bodega</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.bodega?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-orange-700 mb-1 uppercase tracking-wider">Ubicación</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.ubicacion?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-pink-700 mb-1 uppercase tracking-wider">Responsable</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedSample.responsable?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">Fechas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Fecha de Registro</label>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedSample.fecha_registro).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Fecha de Vencimiento</label>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedSample.fecha_vencimiento
                          ? new Date(selectedSample.fecha_vencimiento).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {selectedSample.comentarios && (
                  <div className="bg-gradient-to-r from-amber-50/50 to-yellow-50/50 rounded-lg p-4 border-l-4 border-amber-500">
                    <h4 className="text-sm font-semibold text-amber-700 mb-3 uppercase tracking-wide">Comentarios</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedSample.comentarios}</p>
                  </div>
                )}

                {/* Status */}
                <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-lg p-4 border-l-4 border-green-500">
                  <h4 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide">Estado</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${selectedSample.cantidad > 0 ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                      {selectedSample.cantidad > 0 ? '✅ En Stock' : '❌ Sin Stock'}
                    </Badge>
                    {selectedSample.cantidad > 0 && selectedSample.cantidad < 5 && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        ⚠️ Stock Bajo
                      </Badge>
                    )}
                    {selectedSample.fecha_vencimiento && (
                      <Badge className={`${new Date(selectedSample.fecha_vencimiento) < new Date() ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                        {new Date(selectedSample.fecha_vencimiento) < new Date() ? '⚠️ Vencido' : '⏰ Con Vencimiento'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}