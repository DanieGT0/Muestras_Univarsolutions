const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'samples_db',
  password: process.env.DB_PASSWORD || '123321',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function checkUsers() {
  try {
    const client = await pool.connect();

    // Check if users table exists and has data
    const result = await client.query('SELECT id, email, role, is_active FROM users');

    console.log('📊 Usuarios en la base de datos:');
    console.log('Total usuarios:', result.rows.length);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
    });

    client.release();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();