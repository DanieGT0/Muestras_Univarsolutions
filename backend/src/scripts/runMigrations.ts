import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/createTables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Database migrations completed successfully');

    // Check if we have any sample data, if not, create some basic config data
    await createBasicData();

    console.log('✅ Database setup completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createBasicData() {
  try {
    // Check if we have basic configuration data
    const countryCount = await pool.query('SELECT COUNT(*) FROM countries');

    if (parseInt(countryCount.rows[0].count) === 0) {
      console.log('🔄 Creating basic configuration data...');

      // Insert basic countries
      await pool.query(`
        INSERT INTO countries (cod, name) VALUES
        ('US', 'United States'),
        ('CA', 'Canada'),
        ('MX', 'Mexico'),
        ('BR', 'Brazil'),
        ('AR', 'Argentina')
        ON CONFLICT (cod) DO NOTHING
      `);

      // Insert basic categories
      await pool.query(`
        INSERT INTO categories (cod, name) VALUES
        ('QUI', 'Químicos'),
        ('BIO', 'Biológicos'),
        ('FAR', 'Farmacéuticos'),
        ('ALI', 'Alimentarios'),
        ('IND', 'Industriales')
        ON CONFLICT (cod) DO NOTHING
      `);

      // Insert basic suppliers
      await pool.query(`
        INSERT INTO suppliers (cod, name) VALUES
        ('SUP001', 'Proveedor Principal'),
        ('SUP002', 'Proveedor Secundario'),
        ('SUP003', 'Proveedor Internacional'),
        ('SUP004', 'Proveedor Local'),
        ('SUP005', 'Proveedor Especializado')
        ON CONFLICT (cod) DO NOTHING
      `);

      // Insert basic warehouses
      await pool.query(`
        INSERT INTO warehouses (cod, name) VALUES
        ('BOD001', 'Bodega Principal'),
        ('BOD002', 'Bodega Secundaria'),
        ('BOD003', 'Bodega Refrigerada'),
        ('BOD004', 'Bodega de Cuarentena'),
        ('BOD005', 'Bodega de Exportación')
        ON CONFLICT (cod) DO NOTHING
      `);

      // Insert basic locations
      await pool.query(`
        INSERT INTO locations (cod, name) VALUES
        ('A01', 'Estante A - Nivel 1'),
        ('A02', 'Estante A - Nivel 2'),
        ('B01', 'Estante B - Nivel 1'),
        ('B02', 'Estante B - Nivel 2'),
        ('C01', 'Estante C - Nivel 1')
        ON CONFLICT (cod) DO NOTHING
      `);

      // Insert basic responsibles
      await pool.query(`
        INSERT INTO responsibles (cod, name) VALUES
        ('RES001', 'Juan Pérez'),
        ('RES002', 'María García'),
        ('RES003', 'Carlos López'),
        ('RES004', 'Ana Martínez'),
        ('RES005', 'Luis Rodríguez')
        ON CONFLICT (cod) DO NOTHING
      `);

      console.log('✅ Basic configuration data created');
    }

    // Check if we have an admin user
    const userCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'");

    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('🔄 Creating default admin user...');

      // Create default admin user (you should change this password!)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await pool.query(`
        INSERT INTO users (email, full_name, role, hashed_password) VALUES
        ('admin@example.com', 'System Administrator', 'ADMIN', $1)
        ON CONFLICT (email) DO NOTHING
      `, [hashedPassword]);

      console.log('✅ Default admin user created: admin@example.com / admin123');
      console.log('⚠️  Please change the default password after first login!');
    }

  } catch (error) {
    console.error('Warning: Could not create basic data:', error);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };