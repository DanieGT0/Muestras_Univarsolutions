// Utilidades de colores para usar la paleta personalizada
// #F47415 (naranja), #F9AB4E (naranja claro), #53575A (gris oscuro), #FFFFFF (blanco)

// Paleta de colores para gráficos
export const chartColors = [
  '#F47415', // Primario - naranja
  '#F9AB4E', // Secundario - naranja claro
  '#53575A', // Gris oscuro
  '#ea580c', // Naranja más oscuro
  '#d97706', // Naranja dorado oscuro
  '#c2410c', // Naranja muy oscuro
  '#9a3412', // Marrón naranja
  '#92400e', // Marrón dorado
  '#78350f', // Marrón muy oscuro
  '#451a03'  // Marrón casi negro
];

// Colores específicos para diferentes tipos de datos
export const statusColors = {
  primary: '#F47415',
  secondary: '#F9AB4E',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#F47415', // Usar primario en lugar de azul
  neutral: '#53575A'
};

// Clases CSS para reemplazar los azules
export const cssClasses = {
  // Backgrounds
  'bg-blue-50': 'bg-primary-50',
  'bg-blue-100': 'bg-primary-100',
  'bg-blue-500': 'bg-primary-500',
  'bg-blue-600': 'bg-primary-600',
  'bg-blue-700': 'bg-primary-700',

  // Text colors
  'text-blue-600': 'text-primary-600',
  'text-blue-700': 'text-primary-700',
  'text-blue-800': 'text-primary-800',
  'text-blue-900': 'text-primary-900',

  // Borders
  'border-blue-200': 'border-primary-200',
  'border-blue-300': 'border-primary-300',

  // Hover states
  'hover:bg-blue-700': 'hover:bg-primary-700',
  'hover:bg-blue-100': 'hover:bg-primary-100',
  'hover:text-blue-800': 'hover:text-primary-800',
  'hover:text-blue-900': 'hover:text-primary-900'
};

// Función para obtener clase CSS actualizada
export const getUpdatedClass = (originalClass: string): string => {
  return cssClasses[originalClass as keyof typeof cssClasses] || originalClass;
};

// Función para obtener color por índice (para gráficos)
export const getChartColor = (index: number): string => {
  return chartColors[index % chartColors.length];
};