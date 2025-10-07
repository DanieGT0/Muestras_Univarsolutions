-- ==========================================
-- MIGRATION: Update Neon Schema to Current Version
-- ==========================================
-- Este script migra la base de datos de Neon PostgreSQL
-- desde el schema antiguo (setup-neon.sql) al nuevo (schema.sql)
--
-- IMPORTANTE: Hacer backup antes de ejecutar!
-- pg_dump 'postgresql://...' > backup_before_migration.sql
-- ==========================================

BEGIN;

-- ==========================================
-- STEP 1: Rename tables
-- ==========================================

-- Rename samples to muestras
ALTER TABLE IF EXISTS samples RENAME TO muestras;

-- Rename movements to movimientos
ALTER TABLE IF EXISTS movements RENAME TO movimientos;

-- ==========================================
-- STEP 2: Update movements (movimientos) table structure
-- ==========================================

-- Rename columns in movimientos table
ALTER TABLE movimientos RENAME COLUMN muestra_id TO sample_id;
ALTER TABLE movimientos RENAME COLUMN tipo TO tipo_movimiento;
ALTER TABLE movimientos RENAME COLUMN cantidad TO cantidad_movida;
ALTER TABLE movimientos RENAME COLUMN peso TO peso_movido;
ALTER TABLE movimientos RENAME COLUMN fecha TO fecha_movimiento;

-- Add missing columns to movimientos
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cantidad_anterior INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_anterior >= 0);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS cantidad_nueva INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_nueva >= 0);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS motivo VARCHAR(255) NOT NULL DEFAULT '';

-- Change cantidad_movida type from DECIMAL to INTEGER
ALTER TABLE movimientos ALTER COLUMN cantidad_movida TYPE INTEGER USING cantidad_movida::INTEGER;
ALTER TABLE movimientos ADD CHECK (cantidad_movida >= 0);

-- Remove peso_movido column if exists (not in new schema)
ALTER TABLE movimientos DROP COLUMN IF EXISTS peso_movido;

-- Remove bodega_id and ubicacion_id from movimientos (not in new schema)
ALTER TABLE movimientos DROP COLUMN IF EXISTS bodega_id;
ALTER TABLE movimientos DROP COLUMN IF EXISTS ubicacion_id;

-- ==========================================
-- STEP 3: Update transfers table structure
-- ==========================================

-- Rename muestra_id to muestra_origen_id
ALTER TABLE transfers RENAME COLUMN muestra_id TO muestra_origen_id;

-- Add muestra_destino_id column
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS muestra_destino_id INTEGER REFERENCES muestras(id);

-- Rename columns
ALTER TABLE transfers RENAME COLUMN cantidad TO cantidad_trasladada;
ALTER TABLE transfers RENAME COLUMN usuario_envio_id TO usuario_origen_id;
ALTER TABLE transfers RENAME COLUMN usuario_recepcion_id TO usuario_destino_id;

-- Change cantidad_trasladada type and add check constraint
ALTER TABLE transfers ALTER COLUMN cantidad_trasladada TYPE INTEGER USING cantidad_trasladada::INTEGER;
ALTER TABLE transfers ADD CHECK (cantidad_trasladada >= 1);

-- Remove peso column (not in new schema)
ALTER TABLE transfers DROP COLUMN IF EXISTS peso;

-- Remove pais_origen_id (not in new schema - origin country comes from muestra_origen)
ALTER TABLE transfers DROP COLUMN IF EXISTS pais_origen_id;

-- Add missing columns
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS codigo_generado VARCHAR(50) UNIQUE;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS motivo VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE transfers RENAME COLUMN comentarios TO comentarios_traslado;

-- Update codigo_generado for existing records (generate if null)
UPDATE transfers
SET codigo_generado = 'SV' || TO_CHAR(fecha_envio, 'DDMMYY') || LPAD(id::TEXT, 3, '0')
WHERE codigo_generado IS NULL;

-- Update motivo for existing records
UPDATE transfers
SET motivo = 'Traslado internacional'
WHERE motivo = '';

-- Make codigo_generado and motivo NOT NULL after populating
ALTER TABLE transfers ALTER COLUMN codigo_generado SET NOT NULL;
ALTER TABLE transfers ALTER COLUMN motivo SET NOT NULL;

-- ==========================================
-- STEP 4: Update muestras table structure
-- ==========================================

-- Change cantidad from DECIMAL to INTEGER
ALTER TABLE muestras ALTER COLUMN cantidad TYPE INTEGER USING cantidad::INTEGER;

-- Change peso_unitario precision
ALTER TABLE muestras ALTER COLUMN peso_unitario TYPE DECIMAL(10,4) USING peso_unitario::DECIMAL(10,4);

-- Change peso_total precision
ALTER TABLE muestras ALTER COLUMN peso_total TYPE DECIMAL(10,3) USING peso_total::DECIMAL(10,3);

-- Make foreign keys NOT NULL to match new schema
ALTER TABLE muestras ALTER COLUMN pais_id SET NOT NULL;
ALTER TABLE muestras ALTER COLUMN categoria_id SET NOT NULL;
ALTER TABLE muestras ALTER COLUMN proveedor_id SET NOT NULL;
ALTER TABLE muestras ALTER COLUMN bodega_id SET NOT NULL;
ALTER TABLE muestras ALTER COLUMN ubicacion_id SET NOT NULL;
ALTER TABLE muestras ALTER COLUMN responsable_id SET NOT NULL;

-- Update VARCHAR lengths
ALTER TABLE muestras ALTER COLUMN cod TYPE VARCHAR(15);
ALTER TABLE muestras ALTER COLUMN material TYPE VARCHAR(200);
ALTER TABLE muestras ALTER COLUMN comentarios TYPE VARCHAR(500);

-- ==========================================
-- STEP 5: Update indexes
-- ==========================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_samples_cod;
DROP INDEX IF EXISTS idx_samples_pais;
DROP INDEX IF EXISTS idx_samples_categoria;
DROP INDEX IF EXISTS idx_movements_muestra;
DROP INDEX IF EXISTS idx_movements_fecha;
DROP INDEX IF EXISTS idx_transfers_muestra;

-- Create new indexes with correct names
CREATE INDEX IF NOT EXISTS idx_muestras_cod ON muestras(cod);
CREATE INDEX IF NOT EXISTS idx_muestras_fecha_registro ON muestras(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_muestras_pais ON muestras(pais_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_sample ON movimientos(sample_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_transfers_origen ON transfers(muestra_origen_id);
CREATE INDEX IF NOT EXISTS idx_transfers_estado ON transfers(estado);

-- ==========================================
-- STEP 6: Verify migration
-- ==========================================

-- Show all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show muestras columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'muestras'
ORDER BY ordinal_position;

-- Show movimientos columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'movimientos'
ORDER BY ordinal_position;

-- Show transfers columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transfers'
ORDER BY ordinal_position;

COMMIT;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
-- La base de datos ahora coincide con schema.sql
-- Puedes probar el backend y frontend
-- ==========================================
