# Sistema de Diseño Centralizado

## 📋 Resumen

Este proyecto utiliza un sistema de diseño centralizado que permite cambiar fácilmente todos los colores, espaciados, tipografías y otros aspectos visuales de la aplicación desde un solo archivo.

## 🎨 Archivo Principal de Variables

**Ubicación:** `frontend/src/styles/theme.css`

Este archivo contiene todas las variables CSS que definen el diseño de la aplicación. Modificar este archivo afectará toda la aplicación automáticamente.

## 🔧 Cómo Cambiar el Tema de la Aplicación

### 1. Cambiar Colores Primarios
```css
/* En frontend/src/styles/theme.css */
:root {
  /* Cambia estos valores para modificar el color primario */
  --color-primary-500: #0ea5e9;  /* Color principal */
  --color-primary-600: #0284c7;  /* Color hover */
  --color-primary-700: #0369a1;  /* Color activo */
}
```

### 2. Cambiar Colores Secundarios
```css
:root {
  /* Cambia estos valores para modificar el color secundario */
  --color-secondary-500: #64748b;
  --color-secondary-600: #475569;
  --color-secondary-700: #334155;
}
```

### 3. Personalizar el Tema Oscuro
```css
.dark {
  /* Modifica estas variables para personalizar el tema oscuro */
  --background: var(--color-gray-950);
  --foreground: var(--color-gray-50);
  --primary: var(--color-primary-500);
}
```

## 🎯 Variables Disponibles

### Colores por Categoría

#### 🎨 Colores Primarios
- `--color-primary-50` a `--color-primary-950`: Escala completa del color primario
- `--primary`: Color primario principal
- `--primary-hover`: Color primario al hacer hover
- `--primary-foreground`: Color del texto sobre el primario

#### 🎨 Colores Secundarios
- `--color-secondary-50` a `--color-secondary-950`: Escala completa del color secundario
- `--secondary`: Color secundario principal
- `--secondary-hover`: Color secundario al hacer hover
- `--secondary-foreground`: Color del texto sobre el secundario

#### 🎨 Colores de Estado
- **Éxito:** `--color-success-*` (verde)
- **Advertencia:** `--color-warning-*` (amarillo)
- **Error:** `--color-error-*` (rojo)
- **Información:** `--color-info-*` (azul)

#### 🎨 Colores Neutros
- `--color-gray-50` a `--color-gray-950`: Escala completa de grises

### Espaciado
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px
- `--spacing-2xl`: 48px
- `--spacing-3xl`: 64px

### Bordes Redondeados
- `--radius-sm`: 2px
- `--radius`: 6px (por defecto)
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-xl`: 16px
- `--radius-2xl`: 24px
- `--radius-3xl`: 32px
- `--radius-full`: 9999px (círculo completo)

### Sombras
- `--shadow-sm`: Sombra pequeña
- `--shadow`: Sombra normal
- `--shadow-md`: Sombra mediana
- `--shadow-lg`: Sombra grande
- `--shadow-xl`: Sombra extra grande
- `--shadow-2xl`: Sombra muy grande

### Tipografía
- `--font-size-xs` a `--font-size-6xl`: Tamaños de fuente
- `--font-weight-light` a `--font-weight-extrabold`: Pesos de fuente
- `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`: Altura de línea

### Transiciones
- `--transition-fast`: 150ms
- `--transition-normal`: 300ms
- `--transition-slow`: 500ms

## 🚀 Uso en Componentes

### Con Tailwind CSS
```jsx
// Usar clases de Tailwind que referencian las variables
<button className="bg-primary text-primary-foreground hover:bg-primary-hover">
  Botón Primario
</button>

<div className="bg-card border border-card-border rounded-lg shadow-md p-lg">
  Tarjeta con estilo
</div>
```

### Con CSS Directo
```css
.mi-componente {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow);
  transition: all var(--transition-normal);
}

.mi-componente:hover {
  background-color: var(--primary-hover);
}
```

### Clases CSS Personalizadas Disponibles
```css
/* Estas clases están definidas en index.css */
.btn-primary       /* Botón estilo primario */
.btn-secondary     /* Botón estilo secundario */
.card             /* Tarjeta con estilo */
.input            /* Input con estilo */
```

## 🎨 Ejemplos de Personalización

### Tema Azul Corporate
```css
:root {
  --color-primary-500: #1e40af;
  --color-primary-600: #1d4ed8;
  --color-primary-700: #1e3a8a;
}
```

### Tema Verde Eco
```css
:root {
  --color-primary-500: #10b981;
  --color-primary-600: #059669;
  --color-primary-700: #047857;
}
```

### Tema Púrpura Moderno
```css
:root {
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
}
```

### Espaciado Compacto
```css
:root {
  --spacing-xs: 2px;
  --spacing-sm: 4px;
  --spacing-md: 8px;
  --spacing-lg: 12px;
  --spacing-xl: 16px;
}
```

### Bordes Más Redondeados
```css
:root {
  --radius: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

## 📱 Modo Oscuro

El modo oscuro se activa automáticamente añadiendo la clase `dark` al elemento `html` o `body`. Todas las variables se redefinen automáticamente para el tema oscuro.

```javascript
// Para cambiar al modo oscuro
document.documentElement.classList.add('dark');

// Para cambiar al modo claro
document.documentElement.classList.remove('dark');
```

## 🔄 Aplicar Cambios

1. **Edita** `frontend/src/styles/theme.css`
2. **Guarda** el archivo
3. **Los cambios se aplicarán automáticamente** en toda la aplicación
4. **No necesitas reiniciar** el servidor de desarrollo

## 🎯 Consejos para el Mantenimiento

1. **Mantén la consistencia**: Usa siempre las variables en lugar de valores hardcodeados
2. **Documenta cambios importantes**: Si cambias el esquema de colores, documenta el motivo
3. **Prueba en ambos temas**: Siempre verifica que tus cambios funcionen en modo claro y oscuro
4. **Usa escalas de color**: Mantén las escalas de 50-950 para máxima flexibilidad
5. **Considera la accesibilidad**: Asegúrate de que los contrastes sean suficientes

## 🛠️ Archivos del Sistema

- `frontend/src/styles/theme.css` - Variables CSS principales
- `frontend/src/index.css` - Estilos base y componentes
- `frontend/tailwind.config.js` - Configuración de Tailwind CSS
- `DESIGN_SYSTEM.md` - Esta documentación

¡Con este sistema puedes cambiar completamente el aspecto de tu aplicación modificando solo unas pocas variables!