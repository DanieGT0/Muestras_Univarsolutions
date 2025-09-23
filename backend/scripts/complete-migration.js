const { Pool } = require('pg');

// Use Render database URL
const pool = new Pool({
  connectionString: 'postgresql://muestras_db_user:CFXNetaFqTFJmXI0hCZoEtjOAggyPajw@dpg-d38c2sffte5s73bv4lq0-a.oregon-postgres.render.com/muestras_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function completeMigration() {
  try {
    console.log('🔄 Completing database migration...\n');

    // 1. Create user_countries table if it doesn't exist
    console.log('📋 Creating user_countries table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_countries (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, country_id)
      );
    `);
    console.log('✅ user_countries table created');

    // 2. Create transfers view/alias for traslados
    console.log('📋 Creating transfers view...');
    await pool.query(`
      DROP VIEW IF EXISTS transfers;
      CREATE VIEW transfers AS SELECT * FROM traslados;
    `);
    console.log('✅ transfers view created');

    // 3. Verify all tables exist
    console.log('\n🔍 Verifying all tables...');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('📋 Tables found:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // 4. Check views
    const views = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Views found:');
    views.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // 5. Assign countries to admin user if not already done
    console.log('\n🌍 Assigning countries to admin user...');

    const adminUser = await pool.query(`
      SELECT id FROM users WHERE email = 'admin@univarsolutions.com'
    `);

    if (adminUser.rows.length > 0) {
      const adminId = adminUser.rows[0].id;

      // Check if admin already has countries
      const existingCountries = await pool.query(`
        SELECT COUNT(*) as count FROM user_countries WHERE user_id = $1
      `, [adminId]);

      if (parseInt(existingCountries.rows[0].count) === 0) {
        // Assign all countries to admin
        await pool.query(`
          INSERT INTO user_countries (user_id, country_id)
          SELECT $1, id FROM countries
          ON CONFLICT (user_id, country_id) DO NOTHING
        `, [adminId]);

        console.log('✅ All countries assigned to admin user');
      } else {
        console.log('✅ Admin user already has countries assigned');
      }
    }

    // 6. Test problematic queries
    console.log('\n🧪 Testing problematic queries...');

    try {
      const transfersTest = await pool.query('SELECT COUNT(*) FROM transfers');
      console.log(`✅ transfers query works: ${transfersTest.rows[0].count} records`);
    } catch (error) {
      console.log(`❌ transfers query failed: ${error.message}`);
    }

    try {
      const userCountriesTest = await pool.query('SELECT COUNT(*) FROM user_countries');
      console.log(`✅ user_countries query works: ${userCountriesTest.rows[0].count} records`);
    } catch (error) {
      console.log(`❌ user_countries query failed: ${error.message}`);
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('📋 Details:', error);
  } finally {
    await pool.end();
  }
}

completeMigration();