import { useState, useEffect, useRef } from 'react';
import { X, ArrowRightLeft, Package2, Globe, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from '../../hooks/use-toast';
import type {
  CreateTransferData,
  Sample,
  Country
} from '../../types';
import { samplesAPI, countriesAPI } from '../../lib/api';

interface TransferFormProps {
  onSubmit: (data: CreateTransferData) => Promise<void>;
  onClose: () => void;
}

export function TransferForm({ onSubmit, onClose }: TransferFormProps) {
  const [formData, setFormData] = useState({
    muestra_origen_id: 0,
    cantidad_trasladada: null as number | null,
    pais_destino_id: 0, // Sin país preseleccionado
    motivo: '',
    comentarios_traslado: ''
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load samples
  useEffect(() => {
    const loadSamples = async () => {
      try {
        setDataLoading(true);
        const [samplesData, countriesData] = await Promise.all([
          samplesAPI.getSamples(1, 1000),
          countriesAPI.getAllCountriesForTransfers()
        ]);
        setSamples(samplesData.data || []);
        setCountries(countriesData.data || []);
      } catch (error) {
        console.error('Error loading samples:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos necesarios',
          variant: 'destructive',
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadSamples();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter samples based on search term
  const filteredSamples = samples.filter(sample => {
    const search = searchTerm.toLowerCase();
    return (
      sample.cod.toLowerCase().includes(search) ||
      sample.material.toLowerCase().includes(search) ||
      sample.lote.toLowerCase().includes(search)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.muestra_origen_id) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una muestra',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.pais_destino_id) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona el país de destino',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.motivo.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el motivo del traslado',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.cantidad_trasladada || formData.cantidad_trasladada <= 0) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (selectedSample && formData.cantidad_trasladada > selectedSample.cantidad) {
      toast({
        title: 'Error',
        description: 'No hay suficiente cantidad disponible',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData as any);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleSelect = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData(prev => ({ ...prev, muestra_origen_id: sample.id }));
    setSearchTerm(`${sample.cod} - ${sample.material}`);
    setShowDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) {
      setSelectedSample(null);
      setFormData(prev => ({ ...prev, muestra_origen_id: 0 }));
    }
  };

  if (dataLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700"></div>
            <span>Cargando datos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Nuevo Traslado
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Sample Selection with Search */}
            <div className="space-y-2" ref={dropdownRef}>
              <Label htmlFor="muestra">Muestra a Trasladar *</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="muestra"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por código, material o lote..."
                    className="pl-10"
                    autoComplete="off"
                  />
                </div>

                {/* Dropdown with filtered results */}
                {showDropdown && filteredSamples.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSamples.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleSampleSelect(sample)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                            {sample.cod}
                          </Badge>
                          <span className="font-medium">{sample.material}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>Lote: {sample.lote}</span>
                          <span>Stock: {sample.cantidad} {sample.unidad_medida}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {showDropdown && searchTerm && filteredSamples.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-sm text-gray-500">
                    No se encontraron muestras
                  </div>
                )}
              </div>
            </div>

            {/* Sample Info Card */}
            {selectedSample && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Información de la Muestra</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Código</p>
                    <p className="font-medium">{selectedSample.cod}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lote</p>
                    <p className="font-medium">{selectedSample.lote}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cantidad Disponible</p>
                    <p className="font-medium">{selectedSample.cantidad} {selectedSample.unidad_medida}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad a Trasladar *</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad_trasladada || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  cantidad_trasladada: e.target.value ? parseFloat(e.target.value) : null
                }))}
                placeholder="Ingrese la cantidad a trasladar"
                min="0.01"
                step="0.01"
                required
              />
              {selectedSample && (
                <div className="text-sm text-gray-600">
                  Stock disponible: {selectedSample.cantidad} {selectedSample.unidad_medida}
                </div>
              )}
              {selectedSample && formData.cantidad_trasladada && formData.cantidad_trasladada > selectedSample.cantidad && (
                <p className="text-sm text-red-600">
                  ⚠️ Cantidad excede el stock disponible ({selectedSample.cantidad} {selectedSample.unidad_medida})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pais_destino">País de Destino *</Label>
              <Select
                value={formData.pais_destino_id.toString()}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  pais_destino_id: parseInt(value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país de destino" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-600" />
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                          {country.cod}
                        </Badge>
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Traslado *</Label>
              <Input
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  motivo: e.target.value
                }))}
                placeholder="Ej: Traslado a laboratorio de análisis"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios Adicionales</Label>
              <Input
                id="comentarios"
                value={formData.comentarios_traslado}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  comentarios_traslado: e.target.value
                }))}
                placeholder="Comentarios opcionales sobre el traslado"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                {loading ? 'Creando...' : 'Crear Traslado'}
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