const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...\n');

    const users = await pool.query(`
      SELECT id, email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at
    `);

    if (users.rows.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      return;
    }

    console.log('👥 Usuarios encontrados:');
    users.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.full_name || 'Sin nombre'}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Rol: ${user.role}`);
      console.log(`   ✅ Activo: ${user.is_active ? 'Sí' : 'No'}`);
      console.log(`   📅 Creado: ${user.created_at}`);
    });

    // Verificar si existe el admin
    const adminUser = users.rows.find(user => user.email === 'admin@samples.com');

    if (adminUser) {
      console.log('\n🔑 Usuario admin encontrado:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Nombre: ${adminUser.full_name}`);
      console.log(`   Rol: ${adminUser.role}`);
      console.log(`   Activo: ${adminUser.is_active}`);
    } else {
      console.log('\n❌ No se encontró usuario admin@samples.com');
      console.log('💡 Creando usuario admin...');

      // Crear usuario admin
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const newAdmin = await pool.query(`
        INSERT INTO users (email, full_name, hashed_password, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, full_name, role
      `, ['admin@samples.com', 'Administrator', hashedPassword, 'ADMIN', true]);

      console.log('✅ Usuario admin creado:');
      console.log(`   Email: admin@samples.com`);
      console.log(`   Password: admin123`);
      console.log(`   Nombre: Administrator`);
      console.log(`   Rol: ADMIN`);
    }

    // Mostrar contraseñas para testing (solo para desarrollo)
    console.log('\n🔐 Información de testing:');
    console.log('Para probar credenciales, usa:');

    for (const user of users.rows) {
      if (user.email.includes('daniel') || user.email.includes('christopher')) {
        console.log(`   ${user.email} - Contraseña original del usuario`);
      }
    }

    if (adminUser) {
      console.log('   admin@samples.com - Contraseña desconocida (revisar script de creación)');
    } else {
      console.log('   admin@samples.com - Password: admin123 (recién creado)');
    }

  } catch (error) {
    console.error('❌ Error verificando usuarios:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();