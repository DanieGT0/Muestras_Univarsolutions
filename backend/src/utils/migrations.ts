import pool from '../config/database';
import fs from 'fs';
import path from 'path';

export async function runStartupMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting deployment process...');
    console.log('📋 Running database migrations...');

    // Check if tables are missing
    const checkTablesQuery = `
      SELECT COUNT(*) as missing_tables
      FROM (VALUES
        ('supplier_countries'),
        ('warehouse_countries'),
        ('location_countries'),
        ('responsible_countries')
      ) AS tables(table_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = tables.table_name
      );
    `;

    const checkResult = await client.query(checkTablesQuery);
    const missingTables = parseInt(checkResult.rows[0].missing_tables);

    if (missingTables > 0) {
      console.log(`🔧 Found ${missingTables} missing tables, running migration...`);

      // Execute the migration SQL directly
      const migrationSQL = `
        -- Create missing relationship tables
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
            END IF;
        END $$;

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

      await client.query(migrationSQL);
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('✅ All tables exist, no migration needed');
    }

    // Verify tables
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
        ('supplier_countries'),
        ('warehouse_countries'),
        ('location_countries'),
        ('responsible_countries')
      ) AS tables(table_name);
    `;

    const verifyResult = await client.query(verifyQuery);
    console.log('📊 Table status:');
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