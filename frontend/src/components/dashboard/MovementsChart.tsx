import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarIcon, TrendingUpIcon, TrendingDownIcon, ActivityIcon } from 'lucide-react';
import api from '../../lib/api';
import type { Country, Category } from '../../types';

interface DailyMovement {
  fecha: string;
  entradas: number;
  salidas: number;
}

interface MovementsAnalytics {
  daily_movements: DailyMovement[];
  total_entries: number;
  total_exits: number;
  total_days: number;
}

interface Filters {
  fecha_desde: string;
  fecha_hasta: string;
  pais_id: string;
  categoria_id: string;
}

interface MovementsChartProps {}


export function MovementsChart({}: MovementsChartProps) {
  const [data, setData] = useState<MovementsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({
    fecha_desde: '',
    fecha_hasta: '',
    pais_id: 'all',
    categoria_id: 'all'
  });

  // Load countries and categories on mount
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [countriesRes, categoriesRes] = await Promise.all([
          api.get('/countries'),
          api.get('/categories')
        ]);
        setCountries(countriesRes.data?.data || []);
        setCategories(categoriesRes.data?.data || []);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };

    loadFilterData();
  }, []);

  // Load movements analytics from API
  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();

        if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
        if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
        if (filters.pais_id && filters.pais_id !== 'all') params.append('pais_id', filters.pais_id);
        if (filters.categoria_id && filters.categoria_id !== 'all') params.append('categoria_id', filters.categoria_id);

        const response = await api.get(`/dashboard/movements-analytics?${params.toString()}`);
        setData(response.data);
      } catch (error) {
        console.error('Error loading movements analytics:', error);
        // Set empty data on error
        setData({
          daily_movements: [],
          total_entries: 0,
          total_exits: 0,
          total_days: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [filters]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      fecha_desde: '',
      fecha_hasta: '',
      pais_id: 'all',
      categoria_id: 'all'
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Entradas vs Salidas por Fecha</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Cargando gráfico...</p>
        </div>
      </Card>
    );
  }

  // Find max value for scaling
  const maxValue = data ? Math.max(...data.daily_movements.map(d => Math.max(d.entradas, d.salidas))) : 0;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ActivityIcon className="w-5 h-5 text-purple-500" />
        Entradas vs Salidas por Fecha
      </h3>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde:</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.fecha_desde}
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta:</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.fecha_hasta}
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País:</label>
            <Select value={filters.pais_id} onValueChange={(value) => handleFilterChange('pais_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los países" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los países</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría:</label>
            <Select value={filters.categoria_id} onValueChange={(value) => handleFilterChange('categoria_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => {/* Filters are applied automatically */}} className="bg-blue-600 hover:bg-blue-700">
              Filtrar
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Total Entradas</span>
            </div>
            <span className="text-2xl font-bold text-green-700">{data.total_entries}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDownIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">Total Salidas</span>
            </div>
            <span className="text-2xl font-bold text-red-700">{data.total_exits}</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Días con Actividad</span>
            </div>
            <span className="text-2xl font-bold text-blue-700">{data.total_days}</span>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {data && data.daily_movements.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">Movimientos Diarios</span>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <span className="text-gray-600">Entradas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span className="text-gray-600">Salidas</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-[300px] p-4">
              {data.daily_movements.map((day, index) => (
                <div key={index} className="flex-1 min-w-[40px] relative h-full flex flex-col justify-end">
                  {/* Bars container */}
                  <div className="flex gap-1 h-[250px] items-end">
                    {/* Entry bar */}
                    <div
                      className="bg-green-500 w-[18px] rounded-t-sm transition-all duration-300 hover:bg-green-600 cursor-pointer"
                      style={{
                        height: `${maxValue > 0 ? (day.entradas / maxValue) * 100 : 0}%`
                      }}
                      title={`Entradas: ${day.entradas}`}
                    />
                    {/* Exit bar */}
                    <div
                      className="bg-red-500 w-[18px] rounded-t-sm transition-all duration-300 hover:bg-red-600 cursor-pointer"
                      style={{
                        height: `${maxValue > 0 ? (day.salidas / maxValue) * 100 : 0}%`
                      }}
                      title={`Salidas: ${day.salidas}`}
                    />
                  </div>

                  {/* Date label */}
                  <span
                    className="text-xs text-gray-500 mt-2 whitespace-nowrap transform -rotate-45 origin-left absolute bottom-[-20px] left-[5px]"
                  >
                    {new Date(day.fecha).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Values display */}
          <div className="mt-8 max-h-[200px] overflow-y-auto">
            <p className="text-sm font-medium mb-2">Detalle por Día:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {data.daily_movements.map((day, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md text-sm">
                  <p className="font-medium text-gray-900 mb-1">
                    {new Date(day.fecha).toLocaleDateString('es-ES')}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      ↑ {day.entradas}
                    </Badge>
                    <span className="text-green-600 text-xs">Entradas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                      ↓ {day.salidas}
                    </Badge>
                    <span className="text-red-600 text-xs">Salidas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ActivityIcon className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-lg text-gray-500 mb-2">
            No hay datos de movimientos para mostrar
          </p>
          <p className="text-sm text-gray-400">
            Ajusta los filtros para ver información de movimientos
          </p>
        </div>
      )}
    </Card>
  );
}