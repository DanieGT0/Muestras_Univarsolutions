const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api';

async function testCountriesAPI() {
  try {
    console.log('🧪 Testing Countries API with different users...\n');

    // Usuarios de prueba
    const users = [
      {
        name: 'Ariel Cortes',
        email: 'ariel.cortes@univarsolutions.com',
        password: 'password123', // Ajustar si es diferente
        expectedCountries: ['Costa Rica', 'Panama', 'República Dominicana']
      },
      {
        name: 'Daniel Gomez',
        email: 'daniel.gomez@univarsolutions.com',
        password: 'password123', // Ajustar si es diferente
        expectedCountries: ['El Salvador']
      },
      {
        name: 'Admin',
        email: 'admin@samples.com',
        password: 'admin123',
        expectedCountries: ['ALL'] // Admin ve todos
      }
    ];

    for (const user of users) {
      console.log(`🔐 Testing with ${user.name} (${user.email})`);
      console.log('=====================================');

      try {
        // 1. Login
        console.log('1. Attempting login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: user.email,
          password: user.password
        });

        const token = loginResponse.data.token;
        console.log('   ✅ Login successful');

        // 2. Get countries
        console.log('2. Fetching countries...');
        const countriesResponse = await axios.get(`${API_BASE}/countries`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const countries = countriesResponse.data.data;
        console.log(`   ✅ Countries received: ${countries.length}`);

        countries.forEach(country => {
          console.log(`      • ${country.name} (${country.cod})`);
        });

        // 3. Verificar si los países son los esperados
        if (user.expectedCountries[0] === 'ALL') {
          console.log('   ✅ Admin - Should see all countries');
        } else {
          const countryNames = countries.map(c => c.name);
          const hasExpectedCountries = user.expectedCountries.every(expected =>
            countryNames.includes(expected)
          );

          if (hasExpectedCountries && countryNames.length === user.expectedCountries.length) {
            console.log('   ✅ Countries match expected list');
          } else {
            console.log('   ❌ Countries DO NOT match expected list');
            console.log(`   Expected: ${user.expectedCountries.join(', ')}`);
            console.log(`   Received: ${countryNames.join(', ')}`);
          }
        }

      } catch (error) {
        console.log('   ❌ Error:');
        if (error.response) {
          console.log(`      Status: ${error.response.status}`);
          console.log(`      Message: ${error.response.data.message || error.response.data}`);
        } else {
          console.log(`      ${error.message}`);
        }
      }

      console.log('');
    }

    console.log('🏁 Test completed');

  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testCountriesAPI();