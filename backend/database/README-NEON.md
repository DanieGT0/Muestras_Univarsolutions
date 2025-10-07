# 🚀 Configuración de Neon PostgreSQL

Guía para migrar a Neon PostgreSQL y configurar la base de datos.

## 📋 Prerrequisitos

- Cuenta en [Neon](https://neon.tech)
- Cliente psql instalado
- Node.js y npm/yarn instalados

## 🔧 Pasos de Configuración

### 1. Conectar a Neon PostgreSQL

```bash
psql 'postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require&channel_binding=require'
```

### 2. Ejecutar Scripts en Orden

#### Script 1: Configuración de Tablas (setup-neon.sql)

```sql
\i setup-neon.sql
```

Este script:
- ✅ Crea extensiones necesarias (uuid-ossp)
- ✅ Crea tipos ENUM
- ✅ Limpia tablas existentes (DROP CASCADE)
- ✅ Crea todas las tablas del schema
- ✅ Crea índices para mejor rendimiento
- ✅ Configura triggers y funciones

#### Script 2: Datos Iniciales (seed.sql)

```sql
\i seed.sql
```

Este script:
- ✅ Inserta países
- ✅ Inserta categorías
- ✅ Inserta proveedores
- ✅ Inserta bodegas
- ✅ Inserta ubicaciones
- ✅ Inserta responsables
- ✅ Crea usuarios de prueba

#### Script 3: Relaciones Usuario-País (add_user_countries.sql)

```sql
\i add_user_countries.sql
```

Este script:
- ✅ Asigna países a usuarios comerciales

### 3. Verificar Instalación

```sql
-- Ver todas las tablas
\dt

-- Contar registros en cada tabla
SELECT 'countries' as table, COUNT(*) FROM countries
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'responsibles', COUNT(*) FROM responsibles
UNION ALL
SELECT 'users', COUNT(*) FROM users;
```

### 4. Configurar Backend

El archivo `.env` ya está configurado con la conexión a Neon:

```env
DATABASE_URL=postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require
```

### 5. Probar Conexión

```bash
cd backend
npm run dev
```

Si ves el mensaje de conexión exitosa, ¡todo está listo! ✅

## 👥 Usuarios de Prueba

Después de ejecutar `seed.sql`, tendrás estos usuarios:

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | password123 | ADMIN |
| user@test.com | password123 | USER |
| commercial@test.com | password123 | COMMERCIAL |

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Cambia las credenciales en producción:

1. Actualiza `JWT_SECRET` en `.env`
2. Cambia las contraseñas de los usuarios de prueba
3. No subas el archivo `.env` a GitHub (ya está en .gitignore)

## 🧹 Limpieza y Mantenimiento

### Limpiar Base de Datos

Para reiniciar completamente:

```sql
-- Ejecutar setup-neon.sql nuevamente
\i setup-neon.sql
\i seed.sql
\i add_user_countries.sql
```

### Backup

```bash
# Crear backup
pg_dump 'postgresql://...' > backup.sql

# Restaurar backup
psql 'postgresql://...' < backup.sql
```

## 📊 Estructura de la Base de Datos

```
users (UUID)
  ├── user_countries (relación M-M con countries)

countries (id)
categories (id)
suppliers (id)
warehouses (id)
locations (id)
responsibles (id)

samples (id)
  ├── movements (muestra_id FK)
  └── transfers (muestra_id FK)
```

## 🐛 Troubleshooting

### Error: "SSL connection required"
✅ Asegúrate de tener `?sslmode=require` en la URL

### Error: "permission denied for schema public"
✅ Ejecuta como owner: `neondb_owner`

### Error: "type already exists"
✅ Esto es normal, el script usa `DO $$ ... EXCEPTION` para manejar esto

### Error: "relation already exists"
✅ El script hace `DROP TABLE IF EXISTS` primero

## 📚 Recursos

- [Neon Docs](https://neon.tech/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [pg Node.js Driver](https://node-postgres.com/)

## ✅ Checklist de Migración

- [x] Crear cuenta en Neon
- [x] Crear proyecto y base de datos "Muestras"
- [x] Actualizar `.env` con DATABASE_URL
- [x] Actualizar `database.ts` con soporte SSL
- [x] Ejecutar setup-neon.sql
- [x] Ejecutar seed.sql
- [x] Ejecutar add_user_countries.sql
- [ ] Probar conexión del backend
- [ ] Probar login en frontend
- [ ] Verificar funcionalidades principales
- [ ] Hacer backup inicial
