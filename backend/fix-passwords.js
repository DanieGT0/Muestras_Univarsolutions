const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'samples_db',
  password: process.env.DB_PASSWORD || '123321',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function fixPasswords() {
  try {
    const client = await pool.connect();

    console.log('🔐 Generando nuevos hashes de contraseñas...');

    // Generate new password hashes
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    console.log('Admin hash:', adminPassword);
    console.log('User hash:', userPassword);

    // Update passwords in database
    await client.query(
      'UPDATE users SET hashed_password = $1 WHERE email = $2',
      [adminPassword, 'admin@sample.com']
    );

    await client.query(
      'UPDATE users SET hashed_password = $1 WHERE email = $2',
      [userPassword, 'user@sample.com']
    );

    console.log('✅ Contraseñas actualizadas correctamente');

    // Test password verification
    const testResult = await client.query('SELECT hashed_password FROM users WHERE email = $1', ['admin@sample.com']);
    const storedHash = testResult.rows[0].hashed_password;

    const isValid = await bcrypt.compare('admin123', storedHash);
    console.log('🧪 Test de verificación de contraseña:', isValid ? '✅ CORRECTO' : '❌ FALLIDO');

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixPasswords();