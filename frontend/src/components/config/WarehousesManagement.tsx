import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Building, CheckCircle, BarChart3, Globe, Upload } from 'lucide-react';
import { ConfigImportModal } from './ConfigImportModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
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
import { warehousesAPI, countriesAPI } from '../../lib/api';
import type { Warehouse, Country } from '../../types';

export function WarehousesManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    cod: '',
    name: '',
    country_ids: [] as number[]
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warehousesResponse, countriesResponse] = await Promise.all([
        warehousesAPI.getWarehouses(),
        countriesAPI.getCountries()
      ]);
      setWarehouses(warehousesResponse.data);
      setCountries(countriesResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ cod: '', name: '', country_ids: [] });
    setEditingWarehouse(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWarehouse) {
        await warehousesAPI.updateWarehouse(editingWarehouse.id, formData);
        toast({
          title: 'Bodega actualizada',
          description: 'La bodega ha sido actualizada exitosamente',
        });
      } else {
        await warehousesAPI.createWarehouse(formData);
        toast({
          title: 'Bodega creada',
          description: 'La bodega ha sido creada exitosamente',
        });
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: `No se pudo ${editingWarehouse ? 'actualizar' : 'crear'} la bodega`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      cod: warehouse.cod,
      name: warehouse.name,
      country_ids: warehouse.countries?.map(c => c.id) || []
    });
    setShowForm(true);

    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (warehouse: Warehouse) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la bodega "${warehouse.name}"?`)) {
      return;
    }

    try {
      await warehousesAPI.deleteWarehouse(warehouse.id);
      toast({
        title: 'Bodega eliminada',
        description: 'La bodega ha sido eliminada exitosamente',
      });
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la bodega',
        variant: 'destructive',
      });
    }
  };

  const handleCountryToggle = (countryId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      country_ids: checked
        ? [...prev.country_ids, countryId]
        : prev.country_ids.filter(id => id !== countryId)
    }));
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  // Get last created code
  const lastCreatedCode = warehouses.length > 0 ? warehouses[warehouses.length - 1].cod : 'N/A';

  // Pagination calculations
  const totalPages = Math.ceil(warehouses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWarehouses = warehouses.slice(startIndex, endIndex);

  // Reset to page 1 when changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-slate-700">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-700">{warehouses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-600">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Activos</p>
              <p className="text-2xl font-bold text-slate-700">{warehouses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-600">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Registros</p>
              <p className="text-2xl font-bold text-slate-700">{warehouses.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Lista de Bodegas
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-slate-700 text-slate-700 hover:bg-slate-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Bodega
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card ref={formRef} className="p-6 border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}
              </h4>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>

            {/* Show last created code when creating */}
            {!editingWarehouse && warehouses.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Último código creado:</span>{' '}
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 font-mono">
                    {lastCreatedCode}
                  </Badge>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cod" className="text-sm font-medium">
                  Código *
                </Label>
                <Input
                  id="cod"
                  value={formData.cod}
                  onChange={(e) => setFormData(prev => ({ ...prev, cod: e.target.value }))}
                  placeholder="BOD001"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Bodega *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de la bodega"
                  required
                />
              </div>
            </div>

            {/* Countries Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <Label className="text-sm font-medium">Países Asignados</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg bg-white">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`country-${country.id}`}
                      checked={formData.country_ids.includes(country.id)}
                      onCheckedChange={(checked) =>
                        handleCountryToggle(country.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`country-${country.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      <span className="font-mono text-xs bg-gray-200 px-1 rounded mr-1">
                        {country.cod}
                      </span>
                      {country.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                {editingWarehouse ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Bodega</TableHead>
              <TableHead>Países</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWarehouses.map((warehouse) => (
              <TableRow key={warehouse.id}>
                <TableCell className="font-mono">{warehouse.cod}</TableCell>
                <TableCell className="font-medium">{warehouse.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {warehouse.countries?.map((country) => (
                      <Badge key={country.id} variant="outline" className="text-xs">
                        {country.cod}
                      </Badge>
                    )) || <span className="text-gray-400">Sin países</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(warehouse)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(warehouse)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
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
              {startIndex + 1}-{Math.min(endIndex, warehouses.length)} de {warehouses.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(pageNumber)}
                  className="w-10 h-10"
                >
                  {pageNumber}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Modal */}
      {showImportModal && (
        <ConfigImportModal
          configType="warehouses"
          title="Bodegas"
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadData();
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}