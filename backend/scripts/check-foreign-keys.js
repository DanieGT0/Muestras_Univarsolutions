const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function checkForeignKeys() {
  try {
    console.log('🔍 Verificando relaciones de llaves foráneas entre muestras y movimientos...\n');

    // Verificar relaciones de la tabla muestras
    console.log('📋 Llaves foráneas desde la tabla MUESTRAS:');
    const muestrasFK = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'muestras'
      ORDER BY tc.constraint_name;
    `);

    if (muestrasFK.rows.length > 0) {
      muestrasFK.rows.forEach(row => {
        console.log(`   ✅ ${row.source_table}.${row.source_column} → ${row.target_table}.${row.target_column}`);
      });
    } else {
      console.log('   ⚠️  No se encontraron llaves foráneas desde muestras');
    }

    // Verificar relaciones hacia la tabla muestras
    console.log('\n📋 Llaves foráneas hacia la tabla MUESTRAS:');
    const toMuestrasFK = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'muestras'
      ORDER BY tc.constraint_name;
    `);

    if (toMuestrasFK.rows.length > 0) {
      toMuestrasFK.rows.forEach(row => {
        console.log(`   ✅ ${row.source_table}.${row.source_column} → ${row.target_table}.${row.target_column}`);
      });
    } else {
      console.log('   ⚠️  No se encontraron llaves foráneas hacia muestras');
    }

    // Verificar específicamente la relación muestras-movimientos
    console.log('\n🔍 Verificando relación específica MUESTRAS ↔ MOVIMIENTOS:');

    const movimientosFK = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'movimientos'
        AND (ccu.table_name = 'muestras' OR kcu.column_name LIKE '%sample%')
      ORDER BY tc.constraint_name;
    `);

    if (movimientosFK.rows.length > 0) {
      console.log('   ✅ RELACIÓN ENCONTRADA:');
      movimientosFK.rows.forEach(row => {
        console.log(`      ${row.source_table}.${row.source_column} → ${row.target_table}.${row.target_column}`);
        if (row.source_table === 'movimientos' && row.target_table === 'muestras') {
          console.log('      📌 movimientos tiene dependencia de muestras');
        }
      });
    } else {
      console.log('   ⚠️  No se encontró relación directa entre movimientos y muestras');
    }

    // Verificar estructura de columnas
    console.log('\n📊 Estructura de columnas relevantes:');

    const muestrasColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'muestras' AND column_name LIKE '%id%'
      ORDER BY ordinal_position;
    `);

    console.log('   MUESTRAS (columnas con ID):');
    muestrasColumns.rows.forEach(col => {
      console.log(`      ${col.column_name}: ${col.data_type}`);
    });

    const movimientosColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'movimientos' AND (column_name LIKE '%id%' OR column_name LIKE '%sample%')
      ORDER BY ordinal_position;
    `);

    console.log('   MOVIMIENTOS (columnas con ID o sample):');
    movimientosColumns.rows.forEach(col => {
      console.log(`      ${col.column_name}: ${col.data_type}`);
    });

    // Verificar si hay datos relacionados
    console.log('\n📈 Verificando datos relacionados:');
    const relationCheck = await pool.query(`
      SELECT
        m.id as muestra_id,
        m.cod as muestra_cod,
        COUNT(mov.id) as movimientos_count
      FROM muestras m
      LEFT JOIN movimientos mov ON m.id = mov.sample_id
      GROUP BY m.id, m.cod
      ORDER BY m.id;
    `);

    console.log('   Relación de datos:');
    relationCheck.rows.forEach(row => {
      console.log(`      Muestra ${row.muestra_id} (${row.muestra_cod}): ${row.movimientos_count} movimientos`);
    });

  } catch (error) {
    console.error('❌ Error verificando relaciones:', error.message);
  } finally {
    await pool.end();
  }
}

checkForeignKeys();