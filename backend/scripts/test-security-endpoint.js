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
  'countries',
  'categories',
  'locations',
  'suppliers',
  'responsibles',
  'warehouses',
  'users'
];

async function getTableInfo(tableName) {
  try {
    console.log(`🔍 Processing table: ${tableName}`);

    const [countResult, sizeResult, structureResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM ${tableName}`),
      pool.query(`SELECT pg_total_relation_size('${tableName}') as size`),
      pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName])
    ]);

    const result = {
      name: tableName,
      recordCount: parseInt(countResult.rows[0].count),
      sizeBytes: parseInt(sizeResult.rows[0].size) || 0,
      columns: structureResult.rows.length,
      structure: structureResult.rows
    };

    console.log(`📊 ${tableName}:`, result);
    return result;
  } catch (error) {
    console.log(`❌ Error with ${tableName}:`, error.message);
    return {
      name: tableName,
      error: error.message,
      recordCount: 0,
      sizeBytes: 0,
      columns: 0
    };
  }
}

async function testSecurityEndpoint() {
  try {
    console.log('🔄 Testing security tables info endpoint logic...\n');

    const tablesInfo = [];
    let totalSize = 0;
    let totalRecords = 0;

    for (const tableName of AVAILABLE_TABLES) {
      const tableInfo = await getTableInfo(tableName);
      tablesInfo.push(tableInfo);

      if (!tableInfo.error) {
        totalSize += tableInfo.sizeBytes;
        totalRecords += tableInfo.recordCount;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Total tables processed: ${tablesInfo.length}`);
    console.log(`   Tables with data: ${tablesInfo.filter(t => !t.error && t.recordCount > 0).length}`);
    console.log(`   Tables with errors: ${tablesInfo.filter(t => t.error).length}`);
    console.log(`   Total records: ${totalRecords}`);
    console.log(`   Total size: ${totalSize} bytes`);

    const response = {
      tables: tablesInfo,
      pagination: {
        page: 1,
        limit: 50,
        total: AVAILABLE_TABLES.length,
        pages: Math.ceil(AVAILABLE_TABLES.length / 50)
      },
      summary: {
        totalTables: AVAILABLE_TABLES.length,
        totalSize,
        totalRecords
      },
      timestamp: new Date().toISOString()
    };

    console.log('\n📋 Final response size:', JSON.stringify(response).length, 'bytes');
    console.log('\n🔍 Tables in final response:', response.tables.length);

    if (response.tables.length === 0) {
      console.log('⚠️  WARNING: No tables in response!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testSecurityEndpoint();