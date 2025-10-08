import { useState, useEffect } from 'react';
import { Plus, Download, Eye, Edit2, Trash2, Package, Minus, X, TrendingUp, Package2, Search } from 'lucide-react';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/table';
import { samplesAPI, movementsAPI, categoriesAPI } from '../../lib/api';
import type {
  Sample,
  CreateSampleData,
  CreateMovementData,
  Category
} from '../../types';
import { SampleForm } from './SampleForm';
import { SampleDetails } from './SampleDetails';
import { toast } from '../../hooks/use-toast';

interface SampleStats {
  totalMuestras: number;
  totalUnidades: number;
  totalPeso: number;
}

export function SamplesManagement() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Quick movement states
  const [showQuickMovement, setShowQuickMovement] = useState(false);
  const [quickMovementSample, setQuickMovementSample] = useState<Sample | null>(null);
  const [quickMovementType, setQuickMovementType] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');

  // Estadísticas
  const [stats, setStats] = useState<SampleStats>({
    totalMuestras: 0,
    totalUnidades: 0,
    totalPeso: 0
  });


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load samples with pagination, stats, and categories
      await Promise.all([
        loadSamples(1),
        loadStats(),
        loadCategories()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos iniciales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await samplesAPI.getSamplesStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSamples = async (
    page: number,
    limit?: number,
    material?: string,
    categoria_id?: number,
    fecha_desde?: string,
    fecha_hasta?: string
  ) => {
    try {
      const effectiveLimit = limit !== undefined ? limit : itemsPerPage;
      const filters: any = {};

      if (material) filters.material = material;
      if (categoria_id) filters.categoria_id = categoria_id;
      if (fecha_desde) filters.fecha_desde = fecha_desde;
      if (fecha_hasta) filters.fecha_hasta = fecha_hasta;

      const response = await samplesAPI.getSamples(
        page,
        effectiveLimit,
        Object.keys(filters).length > 0 ? filters : undefined
      );
      setSamples(response.data);
      setTotalCount(response.count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading samples:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las muestras',
        variant: 'destructive',
      });
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCreateSample = async (data: CreateSampleData) => {
    try {
      if (editingSample) {
        // Update existing sample
        await samplesAPI.updateSample(editingSample.id, data);
        toast({
          title: 'Éxito',
          description: 'Muestra actualizada correctamente',
        });
      } else {
        // Create new sample
        await samplesAPI.createSample(data);
        toast({
          title: 'Éxito',
          description: 'Muestra creada correctamente',
        });
      }

      await loadSamples(currentPage);
      setShowForm(false);
      setEditingSample(null);
    } catch (error) {
      console.error('Error saving sample:', error);
      toast({
        title: 'Error',
        description: editingSample ? 'No se pudo actualizar la muestra' : 'No se pudo crear la muestra',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSample = async (id: number) => {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar esta muestra?\n\nEsto eliminará la muestra y TODOS sus movimientos asociados (entradas y salidas).')) {
      return;
    }

    try {
      const response = await samplesAPI.deleteSample(id);
      await Promise.all([
        loadSamples(currentPage),
        loadStats()
      ]);

      const deletedMovements = response.deletedMovements || 0;
      const message = deletedMovements > 0
        ? `Muestra eliminada correctamente (incluyendo ${deletedMovements} movimiento(s))`
        : 'Muestra eliminada correctamente';

      toast({
        title: '✅ Éxito',
        description: message,
      });
    } catch (error: any) {
      console.error('Error deleting sample:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la muestra',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (sample: Sample) => {
    setSelectedSample(sample);
    setShowDetails(true);
  };

  const handleQuickMovement = (sample: Sample, type: 'ENTRADA' | 'SALIDA') => {
    setQuickMovementSample(sample);
    setQuickMovementType(type);
    setShowQuickMovement(true);
  };

  const handleQuickMovementSubmit = async (data: CreateMovementData) => {
    try {
      await movementsAPI.createMovement(data);
      await loadSamples(currentPage);
      setShowQuickMovement(false);
      setQuickMovementSample(null);
      toast({
        title: 'Éxito',
        description: `${data.tipo_movimiento === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada correctamente`,
      });
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el movimiento',
        variant: 'destructive',
      });
    }
  };

  const handleExportToExcel = async () => {
    try {
      toast({
        title: 'Preparando exportación...',
        description: 'Generando archivo Excel',
      });

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
      a.download = `muestras_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Éxito',
        description: 'Archivo exportado correctamente',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'Error al exportar los datos',
        variant: 'destructive',
      });
    }
  };

  const handleFilter = () => {
    loadSamples(
      1,
      itemsPerPage,
      filterMaterial,
      filterCategoria ? parseInt(filterCategoria) : undefined,
      filterFechaDesde,
      filterFechaHasta
    );
  };

  const clearFilter = () => {
    setFilterMaterial('');
    setFilterCategoria('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    loadSamples(1, itemsPerPage);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const statCards = [
    {
      title: 'Total de Muestras',
      value: stats.totalMuestras,
      suffix: 'muestras',
      icon: Package2,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-primary-600'
    },
    {
      title: 'Total por Unidad',
      value: stats.totalUnidades,
      suffix: 'unidades',
      icon: Package,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-secondary-600'
    },
    {
      title: 'Total por Peso',
      value: (stats.totalPeso || 0).toFixed(2),
      suffix: 'kg',
      icon: TrendingUp,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-primary-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Muestras</h1>
        </div>

        {/* Loading cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
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
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Muestras</h1>
            <p className="text-gray-600 mt-1">Control de inventario de laboratorio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={totalCount === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>

          <Button
            onClick={() => {
              setEditingSample(null);
              setShowForm(true);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Muestra
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={`p-6 ${stat.borderColor} ${stat.bgColor} hover:shadow-lg transition-all duration-200 border-l-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString()} <span className="text-lg text-gray-500">{stat.suffix}</span>
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Samples Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Lista de Muestras</h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando {startItem} - {endItem} de {totalCount} muestras
              </p>
            )}
          </div>

          {/* Filter Section */}
          {totalCount > 0 && (
            <Card className="p-4 bg-slate-50 border-slate-200">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar por Material</label>
                    <Input
                      placeholder="Buscar por material..."
                      value={filterMaterial}
                      onChange={(e) => setFilterMaterial(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</label>
                    <select
                      value={filterCategoria}
                      onChange={(e) => setFilterCategoria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">Todas las categorías</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          [{cat.cod}] {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Fecha Desde</label>
                    <Input
                      type="date"
                      value={filterFechaDesde}
                      onChange={(e) => setFilterFechaDesde(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Fecha Hasta</label>
                    <Input
                      type="date"
                      value={filterFechaHasta}
                      onChange={(e) => setFilterFechaHasta(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleFilter} className="bg-slate-700 hover:bg-slate-800 text-white">
                    <Search className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" onClick={clearFilter}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {samples.length === 0 && (filterMaterial || filterCategoria || filterFechaDesde || filterFechaHasta) ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-gray-500 mb-4">
                No hay muestras que coincidan con los filtros aplicados
              </p>
              <Button
                variant="outline"
                onClick={clearFilter}
              >
                Limpiar filtro
              </Button>
            </div>
          ) : samples.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay muestras registradas
              </h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando tu primera muestra al sistema.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Muestra
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead className="w-[280px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.map((sample) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-mono">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          {sample.cod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate font-medium">{sample.material}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{sample.lote}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{sample.cantidad}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sample.pais?.name || `ID: ${sample.pais_id}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(sample.fecha_registro).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickMovement(sample, 'ENTRADA')}
                            title="Entrada rápida"
                            className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickMovement(sample, 'SALIDA')}
                            title="Salida rápida"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                            disabled={sample.cantidad === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(sample)}
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSample(sample);
                              setShowForm(true);
                            }}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSample(sample.id)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  const newLimit = Number(value);
                  setItemsPerPage(newLimit);
                  setCurrentPage(1);
                  loadSamples(1, newLimit);
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
                onClick={() => loadSamples(currentPage - 1)}
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
                    onClick={() => loadSamples(pageNumber)}
                    className="w-10 h-10"
                  >
                    {pageNumber}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSamples(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Sample Form Modal */}
      {showForm && (
        <SampleForm
          sample={editingSample}
          onSubmit={handleCreateSample}
          onClose={() => {
            setShowForm(false);
            setEditingSample(null);
          }}
        />
      )}

      {/* Sample Details Modal */}
      {showDetails && selectedSample && (
        <SampleDetails
          sample={selectedSample}
          onClose={() => {
            setShowDetails(false);
            setSelectedSample(null);
          }}
        />
      )}

      {/* Quick Movement Modal */}
      {showQuickMovement && quickMovementSample && (
        <QuickMovementModal
          sample={quickMovementSample}
          type={quickMovementType}
          onSubmit={handleQuickMovementSubmit}
          onClose={() => {
            setShowQuickMovement(false);
            setQuickMovementSample(null);
          }}
        />
      )}
    </div>
  );
}

// Quick Movement Modal Component
interface QuickMovementModalProps {
  sample: Sample;
  type: 'ENTRADA' | 'SALIDA';
  onSubmit: (data: CreateMovementData) => Promise<void>;
  onClose: () => void;
}

function QuickMovementModal({ sample, type, onSubmit, onClose }: QuickMovementModalProps) {
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cantidad <= 0) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el motivo del movimiento',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'SALIDA' && cantidad > sample.cantidad) {
      toast({
        title: 'Error',
        description: 'No hay suficiente cantidad disponible',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        sample_id: sample.id,
        tipo_movimiento: type,
        cantidad_movida: cantidad,
        motivo,
        comentarios
      });
      onClose();
    } catch (error) {
      console.error('Error submitting movement:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                type === 'ENTRADA'
                  ? 'bg-emerald-600'
                  : 'bg-red-600'
              }`}>
                {type === 'ENTRADA' ? (
                  <Plus className="w-4 h-4 text-white" />
                ) : (
                  <Minus className="w-4 h-4 text-white" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {type === 'ENTRADA' ? 'Entrada Rápida' : 'Salida Rápida'}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Sample Info */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-white text-slate-700 border-slate-200">
                  {sample.cod}
                </Badge>
                <span className="font-medium">{sample.material}</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Lote: {sample.lote}</p>
                <p>Stock actual: <span className="font-medium text-slate-700">{sample.cantidad}</span> {sample.unidad_medida}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="1"
                max={type === 'SALIDA' ? sample.cantidad : undefined}
                step="1"
                required
              />
              {type === 'SALIDA' && cantidad > sample.cantidad && (
                <p className="text-sm text-red-600">
                  ⚠️ Cantidad excede el stock disponible ({sample.cantidad})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">
                {type === 'ENTRADA' ? 'Motivo *' : 'Sample Request *'}
              </Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={type === 'ENTRADA' ? 'Ej: Reposición de stock' : 'Ej: SAMP-740024'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Input
                id="comentarios"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Comentarios adicionales (opcional)"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className={type === 'ENTRADA'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }
              >
                {loading ? 'Procesando...' : (
                  type === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Salida'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}