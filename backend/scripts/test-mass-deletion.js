const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function testMassDeletion() {
  const client = await pool.connect();

  try {
    console.log('🧪 Testing mass deletion functionality with ID reset...\n');

    // Test con tabla 'categories' que tiene pocos registros
    const tableName = 'categories';

    // 1. Ver estado inicial
    console.log('📊 Estado inicial:');
    const beforeCount = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`   ${tableName}: ${beforeCount.rows[0].count} registros`);

    const beforeData = await client.query(`SELECT id, cod, name FROM ${tableName} ORDER BY id`);
    console.log('   Datos actuales:');
    beforeData.rows.forEach(row => {
      console.log(`     ID: ${row.id}, Código: ${row.cod}, Nombre: ${row.name}`);
    });

    // 2. Ver secuencia actual
    const sequenceValue = await client.query(`SELECT last_value, is_called FROM ${tableName}_id_seq`);
    console.log(`   Secuencia actual: ${sequenceValue.rows[0].last_value} (is_called: ${sequenceValue.rows[0].is_called})`);

    // 3. Simular borrado masivo (como en securityController)
    console.log('\n🗑️  Ejecutando borrado masivo...');

    await client.query('BEGIN');

    // Borrar todos los registros
    await client.query(`DELETE FROM ${tableName}`);
    console.log(`   ✅ Registros eliminados de ${tableName}`);

    // Reiniciar secuencia
    await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`);
    console.log(`   ✅ Secuencia ${tableName}_id_seq reiniciada`);

    await client.query('COMMIT');

    // 4. Verificar estado después del borrado
    console.log('\n📊 Estado después del borrado:');
    const afterCount = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`   ${tableName}: ${afterCount.rows[0].count} registros`);

    const afterSequence = await client.query(`SELECT last_value, is_called FROM ${tableName}_id_seq`);
    console.log(`   Secuencia después: ${afterSequence.rows[0].last_value} (is_called: ${afterSequence.rows[0].is_called})`);

    // 5. Insertar un nuevo registro para probar el ID
    console.log('\n🆕 Insertando nuevo registro para probar ID...');
    const insertResult = await client.query(`
      INSERT INTO ${tableName} (cod, name)
      VALUES ('TEST001', 'Test Category')
      RETURNING id
    `);

    const newId = insertResult.rows[0].id;
    console.log(`   ✅ Nuevo registro insertado con ID: ${newId}`);

    if (newId === 1) {
      console.log('   ✅ ÉXITO: El contador ID se reinició correctamente a 1');
    } else {
      console.log(`   ❌ ERROR: Se esperaba ID=1, pero se obtuvo ID=${newId}`);
    }

    // 6. Limpiar el registro de prueba
    await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [newId]);
    await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`);
    console.log('   🧹 Registro de prueba eliminado y secuencia reiniciada');

    console.log('\n✅ Prueba de funcionalidad de borrado masivo completada');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la prueba:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testMassDeletion();