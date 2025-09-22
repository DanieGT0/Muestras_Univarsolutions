import { useState } from 'react';
import { Settings, Globe, FolderTree, Building, Warehouse, MapPin, Users } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CountriesManagement } from './CountriesManagement';
import { CategoriesManagement } from './CategoriesManagement';
import { SuppliersManagement } from './SuppliersManagement';
import { WarehousesManagement } from './WarehousesManagement';
import { LocationsManagement } from './LocationsManagement';
import { ResponsiblesManagement } from './ResponsiblesManagement';

interface TabConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  description: string;
}

const tabsConfig: TabConfig[] = [
  {
    id: 'countries',
    title: 'Países',
    icon: Globe,
    component: CountriesManagement,
    description: 'Gestionar países del sistema'
  },
  {
    id: 'categories',
    title: 'Categorías',
    icon: FolderTree,
    component: CategoriesManagement,
    description: 'Categorías de muestras'
  },
  {
    id: 'suppliers',
    title: 'Proveedores',
    icon: Building,
    component: SuppliersManagement,
    description: 'Proveedores de materiales'
  },
  {
    id: 'warehouses',
    title: 'Bodegas',
    icon: Warehouse,
    component: WarehousesManagement,
    description: 'Bodegas de almacenamiento'
  },
  {
    id: 'locations',
    title: 'Ubicaciones',
    icon: MapPin,
    component: LocationsManagement,
    description: 'Ubicaciones dentro de bodegas'
  },
  {
    id: 'responsibles',
    title: 'Responsables',
    icon: Users,
    component: ResponsiblesManagement,
    description: 'Responsables de muestras'
  },
];

export function ConfigurationsManagement() {
  const [activeTab, setActiveTab] = useState<string>('countries');

  const currentTab = tabsConfig.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuraciones del Sistema</h1>
          <p className="text-gray-600 mt-1">Gestiona todos los datos maestros del sistema</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tabsConfig.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Card
              key={tab.id}
              className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 ${
                activeTab === tab.id
                  ? 'ring-2 ring-slate-500 bg-slate-50 border-slate-200 border-l-slate-700'
                  : 'hover:bg-gray-50 border-l-gray-200'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-slate-700' : 'bg-gray-100'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{tab.title}</h3>
                    {activeTab === tab.id && (
                      <Badge variant="default" className="bg-slate-700 text-white">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs Navigation */}
      <Card className="p-1">
        <div className="flex flex-wrap gap-1">
          {tabsConfig.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-slate-700 text-white hover:bg-slate-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.title}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Current Tab Content */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              {currentTab?.icon && <currentTab.icon className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Gestión de {currentTab?.title}
            </h2>
          </div>
          <p className="text-gray-600">{currentTab?.description}</p>
        </div>

        <div className="border-t pt-6">
          {CurrentComponent && <CurrentComponent />}
        </div>
      </Card>
    </div>
  );
}