import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Settings, CheckCircle, BarChart3, Upload } from 'lucide-react';
import { ConfigImportModal } from './ConfigImportModal';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../ui/table';
import { toast } from '../../hooks/use-toast';

export interface BaseEntity {
  id: number;
  cod: string;
  name: string;
  countries?: Array<{ id: number; cod: string; name: string; }>;
}

interface EntityField {
  key: string;
  label: string;
  placeholder: string;
  maxLength?: number;
  required?: boolean;
}

interface BaseEntityManagementProps {
  entityName: string;
  entityNamePlural: string;
  configType: string;
  fields: EntityField[];
  loadItems: () => Promise<BaseEntity[]>;
  createItem: (data: Omit<BaseEntity, 'id'>) => Promise<BaseEntity>;
  updateItem: (id: number, data: Omit<BaseEntity, 'id'>) => Promise<BaseEntity>;
  deleteItem: (id: number) => Promise<void>;
}

export function BaseEntityManagement({
  entityName,
  entityNamePlural,
  configType,
  fields,
  loadItems,
  createItem,
  updateItem,
  deleteItem
}: BaseEntityManagementProps) {
  const [items, setItems] = useState<BaseEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BaseEntity | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Initialize form data with empty values
    const initialData: Record<string, string> = {};
    fields.forEach(field => {
      initialData[field.key] = '';
    });
    setFormData(initialData);
  }, [fields]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await loadItems();
      setItems(data);
    } catch (error) {
      console.error(`Error loading ${entityNamePlural}:`, error);
      toast({
        title: 'Error',
        description: `No se pudieron cargar ${entityNamePlural.toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.key]?.trim()) {
        toast({
          title: 'Error de Validación',
          description: `${field.label} es requerido`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const submitData = {
        cod: formData.cod.toUpperCase(),
        name: formData.name,
        ...formData
      };

      if (editingItem) {
        const updatedItem = await updateItem(editingItem.id, submitData);
        setItems(items.map(item => item.id === editingItem.id ? updatedItem : item));
        toast({
          title: 'Éxito',
          description: `${entityName} actualizado correctamente`,
        });
      } else {
        const newItem = await createItem(submitData);
        setItems([...items, newItem]);
        toast({
          title: 'Éxito',
          description: `${entityName} creado correctamente`,
        });
      }

      resetForm();
    } catch (error) {
      console.error(`Error saving ${entityName}:`, error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el ${entityName.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: BaseEntity) => {
    setEditingItem(item);
    const newFormData: Record<string, string> = {};
    fields.forEach(field => {
      newFormData[field.key] = (item as any)[field.key] || '';
    });
    setFormData(newFormData);
    setShowForm(true);

    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (item: BaseEntity) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar ${item.name}?`)) {
      return;
    }

    try {
      await deleteItem(item.id);
      setItems(items.filter(i => i.id !== item.id));
      toast({
        title: 'Éxito',
        description: `${entityName} eliminado correctamente`,
      });
    } catch (error) {
      console.error(`Error deleting ${entityName}:`, error);
      toast({
        title: 'Error',
        description: `No se pudo eliminar el ${entityName.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    const resetData: Record<string, string> = {};
    fields.forEach(field => {
      resetData[field.key] = '';
    });
    setFormData(resetData);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Get last created code
  const lastCreatedCode = items.length > 0 ? items[items.length - 1].cod : 'N/A';

  // Pagination calculations
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cargando {entityNamePlural.toLowerCase()}...</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-slate-200 hover:shadow-lg transition-all duration-200 border-l-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-slate-700">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-700">{items.length}</p>
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
              <p className="text-2xl font-bold text-slate-700">{items.length}</p>
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
              <p className="text-2xl font-bold text-slate-700">{items.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Lista de {entityNamePlural}
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
            Agregar {entityName}
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card ref={formRef} className="p-6 border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {editingItem ? `Editar ${entityName}` : `Nuevo ${entityName}`}
              </h4>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>

            {/* Show last created code when creating */}
            {!editingItem && items.length > 0 && (
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
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label} {field.required && '*'}
                  </Label>
                  <Input
                    id={field.key}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    required={field.required}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="bg-slate-700 hover:bg-slate-800 text-white"
              >
                {editingItem ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay {entityNamePlural.toLowerCase()} registrados
          </h3>
          <p className="text-gray-500 mb-4">
            Comienza agregando tu primer {entityName.toLowerCase()}.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar {entityName}
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-gray-500">
                    {item.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-slate-50 text-slate-700 border-slate-200">
                      {item.cod}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
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
                {startIndex + 1}-{Math.min(endIndex, items.length)} de {items.length}
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
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ConfigImportModal
          configType={configType}
          title={entityNamePlural}
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