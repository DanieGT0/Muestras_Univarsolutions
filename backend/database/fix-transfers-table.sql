-- ==========================================
-- FIX TRANSFERS TABLE SCHEMA
-- ==========================================
-- Este script corrige la tabla transfers para que coincida con el código actual
-- ==========================================

BEGIN;

-- ==========================================
-- STEP 1: Drop old empty tables
-- ==========================================

-- Drop samples table (empty, data is in muestras)
DROP TABLE IF EXISTS samples CASCADE;

-- Drop movements table (empty, data is in movimientos)
DROP TABLE IF EXISTS movements CASCADE;

-- ==========================================
-- STEP 2: Recreate transfers table with correct schema
-- ==========================================

-- Drop existing transfers table (it's empty)
DROP TABLE IF EXISTS transfers CASCADE;

-- Create new transfers table with correct schema
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    muestra_origen_id INTEGER REFERENCES muestras(id) NOT NULL,
    muestra_destino_id INTEGER REFERENCES muestras(id),
    cantidad_trasladada INTEGER NOT NULL CHECK (cantidad_trasladada >= 1),
    pais_destino_id INTEGER REFERENCES countries(id) NOT NULL,
    codigo_generado VARCHAR(50) UNIQUE NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    comentarios_traslado VARCHAR(500),
    estado estado_transfer DEFAULT 'ENVIADO',
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    usuario_origen_id UUID REFERENCES users(id) NOT NULL,
    usuario_destino_id UUID REFERENCES users(id)
);

-- ==========================================
-- STEP 3: Create indexes
-- ==========================================

CREATE INDEX idx_transfers_origen ON transfers(muestra_origen_id);
CREATE INDEX idx_transfers_estado ON transfers(estado);

-- ==========================================
-- STEP 4: Verify
-- ==========================================

-- Show transfers table structure
\d transfers

-- Show all tables
\dt

COMMIT;

-- ==========================================
-- DONE
-- ==========================================
SELECT 'Migration completed successfully!' as status;
