import { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
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
  Movement,
  CreateMovementData,
  Sample,
} from '../../types';
import { TipoMovimiento } from '../../types';
import { samplesAPI } from '../../lib/api';

interface MovementFormProps {
  movement?: Movement | null;
  onSubmit: (data: CreateMovementData) => Promise<void>;
  onClose: () => void;
}

export function MovementForm({ movement, onSubmit, onClose }: MovementFormProps) {
  const [formData, setFormData] = useState<CreateMovementData>({
    sample_id: 0,
    tipo_movimiento: TipoMovimiento.ENTRADA,
    cantidad_movida: 0,
    motivo: '',
    comentarios: ''
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(true);

  // Load samples on component mount
  useEffect(() => {
    loadSamples();
  }, []);

  // Handle editing mode
  useEffect(() => {
    if (movement) {
      setFormData({
        sample_id: movement.sample_id,
        tipo_movimiento: movement.tipo_movimiento,
        cantidad_movida: movement.cantidad_movida,
        motivo: movement.motivo,
        comentarios: movement.comentarios || ''
      });

      const sample = samples.find(s => s.id === movement.sample_id);
      if (sample) {
        setSelectedSample(sample);
      }
    }
  }, [movement, samples]);

  const loadSamples = async () => {
    try {
      setLoadingSamples(true);
      // Load all samples without pagination
      const response = await samplesAPI.getSamples(1, 1000);
      setSamples(response.data);
    } catch (error) {
      console.error('Error loading samples:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las muestras',
        variant: 'destructive',
      });
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sample_id) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una muestra',
        variant: 'destructive',
      });
      return;
    }

    if (formData.cantidad_movida <= 0) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.motivo.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa el motivo del movimiento',
        variant: 'destructive',
      });
      return;
    }

    if (formData.tipo_movimiento === 'SALIDA' && selectedSample) {
      if (formData.cantidad_movida > selectedSample.cantidad) {
        toast({
          title: 'Error',
          description: 'No hay suficiente cantidad disponible',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleChange = (sampleId: string) => {
    const sample = samples.find(s => s.id === parseInt(sampleId));
    if (sample) {
      setSelectedSample(sample);
      setFormData(prev => ({ ...prev, sample_id: sample.id }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                {formData.tipo_movimiento === 'ENTRADA' ? (
                  <ArrowUp className="w-4 h-4 text-white" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-white" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {movement ? 'Editar Movimiento' : 'Nuevo Movimiento'}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Movimiento *</Label>
                <Select
                  value={formData.tipo_movimiento}
                  onValueChange={(value: TipoMovimiento) =>
                    setFormData(prev => ({ ...prev, tipo_movimiento: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="w-4 h-4 text-emerald-600" />
                        <span>Entrada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SALIDA">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        <span>Salida</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="muestra">Muestra *</Label>
                <Select
                  value={formData.sample_id.toString()}
                  onValueChange={handleSampleChange}
                  disabled={loadingSamples}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSamples ? "Cargando muestras..." : "Seleccionar muestra"} />
                  </SelectTrigger>
                  <SelectContent>
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
                {samples.length === 0 && !loadingSamples && (
                  <p className="text-sm text-gray-500">No hay muestras disponibles</p>
                )}
              </div>
            </div>

            {/* Sample Info Card */}
            {selectedSample && (
              <Card className="p-4 bg-slate-50 border-slate-200">
                <h3 className="font-medium text-gray-900 mb-3">Información de la Muestra</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Código</p>
                    <p className="font-medium">{selectedSample.cod}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Lote</p>
                    <p className="font-medium">{selectedSample.lote}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cantidad Actual</p>
                    <p className="font-medium">{selectedSample.cantidad} {selectedSample.unidad_medida}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Peso Total</p>
                    <p className="font-medium">{selectedSample.peso_total} {selectedSample.unidad_medida}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad_movida}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  cantidad_movida: parseInt(e.target.value) || 0
                }))}
                placeholder="0"
                min="1"
                step="1"
                required
              />
              {formData.tipo_movimiento === 'SALIDA' && selectedSample && formData.cantidad_movida > selectedSample.cantidad && (
                <p className="text-sm text-red-600">
                  ⚠️ Cantidad excede el stock disponible ({selectedSample.cantidad} {selectedSample.unidad_medida})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  motivo: e.target.value
                }))}
                placeholder="Motivo del movimiento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Input
                id="comentarios"
                value={formData.comentarios}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  comentarios: e.target.value
                }))}
                placeholder="Comentarios adicionales (opcional)"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                {loading ? 'Guardando...' : (movement ? 'Actualizar' : 'Registrar Movimiento')}
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