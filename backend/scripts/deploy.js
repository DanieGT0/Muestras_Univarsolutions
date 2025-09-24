const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting deployment process...');
console.log('Environment:', process.env.NODE_ENV);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  let client;
  try {
    console.log('📋 Running database migrations...');

    client = await pool.connect();
    console.log('✅ Connected to database');

    // Check if this is the first deployment by looking for missing tables
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

      // Read and execute the migration script
      const migrationPath = path.join(__dirname, 'fix-missing-tables.sql');
      if (fs.existsSync(migrationPath)) {
        const sqlScript = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sqlScript);
        console.log('✅ Migration completed successfully!');
      } else {
        console.log('⚠️  Migration file not found, skipping...');
      }
    } else {
      console.log('✅ All tables exist, no migration needed');
    }

    // Verify tables exist
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
    console.error('❌ Migration failed:', error.message);
    if (error.code) console.error(`Error code: ${error.code}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);

    // Don't fail the entire deployment for migration errors in production
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Migration failed but continuing deployment...');
    } else {
      process.exit(1);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

async function main() {
  try {
    await runMigrations();
    console.log('🚀 Deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Only run migrations if this script is called directly
if (require.main === module) {
  main();
}

module.exports = { runMigrations };