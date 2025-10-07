import { useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Upload,
  Download,
  File,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../../lib/api';

interface ImportedSample {
  id: number;
  cod: string;
  material: string;
  lote: string;
}

interface ImportResult {
  message: string;
  imported_count: number;
  error_count: number;
  imported_samples: ImportedSample[];
  errors: string[];
}

interface ValidRow {
  material: string;
  lote: string;
  cantidad: number;
  peso_unitario: number;
  unidad_medida: string;
  peso_total: number;
  fecha_vencimiento?: string;
  comentarios?: string;
  cod_pais: string;
  cod_categoria: string;
  cod_proveedor: string;
  cod_bodega: string;
  cod_ubicacion: string;
  cod_responsable: string;
  row_number: number;
  generated_cod: string;
}

interface ValidationResult {
  message: string;
  valid_count: number;
  error_count: number;
  valid_rows: ValidRow[];
  errors: Array<{ row: number; message: string }>;
}

export function ImportManagement() {
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get('/imports/template', {
        responseType: 'blob'
      });

      // Response.data contains the blob when using axios with responseType: 'blob'
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from header or use default
      let filename = 'plantilla_muestras.xlsx';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Template downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      // For now, create a mock Excel template
      createMockTemplate();
    } finally {
      setIsDownloading(false);
    }
  };

  const createMockTemplate = () => {
    // Create a simple CSV template that can be opened in Excel
    const headers = [
      'Código País',
      'Código Categoría',
      'Código Proveedor',
      'Código Bodega',
      'Código Ubicación',
      'Código Responsable',
      'Material',
      'Lote',
      'Cantidad',
      'Peso Unitario',
      'Unidad Medida',
      'Peso Total',
      'Fecha Vencimiento',
      'Comentarios'
    ];

    const sampleData = [
      'AR,MET,PROV001,BOD001,UBI001,RESP001,Mineral de hierro,LOTE001,100,1.5,kg,150,31/12/2025,Muestra de ejemplo'
    ];

    const csvContent = [
      headers.join(','),
      sampleData.join('\n')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_muestras.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/imports/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result: ValidationResult = response.data;
      setValidationResult(result);

    } catch (error) {
      console.error('Validation error:', error);
      alert('Error al validar el archivo. Por favor intente nuevamente.');
    } finally {
      setIsValidating(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.valid_rows.length === 0) {
      alert('No hay filas válidas para importar');
      return;
    }

    setIsConfirming(true);

    try {
      const response = await api.post('/imports/confirm', {
        valid_rows: validationResult.valid_rows
      });

      const result: ImportResult = response.data;
      setImportResult(result);
      setValidationResult(null);

    } catch (error) {
      console.error('Confirmation error:', error);
      alert('Error al confirmar la importación. Por favor intente nuevamente.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelImport = () => {
    setValidationResult(null);
    setImportResult(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
          <Upload className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Importar Muestras</h1>
          <p className="text-gray-600 mt-1">Importe muestras masivamente desde archivos Excel</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary-600 rounded-lg flex items-center justify-center">
            <File className="w-4 h-4 text-white" />
          </div>
          Instrucciones de Importación
        </h2>

        <div className="space-y-4">
          <p className="text-gray-600">Para importar muestras desde Excel, siga estos pasos:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Descargar Plantilla</p>
                <p className="text-sm text-gray-600">Descargue la plantilla Excel con el formato correcto</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Completar Datos</p>
                <p className="text-sm text-gray-600">Complete la plantilla con los datos de sus muestras</p>
                <p className="text-xs text-green-700 mt-1 font-medium">⚠️ Use fechas en formato dd/mm/yyyy (ej: 31/12/2025)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Verificar Referencias</p>
                <p className="text-sm text-gray-600">Asegúrese que todos los códigos existan en el sistema</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white font-bold text-sm">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">Subir Archivo</p>
                <p className="text-sm text-gray-600">Suba el archivo completado para procesarlo</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Descargando...' : 'Descargar Plantilla Excel'}
          </Button>

          <Button
            onClick={handleUploadClick}
            disabled={isValidating || isConfirming}
            size="lg"
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isValidating ? 'Validando...' : 'Validar Excel'}
          </Button>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      </Card>

      {/* Validation Progress */}
      {isValidating && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="font-medium text-gray-900">Validando archivo Excel...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
            <p className="text-sm text-gray-600">
              Por favor espere mientras se validan los datos
            </p>
          </div>
        </Card>
      )}

      {/* Validation Preview */}
      {validationResult && !importResult && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Vista Previa de Importación
              </h3>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {validationResult.valid_count} Válidas
                </Badge>
                {validationResult.error_count > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    {validationResult.error_count} Errores
                  </Badge>
                )}
              </div>
            </div>

            {/* Valid Rows Table */}
            {validationResult.valid_count > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Filas válidas para importar:</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fila</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">País</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {validationResult.valid_rows.map((row) => (
                          <tr key={row.row_number} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{row.row_number}</td>
                            <td className="px-4 py-2 text-sm font-mono text-blue-600">{row.generated_cod}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.material}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.lote}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.cantidad}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.cod_pais}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {validationResult.error_count > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-red-800">
                      Se encontraron {validationResult.error_count} errores:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>Fila {error.row}: {error.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleCancelImport}
                variant="outline"
                disabled={isConfirming}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isConfirming || validationResult.valid_count === 0}
                className="flex items-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Aprobar e Importar {validationResult.valid_count} Muestras
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Resultado de la Importación
              </h3>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {importResult.imported_count} Exitosas
                </Badge>
                {importResult.error_count > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    {importResult.error_count} Errores
                  </Badge>
                )}
              </div>
            </div>

            {/* Success Section */}
            {importResult.imported_count > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-green-800">
                      Se importaron {importResult.imported_count} muestras exitosamente:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.imported_samples.map((sample) => (
                        <div key={sample.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span>
                            <strong>{sample.cod}</strong> - {sample.material} (Lote: {sample.lote})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Section */}
            {importResult.error_count > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-red-800">
                      Se encontraron {importResult.error_count} errores:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Important Notes */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-amber-800">Notas Importantes:</p>
            <ul className="text-sm text-amber-700 space-y-1 ml-4">
              <li className="list-disc">Todos los códigos de referencia (País, Categoría, Proveedor, etc.) deben existir previamente en el sistema</li>
              <li className="list-disc">Las fechas deben estar en formato dd/mm/yyyy (ejemplo: 31/12/2025)</li>
              <li className="list-disc">La unidad de medida debe ser: kg, g, o mg</li>
              <li className="list-disc">Los campos marcados como obligatorios no pueden estar vacíos</li>
              <li className="list-disc">El código de muestra se generará automáticamente basado en el país y fecha</li>
              <li className="list-disc">NO incluya columnas de ID - el sistema los asignará automáticamente</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}