const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'samples_db',
  password: process.env.DB_PASSWORD || '123321',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function fixMissingTables() {
  try {
    console.log('🔧 Starting database migration to fix missing tables...');

    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the SQL migration script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-missing-tables.sql'), 'utf8');

    console.log('📋 Executing migration script...');
    const result = await client.query(sqlScript);

    console.log('✅ Migration completed successfully!');

    // Verify the tables exist now
    console.log('\n🔍 Verifying tables...');
    const verifyQuery = `
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
    `;

    const verifyResult = await client.query(verifyQuery);
    verifyResult.rows.forEach(row => {
      console.log(`${row.status} ${row.table_name}`);
    });

    // Show counts
    console.log('\n📊 Table counts:');
    const countQueries = [
      'SELECT COUNT(*) as count FROM supplier_countries',
      'SELECT COUNT(*) as count FROM warehouse_countries',
      'SELECT COUNT(*) as count FROM location_countries',
      'SELECT COUNT(*) as count FROM responsible_countries'
    ];

    const tableNames = ['supplier_countries', 'warehouse_countries', 'location_countries', 'responsible_countries'];

    for (let i = 0; i < countQueries.length; i++) {
      try {
        const countResult = await client.query(countQueries[i]);
        console.log(`${tableNames[i]}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`${tableNames[i]}: Error counting - ${error.message}`);
      }
    }

    client.release();
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 The API endpoints should now work correctly.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`Detail: ${error.detail}`);
    }
  } finally {
    await pool.end();
  }
}

fixMissingTables();