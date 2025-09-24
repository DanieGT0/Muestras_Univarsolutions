import pool from '../config/database';
import fs from 'fs';
import path from 'path';

export async function runStartupMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting deployment process...');
    console.log('📋 Running complete database schema migration...');

    // Execute COMPLETE schema with IF NOT EXISTS
    const completeSchemaSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
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
      CREATE TABLE IF NOT EXISTS countries (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(3) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(3) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Warehouses table
      CREATE TABLE IF NOT EXISTS warehouses (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Locations table
      CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Responsibles table
      CREATE TABLE IF NOT EXISTS responsibles (
          id SERIAL PRIMARY KEY,
          cod VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL
      );

      -- Many-to-many relationship tables for countries
      CREATE TABLE IF NOT EXISTS supplier_countries (
          supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
          country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
          PRIMARY KEY (supplier_id, country_id)
      );

      CREATE TABLE IF NOT EXISTS warehouse_countries (
          warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
          country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
          PRIMARY KEY (warehouse_id, country_id)
      );

      CREATE TABLE IF NOT EXISTS location_countries (
          location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
          country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
          PRIMARY KEY (location_id, country_id)
      );

      CREATE TABLE IF NOT EXISTS responsible_countries (
          responsible_id INTEGER REFERENCES responsibles(id) ON DELETE CASCADE,
          country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
          PRIMARY KEY (responsible_id, country_id)
      );

      -- Samples table
      CREATE TABLE IF NOT EXISTS muestras (
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
      CREATE TABLE IF NOT EXISTS movimientos (
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
      CREATE TABLE IF NOT EXISTS transfers (
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

      -- Create indexes for better performance (without CONCURRENTLY in transactions)
      DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
              CREATE INDEX idx_users_email ON users(email);
          END IF;
      EXCEPTION
          WHEN duplicate_table THEN null;
      END $$;

      DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
              CREATE INDEX idx_users_role ON users(role);
          END IF;
      EXCEPTION
          WHEN duplicate_table THEN null;
      END $$;

      DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_muestras_cod') THEN
              CREATE INDEX idx_muestras_cod ON muestras(cod);
          END IF;
      EXCEPTION
          WHEN duplicate_table THEN null;
      END $$;

      -- Update function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Trigger (recreate if exists)
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Populate with default relationships
      DO $$
      DECLARE
          default_country_id INTEGER;
      BEGIN
          -- Get the first available country
          SELECT id INTO default_country_id FROM countries LIMIT 1;

          IF default_country_id IS NULL THEN
              INSERT INTO countries (cod, name) VALUES ('DEF', 'Default Country') RETURNING id INTO default_country_id;
              RAISE NOTICE 'Created default country with ID: %', default_country_id;
          END IF;

          -- Link existing data to default country if tables are empty
          IF NOT EXISTS (SELECT 1 FROM supplier_countries) AND EXISTS (SELECT 1 FROM suppliers) THEN
              INSERT INTO supplier_countries (supplier_id, country_id)
              SELECT id, default_country_id FROM suppliers;
              RAISE NOTICE 'Linked suppliers to default country';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM warehouse_countries) AND EXISTS (SELECT 1 FROM warehouses) THEN
              INSERT INTO warehouse_countries (warehouse_id, country_id)
              SELECT id, default_country_id FROM warehouses;
              RAISE NOTICE 'Linked warehouses to default country';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM location_countries) AND EXISTS (SELECT 1 FROM locations) THEN
              INSERT INTO location_countries (location_id, country_id)
              SELECT id, default_country_id FROM locations;
              RAISE NOTICE 'Linked locations to default country';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM responsible_countries) AND EXISTS (SELECT 1 FROM responsibles) THEN
              INSERT INTO responsible_countries (responsible_id, country_id)
              SELECT id, default_country_id FROM responsibles;
              RAISE NOTICE 'Linked responsibles to default country';
          END IF;
      END $$;
    `;

    await client.query(completeSchemaSQL);
    console.log('✅ Complete schema migration completed successfully!');

    // Verify all important tables
    const verifyQuery = `
      SELECT
        table_name,
        CASE
          WHEN EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = 'public' AND table_name = tables.table_name)
          THEN 'EXISTS'
          ELSE 'MISSING'
        END as status
      FROM (VALUES
        ('users'),
        ('countries'),
        ('categories'),
        ('suppliers'),
        ('warehouses'),
        ('locations'),
        ('responsibles'),
        ('supplier_countries'),
        ('warehouse_countries'),
        ('location_countries'),
        ('responsible_countries'),
        ('muestras'),
        ('movimientos'),
        ('transfers')
      ) AS tables(table_name);
    `;

    const verifyResult = await client.query(verifyQuery);
    console.log('📊 Complete database schema status:');
    verifyResult.rows.forEach(row => {
      const emoji = row.status === 'EXISTS' ? '✅' : '❌';
      console.log(`${emoji} ${row.table_name}: ${row.status}`);
    });

    console.log('🎉 Database is ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error code:', (error as any).code);

    // Don't throw error, just log it and continue
    console.log('⚠️  Migration failed but server will continue...');
  } finally {
    client.release();
  }
}