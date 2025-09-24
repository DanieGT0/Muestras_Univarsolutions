-- Fix missing relationship tables in production database
-- Run this script to add the missing many-to-many relationship tables

-- Check if tables exist before creating them
DO $$
BEGIN
    -- Create supplier_countries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'supplier_countries') THEN
        CREATE TABLE supplier_countries (
            supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
            country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
            PRIMARY KEY (supplier_id, country_id)
        );
        RAISE NOTICE 'Created table: supplier_countries';
    ELSE
        RAISE NOTICE 'Table supplier_countries already exists';
    END IF;

    -- Create warehouse_countries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'warehouse_countries') THEN
        CREATE TABLE warehouse_countries (
            warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
            country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
            PRIMARY KEY (warehouse_id, country_id)
        );
        RAISE NOTICE 'Created table: warehouse_countries';
    ELSE
        RAISE NOTICE 'Table warehouse_countries already exists';
    END IF;

    -- Create location_countries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'location_countries') THEN
        CREATE TABLE location_countries (
            location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
            country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
            PRIMARY KEY (location_id, country_id)
        );
        RAISE NOTICE 'Created table: location_countries';
    ELSE
        RAISE NOTICE 'Table location_countries already exists';
    END IF;

    -- Create responsible_countries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'responsible_countries') THEN
        CREATE TABLE responsible_countries (
            responsible_id INTEGER REFERENCES responsibles(id) ON DELETE CASCADE,
            country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
            PRIMARY KEY (responsible_id, country_id)
        );
        RAISE NOTICE 'Created table: responsible_countries';
    ELSE
        RAISE NOTICE 'Table responsible_countries already exists';
    END IF;
END $$;

-- Populate tables with default relationships if they're empty
-- This ensures existing data can be related to countries

DO $$
DECLARE
    default_country_id INTEGER;
BEGIN
    -- Get the first available country (or create one if none exists)
    SELECT id INTO default_country_id FROM countries LIMIT 1;

    IF default_country_id IS NULL THEN
        -- Create a default country if none exists
        INSERT INTO countries (cod, name) VALUES ('DEF', 'Default Country') RETURNING id INTO default_country_id;
        RAISE NOTICE 'Created default country with ID: %', default_country_id;
    END IF;

    -- Link all suppliers to default country if no relations exist
    IF NOT EXISTS (SELECT 1 FROM supplier_countries) THEN
        INSERT INTO supplier_countries (supplier_id, country_id)
        SELECT id, default_country_id FROM suppliers;
        RAISE NOTICE 'Linked all suppliers to default country';
    END IF;

    -- Link all warehouses to default country if no relations exist
    IF NOT EXISTS (SELECT 1 FROM warehouse_countries) THEN
        INSERT INTO warehouse_countries (warehouse_id, country_id)
        SELECT id, default_country_id FROM warehouses;
        RAISE NOTICE 'Linked all warehouses to default country';
    END IF;

    -- Link all locations to default country if no relations exist
    IF NOT EXISTS (SELECT 1 FROM location_countries) THEN
        INSERT INTO location_countries (location_id, country_id)
        SELECT id, default_country_id FROM locations;
        RAISE NOTICE 'Linked all locations to default country';
    END IF;

    -- Link all responsibles to default country if no relations exist
    IF NOT EXISTS (SELECT 1 FROM responsible_countries) THEN
        INSERT INTO responsible_countries (responsible_id, country_id)
        SELECT id, default_country_id FROM responsibles;
        RAISE NOTICE 'Linked all responsibles to default country';
    END IF;
END $$;

-- Verify tables were created successfully
SELECT
    table_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'public' AND table_name = tables.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES
    ('supplier_countries'),
    ('warehouse_countries'),
    ('location_countries'),
    ('responsible_countries')
) AS tables(table_name);