import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface BatchRow {
  id: string;
  lote: string;
  cantidad: string;
  fecha_vencimiento: string;
}

interface MultiBatchTableProps {
  batches: BatchRow[];
  onBatchesChange: (batches: BatchRow[]) => void;
  pesoUnitario: string;
}

export function MultiBatchTable({ batches, onBatchesChange, pesoUnitario }: MultiBatchTableProps) {
  const addBatch = () => {
    const newBatch: BatchRow = {
      id: Date.now().toString(),
      lote: '',
      cantidad: '',
      fecha_vencimiento: ''
    };
    onBatchesChange([...batches, newBatch]);
  };

  const removeBatch = (id: string) => {
    if (batches.length === 1) {
      return; // Keep at least one row
    }
    onBatchesChange(batches.filter(b => b.id !== id));
  };

  const updateBatch = (id: string, field: keyof BatchRow, value: string) => {
    onBatchesChange(
      batches.map(b => b.id === id ? { ...b, [field]: value } : b)
    );
  };

  const calculatePesoTotal = (cantidad: string): string => {
    const cant = parseFloat(cantidad);
    const peso = parseFloat(pesoUnitario);
    if (!isNaN(cant) && !isNaN(peso)) {
      return (cant * peso).toFixed(3);
    }
    return '0.000';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          📦 Lotes a Crear ({batches.length} {batches.length === 1 ? 'lote' : 'lotes'})
        </Label>
        <Button
          type="button"
          size="sm"
          onClick={addBatch}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar Lote
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-8">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Lote *</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cantidad *</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Peso Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha Venc.</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-16">Acción</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, index) => (
                <tr key={batch.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Input
                      value={batch.lote}
                      onChange={(e) => updateBatch(batch.id, 'lote', e.target.value)}
                      placeholder="LOTE-001"
                      required
                      className="min-w-[150px]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={batch.cantidad}
                      onChange={(e) => updateBatch(batch.id, 'cantidad', e.target.value)}
                      placeholder="0.000"
                      required
                      className="min-w-[120px]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="px-3 py-2 bg-slate-50 rounded border text-sm font-mono text-gray-700 min-w-[100px]">
                      {calculatePesoTotal(batch.cantidad)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      value={batch.fecha_vencimiento}
                      onChange={(e) => updateBatch(batch.id, 'fecha_vencimiento', e.target.value)}
                      className="min-w-[150px]"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBatch(batch.id)}
                      disabled={batches.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Se crearán {batches.length} muestras con los mismos datos comunes pero diferentes lotes, cantidades y fechas de vencimiento.
        </p>
      </div>
    </div>
  );
}
