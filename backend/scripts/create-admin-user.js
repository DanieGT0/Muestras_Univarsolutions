const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Use Render database URL
const pool = new Pool({
  connectionString: 'postgresql://muestras_db_user:CFXNetaFqTFJmXI0hCZoEtjOAggyPajw@dpg-d38c2sffte5s73bv4lq0-a.oregon-postgres.render.com/muestras_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminUser() {
  try {
    console.log('🔍 Conectando a la base de datos de Render...\n');

    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla users no existe. Ejecuta las migraciones primero.');
      return;
    }

    // Check current users
    const users = await pool.query(`
      SELECT id, email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at
    `);

    console.log('👥 Usuarios actuales en la base de datos:');
    if (users.rows.length === 0) {
      console.log('   (No hay usuarios)');
    } else {
      users.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.full_name || 'Sin nombre'}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Rol: ${user.role}`);
        console.log(`   ✅ Activo: ${user.is_active ? 'Sí' : 'No'}`);
      });
    }

    // Check if admin@univarsolutions.com exists
    const adminExists = users.rows.find(user => user.email === 'admin@univarsolutions.com');

    if (adminExists) {
      console.log('\n✅ El usuario admin@univarsolutions.com ya existe');
      console.log(`   Rol: ${adminExists.role}`);
      console.log(`   Activo: ${adminExists.is_active}`);
    } else {
      console.log('\n🔧 Creando usuario admin@univarsolutions.com...');

      // Hash the password
      const hashedPassword = await bcrypt.hash('univar25@@', 10);

      // Create admin user
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
      console.log(`   📋 ID: ${newAdmin.rows[0].id}`);
    }

    // Check if we need to create countries relationship
    const countriesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_countries'
      );
    `);

    if (countriesCheck.rows[0].exists) {
      console.log('\n🌍 Verificando relación con países...');

      const userCountries = await pool.query(`
        SELECT uc.*, c.name as country_name
        FROM user_countries uc
        JOIN countries c ON uc.country_id = c.id
        WHERE uc.user_id = (SELECT id FROM users WHERE email = 'admin@univarsolutions.com')
      `);

      if (userCountries.rows.length === 0) {
        console.log('⚠️  El usuario admin no tiene países asignados');

        // Get available countries
        const countries = await pool.query('SELECT id, name FROM countries ORDER BY name');

        if (countries.rows.length > 0) {
          console.log('📍 Países disponibles:');
          countries.rows.forEach(country => {
            console.log(`   - ${country.name} (ID: ${country.id})`);
          });

          console.log('\n💡 Puedes asignar países al usuario admin usando:');
          console.log('   INSERT INTO user_countries (user_id, country_id) VALUES');
          console.log('   ((SELECT id FROM users WHERE email = \'admin@univarsolutions.com\'), COUNTRY_ID);');
        }
      } else {
        console.log('✅ Usuario admin tiene países asignados:');
        userCountries.rows.forEach(uc => {
          console.log(`   - ${uc.country_name}`);
        });
      }
    }

    console.log('\n🎉 Proceso completado. Ahora puedes hacer login con:');
    console.log('   📧 Email: admin@univarsolutions.com');
    console.log('   🔑 Password: univar25@@');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Details:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();