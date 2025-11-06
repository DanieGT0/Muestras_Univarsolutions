import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  BarChart3,
  Package,
  TrendingUp,
  Package2,
  Filter,
  ArrowDown
} from 'lucide-react';
import api from '../../lib/api';
import { CountryStockChart } from './CountryStockChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { MovementsChart } from './MovementsChart';
import { SamplesWithStockTable } from './SamplesWithStockTable';
import { OutputMovementsTable } from './OutputMovementsTable';
import type { Sample } from '../../types';

interface DashboardStats {
  totalMuestras: number;
  totalUnidades: number;
  totalPeso: number;
}

type TabType = 'dashboard' | 'samples' | 'outputs';

export function DashboardOverview() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalMuestras: 0,
    totalUnidades: 0,
    totalPeso: 0
  });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Efecto para recalcular estadísticas cuando cambian los filtros
  useEffect(() => {
    if (samples.length > 0) {
      calculateFilteredStats();
    }
  }, [selectedCountry, selectedCategory, samples]);

  const calculateFilteredStats = () => {
    let filteredSamples = samples;

    // Filtrar por país
    if (selectedCountry !== "all") {
      filteredSamples = filteredSamples.filter(sample =>
        sample.pais?.name === selectedCountry
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== "all") {
      filteredSamples = filteredSamples.filter(sample =>
        sample.categoria?.name === selectedCategory
      );
    }

    // Calcular estadísticas filtradas
    // Contar códigos únicos de muestras
    const uniqueCodes = new Set(filteredSamples.map(sample => sample.cod).filter(Boolean));
    const totalMuestras = uniqueCodes.size;
    const totalUnidades = filteredSamples.reduce((sum: number, sample: Sample) =>
      sum + (Number(sample.cantidad) || 0), 0
    );
    const totalPeso = filteredSamples.reduce((sum: number, sample: Sample) =>
      sum + (Number(sample.peso_total) || 0), 0
    );

    setStats({
      totalMuestras,
      totalUnidades,
      totalPeso
    });
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // No data available when not authenticated
        setStats({
          totalMuestras: 0,
          totalUnidades: 0,
          totalPeso: 0
        });
        setSamples([]);
        return;
      }

      // Load samples
      const samplesResponse = await api.get('/samples?limit=5000');
      const samplesData = samplesResponse.data?.data || [];
      setSamples(samplesData);

      // Calculate stats from samples data
      // Contar códigos únicos de muestras
      const uniqueCodes = new Set(samplesData.map(sample => sample.cod).filter(Boolean));
      const totalMuestras = uniqueCodes.size;
      const totalUnidades = samplesData.reduce((sum: number, sample: Sample) => sum + (Number(sample.cantidad) || 0), 0);
      const totalPeso = samplesData.reduce((sum: number, sample: Sample) => sum + (Number(sample.peso_total) || 0), 0);

      setStats({
        totalMuestras,
        totalUnidades,
        totalPeso
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values if API fails
      setStats({
        totalMuestras: 0,
        totalUnidades: 0,
        totalPeso: 0
      });
      // Set empty data for charts
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener listas únicas para los filtros
  const countries = Array.from(new Set(samples.map(sample => sample.pais?.name).filter(Boolean)));
  const categories = Array.from(new Set(samples.map(sample => sample.categoria?.name).filter(Boolean)));

  const statCards = [
    {
      title: 'Total de Muestras',
      value: stats.totalMuestras,
      suffix: 'muestras',
      icon: Package2,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-primary-600'
    },
    {
      title: 'Total por Unidad',
      value: stats.totalUnidades,
      suffix: 'unidades',
      icon: Package,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-secondary-600'
    },
    {
      title: 'Total por Peso',
      value: stats.totalPeso || 0,
      suffix: 'kg',
      icon: TrendingUp,
      color: 'text-slate-700',
      bgColor: 'bg-white',
      borderColor: 'border-slate-200',
      iconBg: 'bg-primary-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-slate-700" />
          <h1 className="text-3xl font-bold text-gray-900">Dashboard del Sistema</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Tab Navigation */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Panel de Control</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen ejecutivo del sistema</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-2 ${
              activeTab === 'samples'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package2 className="w-4 h-4" />
            Muestras
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('outputs')}
            className={`flex items-center gap-2 ${
              activeTab === 'outputs'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            Salidas
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filtros:</span>

              {/* Filtro de País */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">País:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  <option value="all">Todos los países</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Categoría */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Categoría:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Botón para limpiar filtros */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCountry("all");
                  setSelectedCategory("all");
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-semibold text-gray-900">
                          {new Intl.NumberFormat('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(Number(stat.value))}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{stat.suffix}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-100">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>



          {/* Analytics Charts */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Análisis y Reportes</h2>
              <p className="text-sm text-gray-500 mt-1">Visualización de datos del sistema</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CountryStockChart samples={samples} />
              <CategoryDonutChart samples={samples} />
            </div>

            <div className="w-full">
              <MovementsChart />
            </div>
          </div>
        </>
      )}

      {/* Samples Tab Content */}
      {activeTab === 'samples' && (
        <SamplesWithStockTable samples={samples} loading={loading} />
      )}

      {/* Outputs Tab Content */}
      {activeTab === 'outputs' && (
        <OutputMovementsTable loading={loading} />
      )}
    </div>
  );
}