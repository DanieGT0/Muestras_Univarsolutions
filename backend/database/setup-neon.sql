-- ==========================================
-- NEON POSTGRESQL DATABASE SETUP
-- ==========================================
-- Este script configura la base de datos completa en Neon PostgreSQL
-- Ejecutar en orden:
-- 1. Este archivo (setup-neon.sql)
-- 2. seed.sql (datos iniciales)
-- 3. add_user_countries.sql (relaciones usuario-país)

-- ==========================================
-- STEP 1: EXTENSIONS
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- STEP 2: ENUMS
-- ==========================================

-- User roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'COMMERCIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Unit of measurement enum
DO $$ BEGIN
    CREATE TYPE unidad_medida AS ENUM ('kg', 'g', 'mg');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Movement type enum
DO $$ BEGIN
    CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transfer status enum
DO $$ BEGIN
    CREATE TYPE estado_transfer AS ENUM ('ENVIADO', 'COMPLETADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- STEP 3: DROP EXISTING TABLES (CLEAN START)
-- ==========================================

DROP TABLE IF EXISTS user_countries CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS samples CASCADE;
DROP TABLE IF EXISTS responsibles CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- STEP 4: CREATE TABLES
-- ==========================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Countries table
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Warehouses table
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Responsibles table
CREATE TABLE responsibles (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Samples table
CREATE TABLE samples (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(50) UNIQUE NOT NULL,
    material VARCHAR(255) NOT NULL,
    lote VARCHAR(100),
    cantidad DECIMAL(10, 2) NOT NULL DEFAULT 0,
    peso_unitario DECIMAL(10, 2),
    unidad_medida unidad_medida DEFAULT 'kg',
    peso_total DECIMAL(10, 2),
    fecha_vencimiento DATE,
    comentarios TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pais_id INTEGER REFERENCES countries(id),
    categoria_id INTEGER REFERENCES categories(id),
    proveedor_id INTEGER REFERENCES suppliers(id),
    bodega_id INTEGER REFERENCES warehouses(id),
    ubicacion_id INTEGER REFERENCES locations(id),
    responsable_id INTEGER REFERENCES responsibles(id)
);

-- Movements table
CREATE TABLE movements (
    id SERIAL PRIMARY KEY,
    muestra_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
    tipo tipo_movimiento NOT NULL,
    cantidad DECIMAL(10, 2) NOT NULL,
    peso DECIMAL(10, 2),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    comentarios TEXT,
    usuario_id UUID REFERENCES users(id),
    bodega_id INTEGER REFERENCES warehouses(id),
    ubicacion_id INTEGER REFERENCES locations(id)
);

-- Transfers table
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    muestra_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
    cantidad DECIMAL(10, 2) NOT NULL,
    peso DECIMAL(10, 2),
    pais_origen_id INTEGER REFERENCES countries(id),
    pais_destino_id INTEGER REFERENCES countries(id),
    estado estado_transfer DEFAULT 'ENVIADO',
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    comentarios TEXT,
    usuario_envio_id UUID REFERENCES users(id),
    usuario_recepcion_id UUID REFERENCES users(id)
);

-- User countries relationship table (for commercial users)
CREATE TABLE user_countries (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, country_id)
);

-- ==========================================
-- STEP 5: INDEXES
-- ==========================================

CREATE INDEX idx_samples_cod ON samples(cod);
CREATE INDEX idx_samples_pais ON samples(pais_id);
CREATE INDEX idx_samples_categoria ON samples(categoria_id);
CREATE INDEX idx_movements_muestra ON movements(muestra_id);
CREATE INDEX idx_movements_fecha ON movements(fecha);
CREATE INDEX idx_transfers_muestra ON transfers(muestra_id);
CREATE INDEX idx_transfers_estado ON transfers(estado);
CREATE INDEX idx_user_countries_user ON user_countries(user_id);
CREATE INDEX idx_user_countries_country ON user_countries(country_id);

-- ==========================================
-- STEP 6: FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
