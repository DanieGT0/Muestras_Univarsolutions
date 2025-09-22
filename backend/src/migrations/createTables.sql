-- Create tables for the sample management system
-- This migration ensures all required tables exist

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Responsibles table
CREATE TABLE IF NOT EXISTS responsibles (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'COMMERCIAL')),
    is_active BOOLEAN DEFAULT true,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Samples table (muestras)
CREATE TABLE IF NOT EXISTS muestras (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(50) UNIQUE NOT NULL,
    material VARCHAR(200) NOT NULL,
    lote VARCHAR(100) NOT NULL,
    cantidad DECIMAL(10,3) NOT NULL DEFAULT 0,
    peso_unitario DECIMAL(10,3) NOT NULL,
    unidad_medida VARCHAR(10) NOT NULL CHECK (unidad_medida IN ('kg', 'g', 'mg')),
    peso_total DECIMAL(10,3) NOT NULL,
    fecha_vencimiento DATE,
    comentarios TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pais_id INTEGER NOT NULL REFERENCES countries(id),
    categoria_id INTEGER NOT NULL REFERENCES categories(id),
    proveedor_id INTEGER NOT NULL REFERENCES suppliers(id),
    bodega_id INTEGER NOT NULL REFERENCES warehouses(id),
    ubicacion_id INTEGER NOT NULL REFERENCES locations(id),
    responsable_id INTEGER NOT NULL REFERENCES responsibles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movements table (movimientos)
CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER NOT NULL REFERENCES muestras(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA')),
    cantidad_movida DECIMAL(10,3) NOT NULL,
    cantidad_anterior DECIMAL(10,3) NOT NULL,
    cantidad_nueva DECIMAL(10,3) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    comentarios TEXT,
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Kardex table
CREATE TABLE IF NOT EXISTS kardex (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER NOT NULL REFERENCES muestras(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA')),
    cantidad DECIMAL(10,3) NOT NULL,
    saldo_anterior DECIMAL(10,3) NOT NULL,
    saldo_nuevo DECIMAL(10,3) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID NOT NULL REFERENCES users(id),
    movimiento_id INTEGER REFERENCES movimientos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table (traslados)
CREATE TABLE IF NOT EXISTS traslados (
    id SERIAL PRIMARY KEY,
    muestra_origen_id INTEGER NOT NULL REFERENCES muestras(id),
    muestra_destino_id INTEGER REFERENCES muestras(id),
    cantidad_trasladada DECIMAL(10,3) NOT NULL,
    pais_destino_id INTEGER NOT NULL REFERENCES countries(id),
    codigo_generado VARCHAR(50) UNIQUE NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    comentarios_traslado TEXT,
    estado VARCHAR(20) DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO', 'COMPLETADO', 'RECHAZADO')),
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    usuario_origen_id UUID NOT NULL REFERENCES users(id),
    usuario_destino_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'error', 'warning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_muestras_cod ON muestras(cod);
CREATE INDEX IF NOT EXISTS idx_muestras_material ON muestras(material);
CREATE INDEX IF NOT EXISTS idx_muestras_lote ON muestras(lote);
CREATE INDEX IF NOT EXISTS idx_muestras_fecha_registro ON muestras(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_muestras_pais_id ON muestras(pais_id);
CREATE INDEX IF NOT EXISTS idx_muestras_categoria_id ON muestras(categoria_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_sample_id ON movimientos(sample_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario ON movimientos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_kardex_sample_id ON kardex(sample_id);
CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON kardex(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_kardex_tipo ON kardex(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_kardex_usuario ON kardex(usuario_id);

CREATE INDEX IF NOT EXISTS idx_traslados_origen ON traslados(muestra_origen_id);
CREATE INDEX IF NOT EXISTS idx_traslados_destino ON traslados(muestra_destino_id);
CREATE INDEX IF NOT EXISTS idx_traslados_codigo ON traslados(codigo_generado);
CREATE INDEX IF NOT EXISTS idx_traslados_estado ON traslados(estado);
CREATE INDEX IF NOT EXISTS idx_traslados_fecha_envio ON traslados(fecha_envio);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_status ON security_logs(status);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to tables that have updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
        AND table_name IN ('countries', 'categories', 'suppliers', 'warehouses', 'locations', 'responsibles', 'users', 'muestras', 'movimientos', 'traslados')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END
$$;