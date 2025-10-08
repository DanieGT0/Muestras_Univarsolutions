import { useState, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  X
} from 'lucide-react';
import api from '../../lib/api';

interface ConfigImportModalProps {
  configType: 'countries' | 'categories' | 'suppliers' | 'warehouses' | 'locations' | 'responsibles';
  title: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  message: string;
  imported_count: number;
  error_count: number;
  imported_items: Array<{ cod: string; name: string }>;
  errors: string[];
}

export function ConfigImportModal({ configType, title, onClose, onSuccess }: ConfigImportModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/config-imports/${configType}/template`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename = `plantilla_${configType}.xlsx`;
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
    } catch (error) {
      console.error('Download error:', error);
      alert('Error al descargar la plantilla. Por favor intente nuevamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/config-imports/${configType}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const result: ImportResult = response.data;
      setImportResult(result);

    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Error al importar el archivo. Por favor intente nuevamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Importar {title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Importe datos masivamente desde archivos Excel
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Instrucciones:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Descargue la plantilla Excel haciendo clic en el botón "Descargar Plantilla"</li>
              <li>Complete la plantilla con los datos que desea importar</li>
              <li>Asegúrese de que todos los códigos sean únicos</li>
              {configType === 'locations' && (
                <li>Verifique que los códigos de bodega existan en el sistema</li>
              )}
              <li>Guarde el archivo y súbalo usando el botón "Subir Archivo"</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownloadTemplate}
              disabled={isDownloading || isUploading}
              variant="outline"
              className="flex items-center gap-2 flex-1"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? 'Descargando...' : 'Descargar Plantilla'}
            </Button>

            <Button
              onClick={handleUploadClick}
              disabled={isDownloading || isUploading}
              className="flex items-center gap-2 flex-1"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? 'Importando...' : 'Subir Archivo'}
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Procesando archivo, por favor espere...
                </span>
              </div>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Resultado de la Importación</h3>
                <div className="flex gap-2">
                  {importResult.imported_count > 0 && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {importResult.imported_count} Exitosos
                    </Badge>
                  )}
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
                        Se importaron {importResult.imported_count} registros exitosamente
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.imported_items.slice(0, 10).map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            <span>
                              <strong>{item.cod}</strong> - {item.name}
                            </span>
                          </div>
                        ))}
                        {importResult.imported_items.length > 10 && (
                          <p className="text-sm text-green-600 italic">
                            ... y {importResult.imported_items.length - 10} más
                          </p>
                        )}
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
                          <div key={index} className="flex items-start gap-2 text-sm text-red-700">
                            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => {
                    if (importResult.imported_count > 0) {
                      onSuccess();
                    } else {
                      onClose();
                    }
                  }}
                  variant="outline"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* Important Notes */}
          {!importResult && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-amber-800">Notas Importantes:</p>
                  <ul className="text-sm text-amber-700 space-y-1 ml-4">
                    <li className="list-disc">Los códigos deben ser únicos en el sistema</li>
                    <li className="list-disc">Tanto Código como Nombre son campos obligatorios</li>
                    {configType === 'locations' && (
                      <li className="list-disc">El Código de Bodega debe existir previamente</li>
                    )}
                    <li className="list-disc">Los registros duplicados serán rechazados</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}
