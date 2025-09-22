const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function debugCountriesAPI() {
  try {
    console.log('🐛 Debugging Countries API - Verificando consultas...\n');

    // Obtener usuario Ariel
    const arielQuery = `
      SELECT id, full_name, email, role
      FROM users
      WHERE email = 'ariel.cortes@univarsolutions.com'
    `;
    const arielResult = await pool.query(arielQuery);

    if (arielResult.rows.length === 0) {
      console.log('❌ Usuario Ariel no encontrado');
      return;
    }

    const ariel = arielResult.rows[0];
    console.log(`👤 Usuario: ${ariel.full_name} (${ariel.email})`);
    console.log(`🆔 ID: ${ariel.id}`);
    console.log(`👤 Rol: ${ariel.role}`);

    // Probar la consulta exacta del controlador para usuarios regulares
    console.log('\n🔍 Ejecutando consulta del controlador (usuario regular)...');
    const controllerQuery = `
      SELECT DISTINCT c.id, c.cod, c.name
      FROM countries c
      INNER JOIN user_countries uc ON c.id = uc.country_id
      WHERE uc.user_id = $1
      ORDER BY c.name ASC
    `;

    const controllerResult = await pool.query(controllerQuery, [ariel.id]);
    console.log(`📊 Países devueltos por consulta del controlador: ${controllerResult.rows.length}`);

    controllerResult.rows.forEach(country => {
      console.log(`   • ${country.name} (${country.cod}) - ID: ${country.id}`);
    });

    // Probar la consulta de admin para comparar
    console.log('\n🔍 Ejecutando consulta del controlador (admin)...');
    const adminQuery = 'SELECT id, cod, name FROM countries ORDER BY name ASC';
    const adminResult = await pool.query(adminQuery);
    console.log(`📊 Todos los países (admin): ${adminResult.rows.length}`);

    adminResult.rows.forEach(country => {
      console.log(`   • ${country.name} (${country.cod}) - ID: ${country.id}`);
    });

    // Verificar las relaciones user_countries para Ariel
    console.log('\n🔍 Verificando relaciones user_countries para Ariel...');
    const userCountriesQuery = `
      SELECT uc.user_id, uc.country_id, c.name as country_name, c.cod
      FROM user_countries uc
      JOIN countries c ON uc.country_id = c.id
      WHERE uc.user_id = $1
      ORDER BY c.name
    `;

    const userCountriesResult = await pool.query(userCountriesQuery, [ariel.id]);
    console.log(`📊 Relaciones user_countries para Ariel: ${userCountriesResult.rows.length}`);

    userCountriesResult.rows.forEach(rel => {
      console.log(`   • País ID: ${rel.country_id}, Nombre: ${rel.country_name} (${rel.cod})`);
    });

    // Verificar si hay problemas con el rol
    if (ariel.role === 'ADMIN') {
      console.log('\n⚠️  NOTA: Este usuario es ADMIN, por lo que vería todos los países');
    } else {
      console.log('\n✅ Este usuario es USER, debería ver solo los países asignados');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugCountriesAPI();