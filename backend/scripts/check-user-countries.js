const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function checkUserCountries() {
  try {
    console.log('🔍 Verificando países asignados a usuarios...\n');

    // Consultar usuarios con sus países
    const userCountries = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        ARRAY_AGG(c.name ORDER BY c.name) as countries,
        ARRAY_AGG(c.id ORDER BY c.name) as country_ids
      FROM users u
      LEFT JOIN user_countries uc ON u.id = uc.user_id
      LEFT JOIN countries c ON uc.country_id = c.id
      GROUP BY u.id, u.full_name, u.email, u.role
      ORDER BY u.full_name
    `);

    console.log('👥 Usuarios y sus países asignados:');
    console.log('=====================================\n');

    userCountries.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name || 'Sin nombre'}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Rol: ${user.role}`);

      if (user.role === 'ADMIN') {
        console.log(`   🌍 Países: TODOS (acceso administrativo)`);
      } else {
        if (user.countries[0] === null) {
          console.log(`   ⚠️  Países: NINGUNO ASIGNADO`);
        } else {
          console.log(`   🌍 Países asignados (${user.countries.length}):`);
          user.countries.forEach((country, i) => {
            console.log(`      • ${country} (ID: ${user.country_ids[i]})`);
          });
        }
      }
      console.log('');
    });

    // Verificar usuarios específicos mencionados
    console.log('🎯 Verificación de usuarios específicos:');
    console.log('========================================\n');

    const specificUsers = [
      'ariel cortes',
      'daniel',
      'christopher'
    ];

    for (const searchName of specificUsers) {
      const user = userCountries.rows.find(u =>
        u.full_name?.toLowerCase().includes(searchName.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchName.toLowerCase())
      );

      if (user) {
        console.log(`✅ ${user.full_name}:`);
        if (user.role === 'ADMIN') {
          console.log(`   🌍 Acceso: TODOS los países (rol ADMIN)`);
        } else if (user.countries[0] === null) {
          console.log(`   ❌ Problema: No tiene países asignados`);
        } else {
          console.log(`   ✅ Países: ${user.countries.join(', ')}`);
        }
      } else {
        console.log(`❌ No encontrado: ${searchName}`);
      }
      console.log('');
    }

    // Verificar todos los países disponibles
    console.log('🌍 Todos los países disponibles:');
    console.log('===============================');
    const allCountries = await pool.query('SELECT id, name, cod FROM countries ORDER BY name');
    allCountries.rows.forEach(country => {
      console.log(`   ${country.id}. ${country.name} (${country.cod})`);
    });

  } catch (error) {
    console.error('❌ Error verificando países de usuarios:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserCountries();