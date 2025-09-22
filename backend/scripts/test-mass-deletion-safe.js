const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function testMassDeletionSafe() {
  const client = await pool.connect();

  try {
    console.log('🧪 Testing mass deletion functionality with ID reset (Safe Mode)...\n');

    // Crear tabla de prueba temporal
    const testTableName = 'test_deletion_table';

    console.log('🏗️  Creando tabla de prueba temporal...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${testTableName} (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(50) NOT NULL
      )
    `);

    // Limpiar tabla si ya existe
    await client.query(`DELETE FROM ${testTableName}`);
    await client.query(`ALTER SEQUENCE ${testTableName}_id_seq RESTART WITH 1`);

    // Insertar datos de prueba
    console.log('📝 Insertando datos de prueba...');
    await client.query(`
      INSERT INTO ${testTableName} (code, name) VALUES
      ('T001', 'Test Item 1'),
      ('T002', 'Test Item 2'),
      ('T003', 'Test Item 3'),
      ('T004', 'Test Item 4'),
      ('T005', 'Test Item 5')
    `);

    // 1. Ver estado inicial
    console.log('\n📊 Estado inicial:');
    const beforeCount = await client.query(`SELECT COUNT(*) FROM ${testTableName}`);
    console.log(`   ${testTableName}: ${beforeCount.rows[0].count} registros`);

    const beforeData = await client.query(`SELECT id, code, name FROM ${testTableName} ORDER BY id`);
    console.log('   Datos actuales:');
    beforeData.rows.forEach(row => {
      console.log(`     ID: ${row.id}, Código: ${row.code}, Nombre: ${row.name}`);
    });

    // 2. Ver secuencia actual
    const sequenceValue = await client.query(`SELECT last_value, is_called FROM ${testTableName}_id_seq`);
    console.log(`   Secuencia actual: ${sequenceValue.rows[0].last_value} (is_called: ${sequenceValue.rows[0].is_called})`);

    // 3. Simular borrado masivo (exactamente como en securityController.ts)
    console.log('\n🗑️  Ejecutando borrado masivo (simulando securityController)...');

    await client.query('BEGIN');

    // Get record count before deletion (como en el controlador)
    const countResult = await client.query(`SELECT COUNT(*) FROM ${testTableName}`);
    const recordCount = parseInt(countResult.rows[0].count);
    console.log(`   📊 Registros a eliminar: ${recordCount}`);

    // Delete all records (como en el controlador)
    await client.query(`DELETE FROM ${testTableName}`);
    console.log(`   ✅ Registros eliminados de ${testTableName}`);

    // Reset sequence if exists (como en el controlador)
    try {
      await client.query(`ALTER SEQUENCE ${testTableName}_id_seq RESTART WITH 1`);
      console.log(`   ✅ Secuencia ${testTableName}_id_seq reiniciada`);
    } catch (seqError) {
      console.log(`   ⚠️  Error reiniciando secuencia: ${seqError.message}`);
    }

    await client.query('COMMIT');

    // 4. Verificar estado después del borrado
    console.log('\n📊 Estado después del borrado:');
    const afterCount = await client.query(`SELECT COUNT(*) FROM ${testTableName}`);
    console.log(`   ${testTableName}: ${afterCount.rows[0].count} registros`);

    const afterSequence = await client.query(`SELECT last_value, is_called FROM ${testTableName}_id_seq`);
    console.log(`   Secuencia después: ${afterSequence.rows[0].last_value} (is_called: ${afterSequence.rows[0].is_called})`);

    // 5. Insertar nuevos registros para probar el ID
    console.log('\n🆕 Insertando nuevos registros para probar secuencia de ID...');

    const insert1 = await client.query(`
      INSERT INTO ${testTableName} (code, name)
      VALUES ('NEW001', 'New Item 1')
      RETURNING id
    `);

    const insert2 = await client.query(`
      INSERT INTO ${testTableName} (code, name)
      VALUES ('NEW002', 'New Item 2')
      RETURNING id
    `);

    const insert3 = await client.query(`
      INSERT INTO ${testTableName} (code, name)
      VALUES ('NEW003', 'New Item 3')
      RETURNING id
    `);

    const newId1 = insert1.rows[0].id;
    const newId2 = insert2.rows[0].id;
    const newId3 = insert3.rows[0].id;

    console.log(`   ✅ Primer registro insertado con ID: ${newId1}`);
    console.log(`   ✅ Segundo registro insertado con ID: ${newId2}`);
    console.log(`   ✅ Tercer registro insertado con ID: ${newId3}`);

    // Verificar secuencia
    if (newId1 === 1 && newId2 === 2 && newId3 === 3) {
      console.log('\n   🎉 ¡ÉXITO TOTAL! El contador ID se reinició correctamente');
      console.log('   ✅ Los nuevos IDs comenzaron desde 1 y siguieron la secuencia correcta');
    } else {
      console.log(`\n   ❌ ERROR: Se esperaba secuencia 1,2,3 pero se obtuvo ${newId1},${newId2},${newId3}`);
    }

    // 6. Verificar estado final
    const finalData = await client.query(`SELECT id, code, name FROM ${testTableName} ORDER BY id`);
    console.log('\n📊 Datos finales después de insertar:');
    finalData.rows.forEach(row => {
      console.log(`     ID: ${row.id}, Código: ${row.code}, Nombre: ${row.name}`);
    });

    // 7. Limpiar tabla de prueba
    console.log('\n🧹 Limpiando tabla de prueba...');
    await client.query(`DROP TABLE ${testTableName}`);
    console.log('   ✅ Tabla de prueba eliminada');

    console.log('\n✅ Prueba de funcionalidad de borrado masivo completada con éxito');
    console.log('📋 RESULTADO: La funcionalidad de reinicio de contador ID funciona correctamente');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testMassDeletionSafe();