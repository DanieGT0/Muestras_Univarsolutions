import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type {
  Sample,
  CreateSampleData,
  Country,
  Category,
  Supplier,
  Warehouse,
  Location,
  Responsible
} from '../../types';
import { UnidadMedida } from '../../types';
import { toast } from '../../hooks/use-toast';
import { useAuthStore } from '../../hooks/useAuth';
import { suppliersAPI, warehousesAPI, locationsAPI, responsiblesAPI, categoriesAPI, countriesAPI, samplesAPI } from '../../lib/api';
import { MultiBatchTable, type BatchRow } from './MultiBatchTable';

interface SampleFormProps {
  sample?: Sample | null;
  onSubmit: (data: CreateSampleData) => Promise<void>;
  onClose: () => void;
}

interface FormData {
  material: string;
  lote: string;
  cantidad: string;
  peso_unitario: string;
  unidad_medida: UnidadMedida;
  peso_total: string;
  fecha_vencimiento: string;
  comentarios: string;
  pais_id: string;
  categoria_id: string;
  proveedor_id: string;
  bodega_id: string;
  ubicacion_id: string;
  responsable_id: string;
}

const initialFormData: FormData = {
  material: '',
  lote: '',
  cantidad: '',
  peso_unitario: '',
  unidad_medida: UnidadMedida.KG,
  peso_total: '',
  fecha_vencimiento: '',
  comentarios: '',
  pais_id: '',
  categoria_id: '',
  proveedor_id: '',
  bodega_id: '',
  ubicacion_id: '',
  responsable_id: '',
};

const unidadesMedida = [
  { value: UnidadMedida.KG, label: 'Kilogramos (kg)' },
  { value: UnidadMedida.G, label: 'Gramos (g)' },
  { value: UnidadMedida.MG, label: 'Miligramos (mg)' },
];

export function SampleForm({ sample, onSubmit, onClose }: SampleFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  // Multi-batch mode states
  const [isMultiBatchMode, setIsMultiBatchMode] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([{
    id: '1',
    lote: '',
    cantidad: '',
    peso_unitario: '',
    fecha_vencimiento: ''
  }]);

  // State for all dropdowns
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const isInitialEditLoad = useRef(false);
  const lastLoadedCountryId = useRef<number | null>(null);

  // Load initial data (countries and categories)
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-calculate peso_total
  useEffect(() => {
    if (formData.cantidad && formData.peso_unitario) {
      const cantidad = parseFloat(formData.cantidad);
      const peso_unitario = parseFloat(formData.peso_unitario);
      if (!isNaN(cantidad) && !isNaN(peso_unitario)) {
        const peso_total = (cantidad * peso_unitario).toFixed(3);
        setFormData(prev => ({ ...prev, peso_total }));
      }
    }
  }, [formData.cantidad, formData.peso_unitario]);

  // Load related entities when country changes (only for new samples or manual country changes)
  useEffect(() => {
    // Skip if this is the initial edit load
    if (isInitialEditLoad.current) {
      return;
    }

    if (formData.pais_id) {
      loadRelatedEntities(parseInt(formData.pais_id));

      // Only reset related fields if not in edit mode
      if (!isEditMode) {
        setFormData(prev => ({
          ...prev,
          proveedor_id: '',
          bodega_id: '',
          ubicacion_id: '',
          responsable_id: ''
        }));
      }
    } else {
      // Clear related entities if no country selected
      setSuppliers([]);
      setWarehouses([]);
      setLocations([]);
      setResponsibles([]);
    }
  }, [formData.pais_id]);

  // Load sample data if editing
  useEffect(() => {
    const loadSampleData = async () => {
      if (sample) {
        setIsEditMode(true);
        isInitialEditLoad.current = true;

        // Convert date to YYYY-MM-DD format if it exists
        let fechaVencimiento = '';
        if (sample.fecha_vencimiento) {
          const date = new Date(sample.fecha_vencimiento);
          if (!isNaN(date.getTime())) {
            fechaVencimiento = date.toISOString().split('T')[0];
          }
        }

        // Load related entities first if we have a country
        if (sample.pais_id) {
          await loadRelatedEntities(sample.pais_id);
        }

        // Then set all form data including related fields in one batch
        setFormData({
          material: sample.material || '',
          lote: sample.lote || '',
          cantidad: sample.cantidad?.toString() || '',
          peso_unitario: sample.peso_unitario?.toString() || '',
          unidad_medida: sample.unidad_medida || UnidadMedida.KG,
          peso_total: sample.peso_total?.toString() || '',
          fecha_vencimiento: fechaVencimiento,
          comentarios: sample.comentarios || '',
          pais_id: sample.pais_id?.toString() || '',
          categoria_id: sample.categoria_id?.toString() || '',
          proveedor_id: sample.proveedor_id?.toString() || '',
          bodega_id: sample.bodega_id?.toString() || '',
          ubicacion_id: sample.ubicacion_id?.toString() || '',
          responsable_id: sample.responsable_id?.toString() || '',
        });

        // Delay to ensure state is set before allowing other effects
        setTimeout(() => {
          isInitialEditLoad.current = false;
        }, 100);
      } else {
        setIsEditMode(false);
        setFormData(initialFormData);
        isInitialEditLoad.current = false;
        lastLoadedCountryId.current = null;
      }
    };

    loadSampleData();
  }, [sample]);

  const loadInitialData = async () => {
    try {
      setLoadingDropdowns(true);

      const [categoriesResponse, countriesResponse] = await Promise.all([
        categoriesAPI.getCategories(),
        countriesAPI.getCountries()
      ]);

      // Backend already filters countries based on user role and assignments
      setCountries(countriesResponse.data);

      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos iniciales',
        variant: 'destructive',
      });
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const loadRelatedEntities = async (countryId: number) => {
    try {
      // Avoid loading if already loaded for this country
      if (lastLoadedCountryId.current === countryId) {
        return;
      }

      const countryIds = [countryId];

      const [suppliersResponse, warehousesResponse, locationsResponse, responsiblesResponse] = await Promise.all([
        suppliersAPI.getSuppliers({ country_ids: countryIds }),
        warehousesAPI.getWarehouses({ country_ids: countryIds }),
        locationsAPI.getLocations({ country_ids: countryIds }),
        responsiblesAPI.getResponsibles({ country_ids: countryIds })
      ]);

      setSuppliers(suppliersResponse.data);
      setWarehouses(warehousesResponse.data);
      setLocations(locationsResponse.data);
      setResponsibles(responsiblesResponse.data);

      lastLoadedCountryId.current = countryId;
    } catch (error) {
      console.error('Error loading related entities:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos relacionados',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    // Common fields validation (excluding peso_unitario in multi-batch mode)
    const commonFields: (keyof FormData)[] = [
      'material',
      'pais_id',
      'categoria_id',
      'proveedor_id',
      'bodega_id',
      'ubicacion_id',
      'responsable_id'
    ];

    // Add peso_unitario validation only for single mode
    if (!isMultiBatchMode) {
      commonFields.push('peso_unitario');
    }

    for (const field of commonFields) {
      if (!formData[field]) {
        toast({
          title: 'Error de Validación',
          description: `El campo ${field} es requerido`,
          variant: 'destructive',
        });
        return false;
      }
    }

    // Validate peso_unitario only in single mode
    if (!isMultiBatchMode && (isNaN(parseFloat(formData.peso_unitario)) || parseFloat(formData.peso_unitario) <= 0)) {
      toast({
        title: 'Error de Validación',
        description: 'El peso unitario debe ser un número mayor a 0',
        variant: 'destructive',
      });
      return false;
    }

    // Multi-batch mode validation
    if (isMultiBatchMode && !sample) {
      if (batches.length === 0) {
        toast({
          title: 'Error de Validación',
          description: 'Debe agregar al menos un lote',
          variant: 'destructive',
        });
        return false;
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch.lote) {
          toast({
            title: 'Error de Validación',
            description: `El lote #${i + 1} requiere un número de lote`,
            variant: 'destructive',
          });
          return false;
        }
        if (!batch.cantidad || isNaN(parseFloat(batch.cantidad)) || parseFloat(batch.cantidad) <= 0) {
          toast({
            title: 'Error de Validación',
            description: `El lote #${i + 1} requiere una cantidad válida`,
            variant: 'destructive',
          });
          return false;
        }
        if (!batch.peso_unitario || isNaN(parseFloat(batch.peso_unitario)) || parseFloat(batch.peso_unitario) <= 0) {
          toast({
            title: 'Error de Validación',
            description: `El lote #${i + 1} requiere un peso unitario válido`,
            variant: 'destructive',
          });
          return false;
        }
      }
    } else {
      // Single mode validation
      if (!formData.lote || !formData.cantidad) {
        toast({
          title: 'Error de Validación',
          description: 'Lote y cantidad son requeridos',
          variant: 'destructive',
        });
        return false;
      }

      if (isNaN(parseFloat(formData.cantidad)) || parseFloat(formData.cantidad) <= 0) {
        toast({
          title: 'Error de Validación',
          description: 'La cantidad debe ser un número mayor a 0',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      if (isMultiBatchMode && !sample) {
        // Multi-batch mode: create multiple samples
        let successCount = 0;
        let errorCount = 0;

        for (const batch of batches) {
          const pesoUnitario = parseFloat(batch.peso_unitario);
          const cantidad = parseFloat(batch.cantidad);
          const pesoTotal = cantidad * pesoUnitario;

          const submitData: CreateSampleData = {
            material: formData.material,
            lote: batch.lote,
            cantidad: cantidad,
            peso_unitario: pesoUnitario,
            unidad_medida: formData.unidad_medida,
            peso_total: pesoTotal,
            fecha_vencimiento: batch.fecha_vencimiento || undefined,
            comentarios: formData.comentarios || undefined,
            pais_id: parseInt(formData.pais_id),
            categoria_id: parseInt(formData.categoria_id),
            proveedor_id: parseInt(formData.proveedor_id),
            bodega_id: parseInt(formData.bodega_id),
            ubicacion_id: parseInt(formData.ubicacion_id),
            responsable_id: parseInt(formData.responsable_id),
          };

          try {
            await samplesAPI.createSample(submitData);
            successCount++;
          } catch (error) {
            console.error(`Error creating batch ${batch.lote}:`, error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast({
            title: '✅ Muestras Creadas',
            description: `Se crearon ${successCount} muestra(s) exitosamente${errorCount > 0 ? ` (${errorCount} fallaron)` : ''}`,
          });
          onClose();
        } else {
          toast({
            title: 'Error',
            description: 'No se pudo crear ninguna muestra',
            variant: 'destructive',
          });
        }
      } else {
        // Single mode or edit mode
        const submitData: CreateSampleData = {
          material: formData.material,
          lote: formData.lote,
          cantidad: parseFloat(formData.cantidad),
          peso_unitario: parseFloat(formData.peso_unitario),
          unidad_medida: formData.unidad_medida,
          peso_total: parseFloat(formData.peso_total),
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
          comentarios: formData.comentarios || undefined,
          pais_id: parseInt(formData.pais_id),
          categoria_id: parseInt(formData.categoria_id),
          proveedor_id: parseInt(formData.proveedor_id),
          bodega_id: parseInt(formData.bodega_id),
          ubicacion_id: parseInt(formData.ubicacion_id),
          responsable_id: parseInt(formData.responsable_id),
        };

        await onSubmit(submitData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {sample ? 'Editar Muestra' : 'Nueva Muestra'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                📋 Información Básica
              </h3>
              {!sample && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Código automático:</strong> Se generará automáticamente con el formato [PAÍS][DD][MM][YY][###]
                    {formData.pais_id && countries.find(c => c.id.toString() === formData.pais_id) && (
                      <span className="font-mono ml-2 text-blue-600 block mt-1">
                        Ejemplo para hoy: {countries.find(c => c.id.toString() === formData.pais_id)?.cod}
                        {new Date().getDate().toString().padStart(2, '0')}
                        {(new Date().getMonth() + 1).toString().padStart(2, '0')}
                        {new Date().getFullYear().toString().slice(-2)}001
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material" className="text-sm font-medium">
                  Material *
                </Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) => handleInputChange('material', e.target.value)}
                  placeholder="Ej: Celulosa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pais_id" className="text-sm font-medium">
                  País * {user?.role === 'ADMIN' ? '(Admin - Todos los países)' : '(Países asignados)'}
                </Label>
                <select
                  id="pais_id"
                  value={formData.pais_id}
                  onChange={(e) => handleInputChange('pais_id', e.target.value)}
                  required
                  disabled={loadingDropdowns}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">{loadingDropdowns ? 'Cargando países...' : 'Seleccionar país'}</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      [{country.cod}] {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria_id" className="text-sm font-medium">
                  Categoría *
                </Label>
                <select
                  id="categoria_id"
                  value={formData.categoria_id}
                  onChange={(e) => handleInputChange('categoria_id', e.target.value)}
                  required
                  disabled={loadingDropdowns}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">{loadingDropdowns ? 'Cargando categorías...' : 'Seleccionar categoría'}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      [{category.cod}] {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Multi-batch toggle (only for new samples) */}
          {!sample && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    🚀 Creación Múltiple de Lotes
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Activa esta opción para crear varias muestras del mismo material con diferentes lotes a la vez
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMultiBatchMode}
                    onChange={(e) => setIsMultiBatchMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-900">{isMultiBatchMode ? 'ON' : 'OFF'}</span>
                </label>
              </div>
            </div>
          )}

          {/* Quantities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              ⚖️ Cantidades y Medidas
            </h3>

            {/* Common fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {!isMultiBatchMode && (
                <div className="space-y-2">
                  <Label htmlFor="peso_unitario" className="text-sm font-medium">
                    Peso Unitario *
                  </Label>
                  <Input
                    id="peso_unitario"
                    type="number"
                    step="0.0001"
                    value={formData.peso_unitario}
                    onChange={(e) => handleInputChange('peso_unitario', e.target.value)}
                    placeholder="0.0000"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unidad_medida" className="text-sm font-medium">
                  Unidad *
                </Label>
                <select
                  id="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={(e) => handleInputChange('unidad_medida', e.target.value as UnidadMedida)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {unidadesMedida.map((unidad) => (
                    <option key={unidad.value} value={unidad.value}>
                      {unidad.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isMultiBatchMode && (
                <div className="space-y-2">
                  <Label htmlFor="peso_total" className="text-sm font-medium">
                    Peso Total
                  </Label>
                  <Input
                    id="peso_total"
                    type="number"
                    step="0.001"
                    value={formData.peso_total}
                    readOnly
                    className="bg-gray-50"
                    placeholder="Auto-calculado"
                  />
                </div>
              )}
            </div>

            {/* Info message in multi-batch mode */}
            {isMultiBatchMode && !sample && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ℹ️ <strong>Modo Múltiples Lotes:</strong> El peso unitario se especifica individualmente para cada lote en la tabla de abajo.
                </p>
              </div>
            )}

            {/* Conditional: Multi-batch table OR single fields */}
            {isMultiBatchMode && !sample ? (
              <MultiBatchTable
                batches={batches}
                onBatchesChange={setBatches}
                defaultPesoUnitario={formData.peso_unitario}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lote" className="text-sm font-medium">
                    Lote *
                  </Label>
                  <Input
                    id="lote"
                    value={formData.lote}
                    onChange={(e) => handleInputChange('lote', e.target.value)}
                    placeholder="Número de lote"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cantidad" className="text-sm font-medium">
                    Cantidad *
                  </Label>
                  <Input
                    id="cantidad"
                    type="number"
                    step="0.001"
                    value={formData.cantidad}
                    onChange={(e) => handleInputChange('cantidad', e.target.value)}
                    placeholder="0.000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento" className="text-sm font-medium">
                    Fecha Vencimiento
                  </Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => handleInputChange('fecha_vencimiento', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              📍 Ubicación y Responsables
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proveedor_id" className="text-sm font-medium">
                  Proveedor * {!formData.pais_id && '(Selecciona un país primero)'}
                </Label>
                <select
                  id="proveedor_id"
                  value={formData.proveedor_id}
                  onChange={(e) => handleInputChange('proveedor_id', e.target.value)}
                  required
                  disabled={!formData.pais_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.pais_id ? 'Selecciona un país primero' : 'Seleccionar proveedor'}
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      [{supplier.cod}] {supplier.name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && formData.pais_id && (
                  <p className="text-sm text-gray-500">No hay proveedores disponibles para este país</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodega_id" className="text-sm font-medium">
                  Bodega * {!formData.pais_id && '(Selecciona un país primero)'}
                </Label>
                <select
                  id="bodega_id"
                  value={formData.bodega_id}
                  onChange={(e) => handleInputChange('bodega_id', e.target.value)}
                  required
                  disabled={!formData.pais_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.pais_id ? 'Selecciona un país primero' : 'Seleccionar bodega'}
                  </option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      [{warehouse.cod}] {warehouse.name}
                    </option>
                  ))}
                </select>
                {warehouses.length === 0 && formData.pais_id && (
                  <p className="text-sm text-gray-500">No hay bodegas disponibles para este país</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ubicacion_id" className="text-sm font-medium">
                  Ubicación * {!formData.pais_id && '(Selecciona un país primero)'}
                </Label>
                <select
                  id="ubicacion_id"
                  value={formData.ubicacion_id}
                  onChange={(e) => handleInputChange('ubicacion_id', e.target.value)}
                  required
                  disabled={!formData.pais_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.pais_id ? 'Selecciona un país primero' : 'Seleccionar ubicación'}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      [{location.cod}] {location.name}
                    </option>
                  ))}
                </select>
                {locations.length === 0 && formData.pais_id && (
                  <p className="text-sm text-gray-500">No hay ubicaciones disponibles para este país</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsable_id" className="text-sm font-medium">
                  Responsable * {!formData.pais_id && '(Selecciona un país primero)'}
                </Label>
                <select
                  id="responsable_id"
                  value={formData.responsable_id}
                  onChange={(e) => handleInputChange('responsable_id', e.target.value)}
                  required
                  disabled={!formData.pais_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!formData.pais_id ? 'Selecciona un país primero' : 'Seleccionar responsable'}
                  </option>
                  {responsibles.map((responsible) => (
                    <option key={responsible.id} value={responsible.id}>
                      [{responsible.cod}] {responsible.name}
                    </option>
                  ))}
                </select>
                {responsibles.length === 0 && formData.pais_id && (
                  <p className="text-sm text-gray-500">No hay responsables disponibles para este país</p>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              💬 Comentarios
            </h3>

            <div className="space-y-2">
              <Label htmlFor="comentarios" className="text-sm font-medium">
                Comentarios Adicionales
              </Label>
              <textarea
                id="comentarios"
                value={formData.comentarios}
                onChange={(e) => handleInputChange('comentarios', e.target.value)}
                placeholder="Comentarios adicionales sobre la muestra..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {loading ? 'Guardando...' : (sample ? 'Actualizar' : 'Guardar')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}