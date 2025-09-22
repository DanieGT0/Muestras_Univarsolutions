import pool from '../config/database';

async function createTrasladosTable() {
  try {
    console.log('🔄 Creating traslados table...');

    const createTableSQL = `
      -- Transfers table (traslados)
      CREATE TABLE IF NOT EXISTS traslados (
          id SERIAL PRIMARY KEY,
          muestra_origen_id INTEGER NOT NULL REFERENCES muestras(id),
          muestra_destino_id INTEGER REFERENCES muestras(id),
          cantidad_trasladada DECIMAL(10,3) NOT NULL,
          pais_destino_id INTEGER NOT NULL REFERENCES countries(id),
          codigo_generado VARCHAR(50) UNIQUE NOT NULL,
          motivo VARCHAR(255) NOT NULL,
          comentarios_traslado TEXT,
          estado VARCHAR(20) DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO', 'COMPLETADO', 'RECHAZADO')),
          fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fecha_recepcion TIMESTAMP WITH TIME ZONE,
          usuario_origen_id UUID NOT NULL REFERENCES users(id),
          usuario_destino_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for traslados table
      CREATE INDEX IF NOT EXISTS idx_traslados_origen ON traslados(muestra_origen_id);
      CREATE INDEX IF NOT EXISTS idx_traslados_destino ON traslados(muestra_destino_id);
      CREATE INDEX IF NOT EXISTS idx_traslados_codigo ON traslados(codigo_generado);
      CREATE INDEX IF NOT EXISTS idx_traslados_estado ON traslados(estado);
      CREATE INDEX IF NOT EXISTS idx_traslados_fecha_envio ON traslados(fecha_envio);
    `;

    // Execute the SQL
    await pool.query(createTableSQL);

    console.log('✅ Traslados table created successfully');
    console.log('📋 Table structure:');
    console.log('   - id: Serial primary key');
    console.log('   - muestra_origen_id: Reference to source sample');
    console.log('   - cantidad_trasladada: Transfer quantity');
    console.log('   - pais_destino_id: Destination country');
    console.log('   - codigo_generado: Unique code (SV + DDMMYY + NNN format)');
    console.log('   - motivo: Transfer reason');
    console.log('   - estado: ENVIADO/COMPLETADO/RECHAZADO');
    console.log('   - fecha_envio/fecha_recepcion: Send/receive dates');
    console.log('   - usuario_origen_id/usuario_destino_id: Users involved');

    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to create traslados table:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createTrasladosTable();
}

export { createTrasladosTable };