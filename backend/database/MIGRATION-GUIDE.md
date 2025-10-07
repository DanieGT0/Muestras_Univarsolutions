# 🔄 Guía de Migración de Base de Datos

## 🚨 Problema Identificado

La base de datos de producción (Neon PostgreSQL) fue creada con un schema antiguo que no coincide con el código actual.

### Schema Antiguo (Producción actual)
- Tabla: `samples` ❌ (código espera `muestras`)
- Tabla: `movements` ❌ (código espera `movimientos`)
- Columna: `transfers.muestra_id` ❌ (código espera `muestra_origen_id`)

### Schema Nuevo (Código actual)
- Tabla: `muestras` ✅
- Tabla: `movimientos` ✅
- Columnas: `transfers.muestra_origen_id`, `muestra_destino_id` ✅

### Error en Producción
```
Error fetching transfers: error: column t.muestra_origen_id does not exist
```

## 📋 Opciones de Migración

### Opción 1: Migración de Datos (Recomendada si hay datos importantes)

**Pasos:**

1. **Hacer backup de la base de datos actual**
   ```bash
   pg_dump 'postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require' > backup_before_migration.sql
   ```

2. **Conectar a Neon PostgreSQL**
   ```bash
   psql 'postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require&channel_binding=require'
   ```

3. **Ejecutar script de migración**
   ```sql
   \i migrate-to-new-schema.sql
   ```

4. **Verificar migración**
   ```sql
   -- Ver tablas
   \dt

   -- Ver columnas de transfers
   \d transfers

   -- Ver columnas de muestras
   \d muestras

   -- Ver columnas de movimientos
   \d movimientos
   ```

5. **Probar el backend**
   ```bash
   cd backend
   npm run dev
   ```

### Opción 2: Recrear Base de Datos (Si no hay datos importantes)

**Pasos:**

1. **Hacer backup (por seguridad)**
   ```bash
   pg_dump 'postgresql://...' > backup_before_recreate.sql
   ```

2. **Conectar a Neon PostgreSQL**
   ```bash
   psql 'postgresql://...'
   ```

3. **Ejecutar scripts en orden**
   ```sql
   -- 1. Crear schema actualizado
   \i setup-neon.sql

   -- 2. Insertar datos iniciales
   \i seed.sql

   -- 3. Asignar países a usuarios
   \i add_user_countries.sql
   ```

4. **Verificar creación**
   ```sql
   -- Ver todas las tablas
   \dt

   -- Contar registros
   SELECT 'countries' as tabla, COUNT(*) as registros FROM countries
   UNION ALL
   SELECT 'users', COUNT(*) FROM users
   UNION ALL
   SELECT 'muestras', COUNT(*) FROM muestras
   UNION ALL
   SELECT 'transfers', COUNT(*) FROM transfers;
   ```

## 🔍 Verificación Post-Migración

### 1. Verificar Estructura de Tablas

```sql
-- Verificar tabla muestras
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'muestras'
ORDER BY ordinal_position;

-- Verificar tabla movimientos
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'movimientos'
ORDER BY ordinal_position;

-- Verificar tabla transfers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transfers'
ORDER BY ordinal_position;
```

### 2. Verificar Datos

```sql
-- Contar registros por tabla
SELECT
  (SELECT COUNT(*) FROM muestras) as total_muestras,
  (SELECT COUNT(*) FROM movimientos) as total_movimientos,
  (SELECT COUNT(*) FROM transfers) as total_transfers,
  (SELECT COUNT(*) FROM users) as total_users;
```

### 3. Probar Queries del Backend

```sql
-- Query que estaba fallando antes de la migración
SELECT
  t.*,
  s_origen.cod as origen_sample_cod,
  s_origen.material as origen_material
FROM transfers t
LEFT JOIN muestras s_origen ON t.muestra_origen_id = s_origen.id
LIMIT 5;
```

## ✅ Checklist de Migración

- [ ] Hacer backup de base de datos actual
- [ ] Ejecutar script de migración (Opción 1) o setup-neon.sql (Opción 2)
- [ ] Verificar estructura de tablas (`\d muestras`, `\d transfers`, `\d movimientos`)
- [ ] Verificar que las columnas correctas existen
- [ ] Probar backend local (`npm run dev`)
- [ ] Verificar módulo de Traslados en frontend
- [ ] Hacer commit y push a GitHub
- [ ] Verificar deployment en Render

## 🐛 Troubleshooting

### Error: "relation 'samples' does not exist"
✅ Buen signo - significa que la migración funcionó y ahora usa `muestras`

### Error: "column 'muestra_id' does not exist"
✅ Buen signo - significa que ahora usa `muestra_origen_id`

### Error: "type 'tipo_movimiento' already exists"
✅ Normal - el script usa `DO $$ ... EXCEPTION` para manejar esto

### Queries antiguas fallan después de migración
⚠️ Revisa que el código del backend use los nombres correctos:
- `muestras` (no `samples`)
- `movimientos` (no `movements`)
- `muestra_origen_id` (no `muestra_id`)

## 📚 Archivos Actualizados

### Nuevos Archivos
- ✅ `migrate-to-new-schema.sql` - Script de migración incremental
- ✅ `MIGRATION-GUIDE.md` - Esta guía

### Archivos Modificados
- ✅ `setup-neon.sql` - Actualizado con schema correcto
- ⚠️ `README-NEON.md` - Revisar si necesita actualizaciones

### Archivos Sin Cambios
- `schema.sql` - Schema de referencia (ya era correcto)
- `seed.sql` - Datos iniciales
- `add_user_countries.sql` - Relaciones usuario-país

## 🎯 Resultado Esperado

Después de la migración:
- ✅ Módulo de Traslados funciona sin errores
- ✅ Todas las queries del backend funcionan
- ✅ Frontend puede cargar transfers
- ✅ Se pueden crear nuevos traslados
- ✅ Paginación funciona en todos los módulos
- ✅ Exportar a Excel funciona

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Verifica los logs del backend
2. Revisa que el DATABASE_URL en .env sea correcto
3. Confirma que todas las tablas existen (`\dt`)
4. Verifica las columnas de cada tabla (`\d table_name`)
