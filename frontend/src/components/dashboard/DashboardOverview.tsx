import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  BarChart3,
  Package,
  TrendingUp,
  Package2,
  Filter
} from 'lucide-react';
import api from '../../lib/api';
import { CountryStockChart } from './CountryStockChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { MovementsChart } from './MovementsChart';
import { SamplesWithStockTable } from './SamplesWithStockTable';
import type { Sample } from '../../types';

interface DashboardStats {
  totalMuestras: number;
  totalUnidades: number;
  totalPeso: number;
}

type TabType = 'dashboard' | 'samples';

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
    const totalMuestras = filteredSamples.length;
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
      const samplesResponse = await api.get('/samples?limit=1000');
      const samplesData = samplesResponse.data?.data || [];
      setSamples(samplesData);

      // Calculate stats from samples data
      const totalMuestras = samplesData.length;
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
      value: (stats.totalPeso || 0).toFixed(2),
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
    <div className="space-y-6">
      {/* Header with Tab Navigation */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-blue-700 bg-clip-text text-transparent">Panel de Control</h1>
            <p className="text-gray-600 mt-1 font-medium">Resumen ejecutivo del sistema</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 font-semibold ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'samples' ? 'default' : 'outline'}
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-2 font-semibold ${
              activeTab === 'samples'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Package2 className="w-4 h-4" />
            Muestras
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Filtros */}
          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-slate-200/50 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-slate-800">Filtros:</span>
              </div>

              {/* Filtro de País */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">País:</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="border-2 border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                >
                  <option value="all">Todos los países</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Categoría */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Categoría:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border-2 border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Botón para limpiar filtros */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCountry("all");
                  setSelectedCategory("all");
                }}
                className="text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-slate-200/50 hover:border-blue-400/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-extrabold text-gray-900">
                          {stat.value.toLocaleString()} <span className="text-lg text-gray-600 font-semibold">{stat.suffix}</span>
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${stat.iconBg} shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>



          {/* Analytics Charts */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-blue-700 bg-clip-text text-transparent">Análisis y Reportes</h2>
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
    </div>
  );
}