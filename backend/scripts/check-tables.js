const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

const AVAILABLE_TABLES = [
  'muestras',
  'movimientos',
  'kardex',
  'countries',
  'categories',
  'locations',
  'suppliers',
  'responsibles',
  'warehouses',
  'users'
];

async function checkTables() {
  try {
    console.log('🔍 Checking which tables exist in the database...\n');

    // Get all existing tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const result = await pool.query(tablesQuery);
    const existingTables = result.rows.map(row => row.table_name);

    console.log('📋 All existing tables in database:');
    existingTables.forEach(table => console.log(`   ✅ ${table}`));

    console.log('\n🔍 Checking AVAILABLE_TABLES from security config:');

    const missingTables = [];
    const validTables = [];

    for (const tableName of AVAILABLE_TABLES) {
      if (existingTables.includes(tableName)) {
        console.log(`   ✅ ${tableName} - EXISTS`);
        validTables.push(tableName);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
        missingTables.push(tableName);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Valid tables: ${validTables.length}`);
    console.log(`   Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables need to be:');
      console.log('   1. Created in the database, OR');
      console.log('   2. Removed from AVAILABLE_TABLES config');
    }

    // Check if valid tables have data
    console.log('\n📊 Checking data in valid tables:');
    for (const tableName of validTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ${tableName}: ${count} records`);
      } catch (error) {
        console.log(`   ${tableName}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();