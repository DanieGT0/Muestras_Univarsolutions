import { useQuery } from '@tanstack/react-query';
import { samplesAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Loader2, Plus } from 'lucide-react';

export function SamplesList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['samples'],
    queryFn: () => samplesAPI.getSamples(1, 10),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando muestras...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Error al cargar las muestras</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Muestras</h1>
          <p className="text-muted-foreground">
            Administra las muestras del sistema de inventario
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Muestra
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Muestras Recientes</CardTitle>
          <CardDescription>
            {data?.count || 0} muestras en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.data && data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">{sample.cod}</TableCell>
                    <TableCell>{sample.material}</TableCell>
                    <TableCell>{sample.lote}</TableCell>
                    <TableCell>{sample.cantidad}</TableCell>
                    <TableCell>
                      {sample.peso_total} {sample.unidad_medida}
                    </TableCell>
                    <TableCell>
                      {sample.pais && (
                        <Badge variant="outline">
                          {sample.pais.cod} - {sample.pais.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sample.categoria && (
                        <Badge variant="secondary">
                          {sample.categoria.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(sample.fecha_registro).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No hay muestras registradas</p>
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera muestra
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}