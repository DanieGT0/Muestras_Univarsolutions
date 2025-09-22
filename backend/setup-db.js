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

async function setupDatabase() {
  try {
    console.log('🔄 Conectando a PostgreSQL...');

    // Test connection
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');

    // Read and execute schema
    console.log('📋 Creando esquema de base de datos...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
    await client.query(schemaSQL);
    console.log('✅ Esquema creado exitosamente');

    // Read and execute seed data
    console.log('🌱 Insertando datos de prueba...');
    const seedSQL = fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8');
    await client.query(seedSQL);
    console.log('✅ Datos de prueba insertados');

    client.release();
    console.log('🎉 Base de datos configurada completamente!');
    console.log('');
    console.log('👤 Usuarios de prueba creados:');
    console.log('   Admin: admin@sample.com / admin123');
    console.log('   Usuario: user@sample.com / user123');
    console.log('');
    console.log('🌐 Puedes acceder a la aplicación en: http://localhost:5174');

  } catch (err) {
    console.error('❌ Error configurando la base de datos:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('💡 Asegúrate de que PostgreSQL esté corriendo y las credenciales sean correctas.');
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

setupDatabase();