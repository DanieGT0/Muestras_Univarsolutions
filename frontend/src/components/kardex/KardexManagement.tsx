import { useState, useEffect } from 'react';
import { Download, Filter, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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
import type {
  KardexEntry,
  Sample
} from '../../types';
import { kardexAPI, samplesAPI } from '../../lib/api';

export function KardexManagement() {
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    sample_id: undefined as number | undefined,
    tipo_movimiento: undefined as 'ENTRADA' | 'SALIDA' | undefined,
    material: '',
    lote: '',
    date_from: '',
    date_to: ''
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadKardexEntries(1);
    loadSamples();
  }, []);

  const loadSamples = async () => {
    try {
      const response = await samplesAPI.getSamples(1, 1000);
      setSamples(response.data);
    } catch (error) {
      console.error('Error loading samples:', error);
    }
  };

  const loadKardexEntries = async (page: number) => {
    try {
      setLoading(true);

      // Build filter object for API
      const apiFilters: any = {};
      if (filters.sample_id) apiFilters.sample_id = filters.sample_id;
      if (filters.tipo_movimiento) apiFilters.tipo_movimiento = filters.tipo_movimiento;
      if (filters.material) apiFilters.material = filters.material;
      if (filters.lote) apiFilters.lote = filters.lote;
      if (filters.date_from) apiFilters.date_from = filters.date_from;
      if (filters.date_to) apiFilters.date_to = filters.date_to;

      const response = await kardexAPI.getKardexEntries(page, itemsPerPage, apiFilters);
      setEntries(response.data);
      setTotalCount(response.count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading kardex entries:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las entradas del kardex',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadKardexEntries(1);
  };

  const clearFilters = () => {
    setFilters({
      sample_id: undefined,
      tipo_movimiento: undefined,
      material: '',
      lote: '',
      date_from: '',
      date_to: ''
    });
    loadKardexEntries(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const entradas = entries.filter(e => e.tipo_movimiento === 'ENTRADA').length;
  const salidas = entries.filter(e => e.tipo_movimiento === 'SALIDA').length;

  const getOperationIcon = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <ArrowUp className="w-3 h-3" />;
      case 'SALIDA':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getOperationBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SALIDA':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kardex</h1>
            <p className="text-gray-600 mt-1">Cargando kardex de inventario...</p>
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
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kardex</h1>
            <p className="text-gray-600 mt-1">Control histórico de movimientos de inventario</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={totalCount === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Total Registros</p>
              <p className="text-3xl font-bold text-slate-700">{totalCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Entradas</p>
              <p className="text-3xl font-bold text-slate-700">{entradas}</p>
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
              <p className="text-3xl font-bold text-slate-700">{salidas}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-600">
              <ArrowDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Muestra</label>
            <Select
              value={filters.sample_id?.toString() || 'all'}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                sample_id: value === 'all' ? undefined : parseInt(value)
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las muestras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las muestras</SelectItem>
                {samples.map((sample) => (
                  <SelectItem key={sample.id} value={sample.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                        {sample.cod}
                      </Badge>
                      <span>{sample.material}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tipo de Movimiento</label>
            <Select
              value={filters.tipo_movimiento || 'all'}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                tipo_movimiento: value === 'all' ? undefined : value as 'ENTRADA' | 'SALIDA'
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SALIDA">Salida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Material</label>
            <Input
              placeholder="Buscar por material..."
              value={filters.material}
              onChange={(e) => setFilters(prev => ({ ...prev, material: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Lote</label>
            <Input
              placeholder="Buscar por lote..."
              value={filters.lote}
              onChange={(e) => setFilters(prev => ({ ...prev, lote: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Acciones</label>
            <div className="flex gap-2">
              <Button onClick={handleFilter} className="bg-slate-700 hover:bg-slate-800 text-white">
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Kardex Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Kardex de Inventario</h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando {startItem} - {endItem} de {totalCount} registros
              </p>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay registros de kardex
              </h3>
              <p className="text-gray-500 mb-4">
                Los registros aparecerán aquí cuando se realicen movimientos de inventario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Muestra</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Entradas</TableHead>
                    <TableHead>Salidas</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Comentarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {new Date(entry.fecha_movimiento).toLocaleDateString()} {new Date(entry.fecha_movimiento).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getOperationBadgeClass(entry.tipo_movimiento)}`}
                        >
                          {getOperationIcon(entry.tipo_movimiento)}
                          <span className="ml-1">{entry.tipo_movimiento}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{entry.sample?.material}</p>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                            {entry.sample?.cod}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.motivo}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-700">
                        {entry.tipo_movimiento === 'ENTRADA' ? entry.cantidad : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-red-700">
                        {entry.tipo_movimiento === 'SALIDA' ? entry.cantidad : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {entry.saldo_nuevo}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="truncate text-sm">{entry.comentarios || '-'}</p>
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
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                  loadKardexEntries(1);
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

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadKardexEntries(currentPage - 1)}
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
                      onClick={() => loadKardexEntries(pageNumber)}
                      className="w-10 h-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadKardexEntries(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}