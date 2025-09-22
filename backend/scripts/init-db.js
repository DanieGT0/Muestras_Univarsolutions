const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Creating tables...');
    await pool.query(schemaSql);

    // Read and execute seed.sql
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('🌱 Seeding initial data...');
    await pool.query(seedSql);

    console.log('✅ Database initialized successfully!');
    console.log('\n🔑 Admin credentials:');
    console.log('   Email: admin@sample.com');
    console.log('   Password: admin123');
    console.log('\n👤 User credentials:');
    console.log('   Email: user@sample.com');
    console.log('   Password: user123');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Database already initialized, trying to add users...');

      try {
        // Try to insert just the users
        const seedPath = path.join(__dirname, '../database/seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        // Extract only the user insert statements
        const userInserts = seedSql
          .split('\n')
          .filter(line => line.includes("INSERT INTO users"))
          .join('\n');

        if (userInserts) {
          await pool.query(userInserts);
          console.log('✅ Users added successfully!');
        }

        console.log('\n🔑 Admin credentials:');
        console.log('   Email: admin@sample.com');
        console.log('   Password: admin123');

      } catch (userError) {
        if (userError.message.includes('duplicate key')) {
          console.log('ℹ️  Users already exist!');
          console.log('\n🔑 Admin credentials:');
          console.log('   Email: admin@sample.com');
          console.log('   Password: admin123');
        } else {
          console.error('❌ Error adding users:', userError.message);
        }
      }
    } else {
      console.error('❌ Error initializing database:', error.message);
    }
  } finally {
    await pool.end();
  }
}

initDatabase();