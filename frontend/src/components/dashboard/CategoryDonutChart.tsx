import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Package2, PieChart } from 'lucide-react';
import type { Sample } from '../../types';
import { chartColors } from '../../utils/colors';

interface CategoryDonutChartProps {
  samples: Sample[];
}

const COLORS = chartColors;

export function CategoryDonutChart({ samples }: CategoryDonutChartProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique countries for filter
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    samples.forEach(sample => {
      if (sample.cantidad > 0) {
        countrySet.add(sample.pais?.name || 'Sin País');
      }
    });
    return Array.from(countrySet).sort();
  }, [samples]);

  // Process data based on selected country
  const chartData = useMemo(() => {
    // Filter samples with stock and by country if selected
    let filteredSamples = samples.filter(sample => sample.cantidad > 0);

    if (selectedCountry !== "all") {
      filteredSamples = filteredSamples.filter(sample =>
        (sample.pais?.name || 'Sin País') === selectedCountry
      );
    }

    // Group by category
    const categoryCount: Record<string, { count: number; samples: Sample[] }> = {};
    filteredSamples.forEach(sample => {
      const categoryName = sample.categoria?.name || 'Sin Categoría';
      if (!categoryCount[categoryName]) {
        categoryCount[categoryName] = { count: 0, samples: [] };
      }
      categoryCount[categoryName].count += Number(sample.cantidad);
      categoryCount[categoryName].samples.push(sample);
    });

    const totalCount = Object.values(categoryCount).reduce((sum, data) => sum + data.count, 0);

    if (totalCount === 0) return [];

    // Create chart data with colors
    return Object.entries(categoryCount)
      .map(([name, data], index) => ({
        name,
        count: data.count,
        samples: data.samples,
        percentage: Math.round((data.count / totalCount) * 100),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [samples, selectedCountry]);

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Muestras por Categoría</h3>
        <div className="mb-4">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los países</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <PieChart className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-gray-500">No hay datos para mostrar</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Muestras por Categoría</h3>

      {/* Country Filter */}
      <div className="mb-6">
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los países</option>
          {countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-6">
        {/* Enhanced Bar Chart */}
        <div className="space-y-4">
          {chartData.slice(0, 6).map((item) => {
            const maxWidth = Math.max(...chartData.map(d => d.percentage));
            const width = (item.percentage / maxWidth) * 100;
            const isHovered = hoveredSegment === item.name;

            return (
              <div
                key={item.name}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredSegment(item.name)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
                style={{ opacity: hoveredSegment === null || isHovered ? 1 : 0.7 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-600">
                      {item.percentage}%
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(item.count).toLocaleString()}
                    </Badge>
                  </div>
                </div>
                <div
                  className="h-6 bg-gray-100 rounded-full overflow-hidden relative"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      backgroundColor: item.color,
                      width: `${width}%`,
                      transform: isHovered ? "scaleY(1.1)" : "scaleY(1)"
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {item.samples.length} muestras • {Math.round(item.count).toLocaleString()} unidades
                </p>
              </div>
            );
          })}

          {chartData.length > 6 && (
            <p className="text-xs text-gray-500 text-center pt-2">
              +{chartData.length - 6} categorías más
            </p>
          )}
        </div>

        {/* Sample Details for Selected Category */}
        {selectedCategory && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-semibold text-green-900">
                Muestras de {selectedCategory}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                Cerrar
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chartData
                  .find(d => d.name === selectedCategory)?.samples
                  .map((sample, index) => (
                    <div key={index} className="bg-white p-3 border border-green-200 rounded text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Package2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">{sample.cod}</span>
                      </div>
                      <p className="text-gray-600 mb-1">
                        <strong>Material:</strong> {sample.material || 'N/A'}
                      </p>
                      <p className="text-gray-600 mb-1">
                        <strong>Lote:</strong> {sample.lote || 'N/A'}
                      </p>
                      <p className="text-gray-600 mb-1">
                        <strong>País:</strong> {sample.pais?.name || 'Sin país'}
                      </p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {Math.round(Number(sample.cantidad))} unidades
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-800 h-6 px-2"
                          onClick={() => {
                            console.log('Ver detalle de muestra:', sample.cod);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 p-3 bg-slate-50 rounded-md">
        <div className="flex justify-between items-center flex-wrap gap-2 text-sm">
          <span className="text-gray-600">
            <strong>Categorías:</strong> {chartData.length}
          </span>
          <span className="text-gray-600">
            <strong>País:</strong> {selectedCountry === "all" ? "Todos" : selectedCountry}
          </span>
          {chartData[0] && (
            <span className="text-gray-600">
              <strong>Principal:</strong> {chartData[0].name} ({chartData[0].percentage}%)
            </span>
          )}
        </div>
        <p className="text-xs text-green-600 mt-2 text-center">
          Haz clic en una categoría para ver sus muestras detalladas
        </p>
      </div>
    </Card>
  );
}