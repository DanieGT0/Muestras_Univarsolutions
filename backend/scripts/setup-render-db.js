const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Use Render database URL
const pool = new Pool({
  connectionString: 'postgresql://muestras_db_user:CFXNetaFqTFJmXI0hCZoEtjOAggyPajw@dpg-d38c2sffte5s73bv4lq0-a.oregon-postgres.render.com/muestras_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuración de base de datos de Render...\n');

    // Step 1: Run migrations
    console.log('📋 Paso 1: Ejecutando migraciones...');

    const migrationPath = path.join(__dirname, '../src/migrations/createTables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✅ Migraciones ejecutadas exitosamente');

    // Step 2: Create basic configuration data
    console.log('\n🔧 Paso 2: Creando datos básicos de configuración...');

    const countryCount = await pool.query('SELECT COUNT(*) FROM countries');

    if (parseInt(countryCount.rows[0].count) === 0) {
      // Insert basic countries
      await pool.query(`
        INSERT INTO countries (cod, name) VALUES
        ('US', 'United States'),
        ('CA', 'Canada'),
        ('MX', 'Mexico'),
        ('BR', 'Brazil'),
        ('AR', 'Argentina'),
        ('CO', 'Colombia'),
        ('PE', 'Peru'),
        ('EC', 'Ecuador')
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

      console.log('✅ Datos básicos de configuración creados');
    } else {
      console.log('✅ Datos de configuración ya existen');
    }

    // Step 3: Create admin user
    console.log('\n👤 Paso 3: Configurando usuario administrador...');

    // Check if admin user exists
    const adminExists = await pool.query(`
      SELECT id, email, full_name, role
      FROM users
      WHERE email = 'admin@univarsolutions.com'
    `);

    if (adminExists.rows.length === 0) {
      console.log('🔧 Creando usuario admin@univarsolutions.com...');

      const hashedPassword = await bcrypt.hash('univar25@@', 10);

      const newAdmin = await pool.query(`
        INSERT INTO users (email, full_name, hashed_password, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, full_name, role
      `, [
        'admin@univarsolutions.com',
        'Administrator UnivarSolutions',
        hashedPassword,
        'ADMIN',
        true
      ]);

      console.log('✅ Usuario admin creado exitosamente:');
      console.log(`   📧 Email: admin@univarsolutions.com`);
      console.log(`   🔑 Password: univar25@@`);
      console.log(`   👤 Nombre: Administrator UnivarSolutions`);
      console.log(`   🎯 Rol: ADMIN`);

      // Assign all countries to admin user if user_countries table exists
      const userCountriesExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'user_countries'
        );
      `);

      if (userCountriesExists.rows[0].exists) {
        console.log('🌍 Asignando todos los países al usuario admin...');

        await pool.query(`
          INSERT INTO user_countries (user_id, country_id)
          SELECT $1, id FROM countries
          ON CONFLICT DO NOTHING
        `, [newAdmin.rows[0].id]);

        console.log('✅ Países asignados al usuario admin');
      }

    } else {
      console.log('✅ Usuario admin@univarsolutions.com ya existe:');
      console.log(`   👤 Nombre: ${adminExists.rows[0].full_name}`);
      console.log(`   🎯 Rol: ${adminExists.rows[0].role}`);
    }

    // Step 4: Show final summary
    console.log('\n📊 Resumen final:');

    const summary = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') as admin_users,
        (SELECT COUNT(*) FROM countries) as total_countries,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM suppliers) as total_suppliers,
        (SELECT COUNT(*) FROM warehouses) as total_warehouses
    `);

    const stats = summary.rows[0];
    console.log(`   👥 Usuarios totales: ${stats.total_users}`);
    console.log(`   🔑 Usuarios admin: ${stats.admin_users}`);
    console.log(`   🌍 Países: ${stats.total_countries}`);
    console.log(`   📂 Categorías: ${stats.total_categories}`);
    console.log(`   🏭 Proveedores: ${stats.total_suppliers}`);
    console.log(`   🏪 Bodegas: ${stats.total_warehouses}`);

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\n🔐 Credenciales de acceso:');
    console.log('   📧 Email: admin@univarsolutions.com');
    console.log('   🔑 Password: univar25@@');
    console.log('\n🌐 Ahora puedes hacer login en:');
    console.log('   https://muestras-univarsolutions-frontend.onrender.com');

  } catch (error) {
    console.error('❌ Error en la configuración:', error.message);
    console.error('📋 Detalles:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();