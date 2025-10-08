import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/table';
import { ArrowDown, Search } from 'lucide-react';
import { movementsAPI } from '../../lib/api';
import type { Movement } from '../../types';

interface OutputMovementsTableProps {
  loading?: boolean;
}

export function OutputMovementsTable({ loading: externalLoading }: OutputMovementsTableProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutputMovements();
  }, []);

  const loadOutputMovements = async () => {
    try {
      setLoading(true);
      // Get all SALIDA movements with limit 100
      const response = await movementsAPI.getMovements(1, 100, { tipo_movimiento: 'SALIDA' });
      setMovements(response.data || []);
    } catch (error) {
      console.error('Error loading output movements:', error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || externalLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Salidas Recientes</h2>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Salidas Recientes</h2>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay salidas registradas
          </h3>
          <p className="text-gray-500">
            Aún no se han registrado salidas en el sistema.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Salidas Recientes</h2>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <ArrowDown className="w-3 h-3 mr-1" />
            {movements.length} salidas
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Sample Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(movement.fecha_movimiento).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-mono">
                      {movement.sample?.cod || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="truncate font-medium">{movement.sample?.material || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.sample?.lote || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-red-600">-{movement.cantidad_movida}</span>
                      <span className="text-xs text-gray-500">
                        {(movement.sample as any)?.unidad_medida || ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {(movement.sample as any)?.pais_name || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(movement.sample as any)?.responsable_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px]">
                      <p className="truncate text-sm font-medium text-blue-600">
                        {movement.motivo}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {movements.length > 0 && (
          <div className="text-sm text-gray-500 text-center pt-2 border-t">
            Mostrando las últimas {movements.length} salidas
          </div>
        )}
      </div>
    </Card>
  );
}
