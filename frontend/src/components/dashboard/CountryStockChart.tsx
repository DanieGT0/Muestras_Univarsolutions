import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Package2, BarChart3 } from 'lucide-react';
import type { Sample } from '../../types';
import { chartColors } from '../../utils/colors';

interface CountryStockData {
  country: string;
  totalStock: number;
  samples: Sample[];
  categories: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

interface CountryStockChartProps {
  samples: Sample[];
}

const COLORS = chartColors;

export function CountryStockChart({ samples }: CountryStockChartProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<CountryStockData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Process data: group by country and calculate categories
  const chartData = useMemo(() => {
    const countryData: Record<string, CountryStockData> = {};

    // Filter samples with stock only
    const samplesWithStock = samples.filter(sample => sample.cantidad > 0);

    samplesWithStock.forEach(sample => {
      const countryName = sample.pais?.name || 'Sin País';

      if (!countryData[countryName]) {
        countryData[countryName] = {
          country: countryName,
          totalStock: 0,
          samples: [],
          categories: []
        };
      }

      countryData[countryName].totalStock += sample.cantidad;
      countryData[countryName].samples.push(sample);
    });

    // Calculate categories for each country
    Object.keys(countryData).forEach(countryName => {
      const countryCategories: Record<string, number> = {};

      samplesWithStock
        .filter(sample => (sample.pais?.name || 'Sin País') === countryName)
        .forEach(sample => {
          const categoryName = sample.categoria?.name || 'Sin Categoría';
          countryCategories[categoryName] = (countryCategories[categoryName] || 0) + sample.cantidad;
        });

      const totalCountryStock = countryData[countryName].totalStock;
      countryData[countryName].categories = Object.entries(countryCategories)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalCountryStock) * 100)
        }))
        .sort((a, b) => b.count - a.count);
    });

    return Object.values(countryData).sort((a, b) => b.totalStock - a.totalStock);
  }, [samples]);

  const maxStock = Math.max(...chartData.map(d => d.totalStock), 1);
  const shouldScroll = chartData.length > 6;

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existencias por País</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-gray-500">No hay datos de stock por país para mostrar</p>
        </div>
      </Card>
    );
  }

  const handleMouseEnter = (data: CountryStockData, event: React.MouseEvent) => {
    setHoveredCountry(data.country);
    setTooltipData(data);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
    setTooltipData(null);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Existencias por País</h3>

      <div
        className={`${shouldScroll ? 'overflow-x-auto' : ''} pb-2`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 #F1F5F9'
        }}
      >
        <div
          className="flex items-end gap-4 p-4 h-80"
          style={{ minWidth: shouldScroll ? `${chartData.length * 120}px` : '100%' }}
        >
          {chartData.map((data, index) => {
            const barHeight = (data.totalStock / maxStock) * 250;
            const colorIndex = index % COLORS.length;
            const isHovered = hoveredCountry === data.country;

            return (
              <div
                key={data.country}
                className="min-w-[80px] text-center cursor-pointer transition-all duration-300"
                style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
                onMouseEnter={(e) => handleMouseEnter(data, e)}
                onMouseLeave={handleMouseLeave}
                onClick={() => setSelectedCountry(selectedCountry === data.country ? null : data.country)}
              >
                {/* Bar */}
                <div
                  className="w-[60px] mx-auto mb-2 rounded-md relative transition-all duration-300"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: COLORS[colorIndex],
                    opacity: hoveredCountry === data.country || hoveredCountry === null ? 1 : 0.7,
                    filter: isHovered ? 'brightness(1.1)' : 'none'
                  }}
                >
                  {/* Value on top of bar */}
                  <span
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-600 whitespace-nowrap"
                  >
                    {data.totalStock.toLocaleString()}
                  </span>
                </div>

                {/* Country label */}
                <p className="text-xs font-medium text-gray-700 truncate max-w-20" title={data.country}>
                  {data.country}
                </p>

                {/* Number of categories */}
                <p className="text-xs text-gray-500 mt-1">
                  {data.categories.length} cat.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Tooltip */}
      {tooltipData && (
        <div
          className="fixed bg-gray-800 text-white p-3 rounded-md text-sm z-50 max-w-xs pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-800"></div>

          <p className="font-bold">{tooltipData.country}</p>
          <p>Total: {tooltipData.totalStock.toLocaleString()} unidades</p>
          <p className="text-sm mt-1 font-bold">Distribución por categorías:</p>
          {tooltipData.categories.map((cat, catIndex) => (
            <p key={catIndex} className="text-sm">
              • {cat.name}: {cat.count.toLocaleString()} ({cat.percentage}%)
            </p>
          ))}
        </div>
      )}

      {/* Sample Details for Selected Country */}
      {selectedCountry && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold text-blue-900">
              Muestras de {selectedCountry}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCountry(null)}
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              Cerrar
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {chartData
                .find(d => d.country === selectedCountry)?.samples
                .map((sample, index) => (
                  <div key={index} className="bg-white p-3 border border-blue-200 rounded text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Package2 className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">{sample.cod}</span>
                    </div>
                    <p className="text-gray-600 mb-1">
                      <strong>Material:</strong> {sample.material || 'N/A'}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <strong>Lote:</strong> {sample.lote || 'N/A'}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <strong>Categoría:</strong> {sample.categoria?.name || 'Sin categoría'}
                    </p>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {sample.cantidad} unidades
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 h-6 px-2"
                        onClick={() => {
                          // Here you could open a sample detail modal or navigate
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

      {/* Legend and summary */}
      <div className="mt-4 p-3 bg-slate-50 rounded-md">
        <div className="flex justify-between items-center flex-wrap gap-2 text-sm">
          <span className="text-gray-600">
            <strong>Total países:</strong> {chartData.length}
          </span>
          <span className="text-gray-600">
            <strong>Stock total:</strong> {chartData.reduce((sum, d) => sum + d.totalStock, 0).toLocaleString()} unidades
          </span>
          {chartData[0] && (
            <span className="text-gray-600">
              <strong>País líder:</strong> {chartData[0].country} ({chartData[0].totalStock.toLocaleString()})
            </span>
          )}
        </div>
        {shouldScroll && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Desliza horizontalmente para ver todos los países
          </p>
        )}
        <p className="text-xs text-blue-600 mt-2 text-center">
          Haz clic en un país para ver sus muestras detalladas
        </p>
      </div>
    </Card>
  );
}