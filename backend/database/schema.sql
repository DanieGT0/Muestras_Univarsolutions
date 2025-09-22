-- Sample Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'COMMERCIAL');

-- Unit of measurement enum
CREATE TYPE unidad_medida AS ENUM ('kg', 'g', 'mg');

-- Movement type enum
CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA');

-- Transfer status enum
CREATE TYPE estado_transfer AS ENUM ('ENVIADO', 'COMPLETADO', 'RECHAZADO');

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

-- Many-to-many relationship tables for countries
CREATE TABLE supplier_countries (
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, country_id)
);

CREATE TABLE warehouse_countries (
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (warehouse_id, country_id)
);

CREATE TABLE location_countries (
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, country_id)
);

CREATE TABLE responsible_countries (
    responsible_id INTEGER REFERENCES responsibles(id) ON DELETE CASCADE,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (responsible_id, country_id)
);

-- Samples table
CREATE TABLE muestras (
    id SERIAL PRIMARY KEY,
    cod VARCHAR(15) UNIQUE NOT NULL,
    material VARCHAR(200) NOT NULL,
    lote VARCHAR(100) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    peso_unitario DECIMAL(10,4) NOT NULL CHECK (peso_unitario >= 0),
    unidad_medida unidad_medida NOT NULL,
    peso_total DECIMAL(10,3) NOT NULL CHECK (peso_total >= 0),
    fecha_vencimiento DATE,
    comentarios VARCHAR(500),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pais_id INTEGER REFERENCES countries(id) NOT NULL,
    categoria_id INTEGER REFERENCES categories(id) NOT NULL,
    proveedor_id INTEGER REFERENCES suppliers(id) NOT NULL,
    bodega_id INTEGER REFERENCES warehouses(id) NOT NULL,
    ubicacion_id INTEGER REFERENCES locations(id) NOT NULL,
    responsable_id INTEGER REFERENCES responsibles(id) NOT NULL
);

-- Movements table
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER REFERENCES muestras(id) NOT NULL,
    tipo_movimiento tipo_movimiento NOT NULL,
    cantidad_movida INTEGER NOT NULL CHECK (cantidad_movida >= 0),
    cantidad_anterior INTEGER NOT NULL CHECK (cantidad_anterior >= 0),
    cantidad_nueva INTEGER NOT NULL CHECK (cantidad_nueva >= 0),
    motivo VARCHAR(255) NOT NULL,
    comentarios VARCHAR(500),
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id UUID REFERENCES users(id) NOT NULL
);

-- Transfers table
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_muestras_cod ON muestras(cod);
CREATE INDEX idx_muestras_fecha_registro ON muestras(fecha_registro);
CREATE INDEX idx_muestras_pais ON muestras(pais_id);
CREATE INDEX idx_movimientos_sample ON movimientos(sample_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha_movimiento);
CREATE INDEX idx_transfers_origen ON transfers(muestra_origen_id);
CREATE INDEX idx_transfers_estado ON transfers(estado);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();