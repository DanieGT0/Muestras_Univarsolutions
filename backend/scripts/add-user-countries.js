const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function addUserCountriesTable() {
  try {
    console.log('🔄 Adding user_countries table...');

    const createTableSQL = `
      -- Add user_countries table for many-to-many relationship
      CREATE TABLE IF NOT EXISTS user_countries (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, country_id)
      );

      -- Create index for better performance
      CREATE INDEX IF NOT EXISTS idx_user_countries_user_id ON user_countries(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_countries_country_id ON user_countries(country_id);
    `;

    await pool.query(createTableSQL);
    console.log('✅ user_countries table created successfully!');

    console.log('\n📋 Now you can:');
    console.log('   - Assign countries to users (except ADMIN users)');
    console.log('   - ADMIN users will have access to all countries automatically');
    console.log('   - Regular users will be filtered by their assigned countries');

  } catch (error) {
    console.error('❌ Error creating user_countries table:', error.message);
  } finally {
    await pool.end();
  }
}

addUserCountriesTable();