const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'samples_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123321',
});

async function testCountriesLogic() {
  try {
    console.log('🧪 Testing countries logic directly in database...\n');

    // Obtener Ariel Cortes
    const arielUser = await pool.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE email = 'ariel.cortes@univarsolutions.com'
    `);

    if (arielUser.rows.length === 0) {
      console.log('❌ Usuario Ariel Cortes no encontrado');
      return;
    }

    const ariel = arielUser.rows[0];
    console.log(`👤 Usuario: ${ariel.full_name}`);
    console.log(`📧 Email: ${ariel.email}`);
    console.log(`🆔 ID: ${ariel.id}`);
    console.log(`👤 Rol: ${ariel.role}`);

    // Probar la consulta que usa el controlador
    console.log('\n🔍 Probando consulta de países para usuario regular...');

    const query = `
      SELECT DISTINCT c.id, c.cod, c.name
      FROM countries c
      INNER JOIN user_countries uc ON c.id = uc.country_id
      WHERE uc.user_id = $1
      ORDER BY c.name ASC
    `;

    const result = await pool.query(query, [ariel.id]);

    console.log(`📊 Países encontrados: ${result.rows.length}`);

    if (result.rows.length === 0) {
      console.log('❌ No se encontraron países para este usuario');

      // Verificar si existe relación en user_countries
      const relationCheck = await pool.query(`
        SELECT uc.*, c.name as country_name
        FROM user_countries uc
        LEFT JOIN countries c ON uc.country_id = c.id
        WHERE uc.user_id = $1
      `, [ariel.id]);

      console.log(`\n🔍 Relaciones en user_countries: ${relationCheck.rows.length}`);
      relationCheck.rows.forEach(rel => {
        console.log(`   - País ID: ${rel.country_id}, Nombre: ${rel.country_name}`);
      });

    } else {
      console.log('✅ Países asignados:');
      result.rows.forEach(country => {
        console.log(`   • ${country.name} (${country.cod}) - ID: ${country.id}`);
      });
    }

    // Probar consulta de admin
    console.log('\n🔍 Probando consulta de países para admin...');
    const adminQuery = 'SELECT id, cod, name FROM countries ORDER BY name ASC';
    const adminResult = await pool.query(adminQuery);

    console.log(`📊 Todos los países (admin): ${adminResult.rows.length}`);
    adminResult.rows.forEach(country => {
      console.log(`   • ${country.name} (${country.cod}) - ID: ${country.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCountriesLogic();