import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { EstadoTransfer } from '../types';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { getErrorMessage, AppError, ValidationError } from '../utils/errorHandler';

// Validation middleware
export const createTransferValidation = [
  body('muestra_origen_id').isInt({ min: 1 }).withMessage('Origin sample ID is required'),
  body('cantidad_trasladada').isFloat({ min: 0.01 }).withMessage('Transfer quantity must be greater than 0'),
  body('pais_destino_id').isInt({ min: 1 }).withMessage('Destination country ID is required'),
  body('motivo').isLength({ min: 1, max: 255 }).withMessage('Reason is required'),
  body('comentarios_traslado').optional().isLength({ max: 500 }).withMessage('Comments too long')
];

export const updateTransferValidation = [
  body('estado').isIn(Object.values(EstadoTransfer)).withMessage('Invalid transfer status'),
  body('comentarios_traslado').optional().isLength({ max: 500 }).withMessage('Comments too long'),
  // Conditional validation: these fields are required only when approving (COMPLETADO)
  body('bodega_destino_id').if(body('estado').equals('COMPLETADO')).isInt({ min: 1 }).withMessage('Destination warehouse ID is required when approving'),
  body('ubicacion_destino_id').if(body('estado').equals('COMPLETADO')).isInt({ min: 1 }).withMessage('Destination location ID is required when approving'),
  body('responsable_destino_id').if(body('estado').equals('COMPLETADO')).isInt({ min: 1 }).withMessage('Destination responsible ID is required when approving')
];

// Generate unique transfer code with format SV + YYMMDD + NNN
async function generateTransferCode(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2); // Últimos 2 dígitos del año
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const dateStr = `${day}${month}${year}`; // DDMMYY format
  const codePrefix = `SV${dateStr}`;

  const codeQuery = 'SELECT COUNT(*) as count FROM transfers WHERE codigo_generado LIKE $1';
  const codeResult = await pool.query(codeQuery, [`${codePrefix}%`]);
  const codeNumber = parseInt(codeResult.rows[0].count) + 1;

  return `${codePrefix}${codeNumber.toString().padStart(3, '0')}`;
}

// Generate sample code for destination country
// Format: SV170925001 (SV=country, 17=day, 09=month, 25=year, 001=correlative)
async function generateSampleCode(countryId: number, client: any): Promise<string> {
  // Get country code
  const countryQuery = 'SELECT cod FROM countries WHERE id = $1';
  const countryResult = await client.query(countryQuery, [countryId]);

  if (countryResult.rows.length === 0) {
    throw new ValidationError('Country not found');
  }

  const countryCode = countryResult.rows[0].cod;
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2); // 25
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // 09
  const day = today.getDate().toString().padStart(2, '0'); // 17
  const dateStr = `${day}${month}${year}`; // 170925
  const codePrefix = `${countryCode}${dateStr}`; // SV170925

  // Get next correlative number for this country and date
  const codeQuery = 'SELECT COUNT(*) as count FROM muestras WHERE cod LIKE $1';
  const codeResult = await client.query(codeQuery, [`${codePrefix}%`]);
  const codeNumber = parseInt(codeResult.rows[0].count) + 1;

  return `${codePrefix}${codeNumber.toString().padStart(3, '0')}`; // SV170925001
}

// Get transfers with pagination
export const getTransfers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pagination = getPaginationParams({
      page: parseInt(req.query.page as string),
      limit: parseInt(req.query.limit as string)
    });

    // Filters
    const estado = req.query.estado as EstadoTransfer;
    const paisDestinoId = req.query.pais_destino_id ? parseInt(req.query.pais_destino_id as string) : null;
    const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : null;
    const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : null;
    const codigoGenerado = req.query.codigo_generado as string;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Filter by user's assigned countries (origin or destination)
    // User can see transfers where:
    // 1. Origin sample's country is one of their assigned countries (they sent it)
    // 2. Destination country is one of their assigned countries (they should receive it)
    if (req.user?.role !== 'ADMIN') {
      conditions.push(`
        (s_origen.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $${++paramCount}
        ) OR t.pais_destino_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $${++paramCount}
        ))
      `);
      values.push(req.user!.id, req.user!.id);
    }

    if (estado) {
      conditions.push(`t.estado = $${++paramCount}`);
      values.push(estado);
    }

    if (paisDestinoId) {
      conditions.push(`t.pais_destino_id = $${++paramCount}`);
      values.push(paisDestinoId);
    }

    if (dateFrom) {
      conditions.push(`t.fecha_envio >= $${++paramCount}`);
      values.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`t.fecha_envio <= $${++paramCount}`);
      values.push(dateTo);
    }

    if (codigoGenerado) {
      conditions.push(`t.codigo_generado ILIKE $${++paramCount}`);
      values.push(`%${codigoGenerado}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*)
      FROM transfers t
      LEFT JOIN muestras s_origen ON t.muestra_origen_id = s_origen.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT
        t.*,
        s_origen.cod as origen_sample_cod,
        s_origen.material as origen_material,
        s_origen.lote as origen_lote,
        s_destino.cod as destino_sample_cod,
        s_destino.material as destino_material,
        s_destino.lote as destino_lote,
        c_origen.cod as pais_origen_cod,
        c_origen.name as pais_origen_name,
        c_destino.cod as pais_destino_cod,
        c_destino.name as pais_destino_name,
        w_origen.cod as bodega_origen_cod,
        w_origen.name as bodega_origen_name,
        l_origen.cod as ubicacion_origen_cod,
        l_origen.name as ubicacion_origen_name,
        w_destino.cod as bodega_destino_cod,
        w_destino.name as bodega_destino_name,
        l_destino.cod as ubicacion_destino_cod,
        l_destino.name as ubicacion_destino_name,
        u_origen.email as usuario_origen_email,
        u_origen.full_name as usuario_origen_nombre,
        u_destino.email as usuario_destino_email,
        u_destino.full_name as usuario_destino_nombre
      FROM transfers t
      LEFT JOIN muestras s_origen ON t.muestra_origen_id = s_origen.id
      LEFT JOIN muestras s_destino ON t.muestra_destino_id = s_destino.id
      LEFT JOIN countries c_origen ON s_origen.pais_id = c_origen.id
      LEFT JOIN countries c_destino ON t.pais_destino_id = c_destino.id
      LEFT JOIN warehouses w_origen ON s_origen.bodega_id = w_origen.id
      LEFT JOIN locations l_origen ON s_origen.ubicacion_id = l_origen.id
      LEFT JOIN warehouses w_destino ON s_destino.bodega_id = w_destino.id
      LEFT JOIN locations l_destino ON s_destino.ubicacion_id = l_destino.id
      LEFT JOIN users u_origen ON t.usuario_origen_id = u_origen.id
      LEFT JOIN users u_destino ON t.usuario_destino_id = u_destino.id
      ${whereClause}
      ORDER BY t.fecha_envio DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const dataValues = [...values, pagination.limit, pagination.offset];
    const dataResult = await pool.query(dataQuery, dataValues);

    const transfers = dataResult.rows.map(row => ({
      id: row.id,
      muestra_origen_id: row.muestra_origen_id,
      muestra_destino_id: row.muestra_destino_id,
      cantidad_trasladada: parseFloat(row.cantidad_trasladada),
      cantidad: parseFloat(row.cantidad_trasladada), // Para compatibilidad frontend
      pais_destino_id: row.pais_destino_id,
      codigo_generado: row.codigo_generado,
      motivo: row.motivo,
      comentarios_traslado: row.comentarios_traslado,
      comentarios: row.comentarios_traslado, // Para compatibilidad frontend
      estado: row.estado,
      fecha_solicitud: row.fecha_envio, // Frontend usa fecha_solicitud
      fecha_envio: row.fecha_envio,
      fecha_recepcion: row.fecha_recepcion,
      usuario_origen_id: row.usuario_origen_id,
      usuario_destino_id: row.usuario_destino_id,
      muestra: row.origen_sample_cod ? {
        id: row.muestra_origen_id,
        cod: row.origen_sample_cod,
        material: row.origen_material,
        lote: row.origen_lote
      } : null, // Para compatibilidad frontend
      muestra_origen: row.origen_sample_cod ? {
        id: row.muestra_origen_id,
        cod: row.origen_sample_cod,
        material: row.origen_material,
        lote: row.origen_lote
      } : null,
      muestra_destino: row.destino_sample_cod ? {
        id: row.muestra_destino_id,
        cod: row.destino_sample_cod,
        material: row.destino_material,
        lote: row.destino_lote
      } : null,
      pais_destino: row.pais_destino_cod ? {
        id: row.pais_destino_id,
        cod: row.pais_destino_cod,
        name: row.pais_destino_name
      } : null,
      // Para compatibilidad con frontend - Origen muestra país y bodega de la muestra origen
      bodega_origen: row.pais_origen_cod ? {
        id: row.pais_origen_id || row.muestra_origen_id,
        cod: row.pais_origen_cod,
        name: row.pais_origen_name
      } : null,
      ubicacion_origen: row.bodega_origen_cod ? {
        id: row.muestra_origen_id,
        cod: row.bodega_origen_cod,
        name: row.bodega_origen_name
      } : null,
      // Para destino muestra país de destino y bodega de destino (solo si está completado)
      bodega_destino: row.pais_destino_cod ? {
        id: row.pais_destino_id,
        cod: row.pais_destino_cod,
        name: row.pais_destino_name
      } : null,
      ubicacion_destino: row.bodega_destino_cod ? {
        id: row.muestra_destino_id,
        cod: row.bodega_destino_cod,
        name: row.bodega_destino_name
      } : null,
      usuario_origen: row.usuario_origen_email ? {
        id: row.usuario_origen_id,
        email: row.usuario_origen_email,
        nombre: row.usuario_origen_nombre
      } : null,
      usuario_destino: row.usuario_destino_email ? {
        id: row.usuario_destino_id,
        email: row.usuario_destino_email,
        nombre: row.usuario_destino_nombre
      } : null
    }));

    const result = createPaginatedResponse(transfers, total, pagination);
    res.json(result);

  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Create transfer
export const createTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      muestra_origen_id,
      cantidad_trasladada,
      pais_destino_id,
      motivo,
      comentarios_traslado
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if origin sample exists and has enough quantity
      const sampleQuery = 'SELECT * FROM muestras WHERE id = $1 FOR UPDATE';
      const sampleResult = await client.query(sampleQuery, [muestra_origen_id]);

      if (sampleResult.rows.length === 0) {
        throw new ValidationError('Origin sample not found');
      }

      const sample = sampleResult.rows[0];
      const currentQuantity = parseFloat(sample.cantidad);

      if (currentQuantity < cantidad_trasladada) {
        throw new ValidationError('Insufficient quantity in origin sample');
      }

      // Generate unique transfer code
      const codigoGenerado = await generateTransferCode();

      // Create transfer record
      const transferQuery = `
        INSERT INTO transfers (
          muestra_origen_id, cantidad_trasladada, pais_destino_id,
          codigo_generado, motivo, comentarios_traslado,
          estado, usuario_origen_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const transferResult = await client.query(transferQuery, [
        muestra_origen_id,
        cantidad_trasladada,
        pais_destino_id,
        codigoGenerado,
        motivo,
        comentarios_traslado || null,
        EstadoTransfer.ENVIADO,
        req.user!.id
      ]);

      // Update origin sample quantity (subtract transferred amount)
      const newQuantity = currentQuantity - cantidad_trasladada;
      const updateSampleQuery = 'UPDATE muestras SET cantidad = $1 WHERE id = $2';
      await client.query(updateSampleQuery, [newQuantity, muestra_origen_id]);

      // Create movement record for the transfer (SALIDA)
      const movementQuery = `
        INSERT INTO movimientos (
          sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
          cantidad_nueva, motivo, comentarios, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const movementResult = await client.query(movementQuery, [
        muestra_origen_id,
        'SALIDA',
        cantidad_trasladada,
        currentQuantity,
        newQuantity,
        `Traslado: ${motivo}`,
        `Código: ${codigoGenerado}${comentarios_traslado ? ` - ${comentarios_traslado}` : ''}`,
        req.user!.id
      ]);

      // El kardex se alimenta de la tabla movimientos, no necesitamos crear entrada separada

      await client.query('COMMIT');

      res.status(201).json({
        ...transferResult.rows[0],
        cantidad_trasladada: parseFloat(transferResult.rows[0].cantidad_trasladada)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating transfer:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      });
    }
  }
};

// Get transfer by ID
export const getTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Build WHERE conditions for access control
    let whereConditions = 't.id = $1';
    let queryParams = [id];
    let paramCount = 1;

    // Filter by user's assigned countries (unless admin)
    if (req.user?.role !== 'ADMIN') {
      whereConditions += ` AND (
        s_origen.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $${++paramCount}
        ) OR t.pais_destino_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $${++paramCount}
        )
      )`;
      queryParams.push(req.user!.id, req.user!.id);
    }

    const query = `
      SELECT
        t.*,
        s_origen.cod as origen_sample_cod,
        s_origen.material as origen_material,
        s_origen.lote as origen_lote,
        s_destino.cod as destino_sample_cod,
        s_destino.material as destino_material,
        s_destino.lote as destino_lote,
        c_destino.cod as pais_destino_cod,
        c_destino.name as pais_destino_name,
        w_origen.cod as bodega_origen_cod,
        w_origen.name as bodega_origen_name,
        l_origen.cod as ubicacion_origen_cod,
        l_origen.name as ubicacion_origen_name,
        u_origen.email as usuario_origen_email,
        u_origen.full_name as usuario_origen_nombre,
        u_destino.email as usuario_destino_email,
        u_destino.full_name as usuario_destino_nombre
      FROM transfers t
      LEFT JOIN muestras s_origen ON t.muestra_origen_id = s_origen.id
      LEFT JOIN muestras s_destino ON t.muestra_destino_id = s_destino.id
      LEFT JOIN countries c_destino ON t.pais_destino_id = c_destino.id
      LEFT JOIN warehouses w_origen ON s_origen.bodega_id = w_origen.id
      LEFT JOIN locations l_origen ON s_origen.ubicacion_id = l_origen.id
      LEFT JOIN users u_origen ON t.usuario_origen_id = u_origen.id
      LEFT JOIN users u_destino ON t.usuario_destino_id = u_destino.id
      WHERE ${whereConditions}
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Transfer not found' });
      return;
    }

    const row = result.rows[0];
    const transfer = {
      id: row.id,
      muestra_origen_id: row.muestra_origen_id,
      muestra_destino_id: row.muestra_destino_id,
      cantidad_trasladada: parseFloat(row.cantidad_trasladada),
      pais_destino_id: row.pais_destino_id,
      codigo_generado: row.codigo_generado,
      motivo: row.motivo,
      comentarios_traslado: row.comentarios_traslado,
      estado: row.estado,
      fecha_envio: row.fecha_envio,
      fecha_recepcion: row.fecha_recepcion,
      usuario_origen_id: row.usuario_origen_id,
      usuario_destino_id: row.usuario_destino_id,
      muestra_origen: row.origen_sample_cod ? {
        id: row.muestra_origen_id,
        cod: row.origen_sample_cod,
        material: row.origen_material,
        lote: row.origen_lote
      } : null,
      muestra_destino: row.destino_sample_cod ? {
        id: row.muestra_destino_id,
        cod: row.destino_sample_cod,
        material: row.destino_material,
        lote: row.destino_lote
      } : null,
      pais_destino: row.pais_destino_cod ? {
        id: row.pais_destino_id,
        cod: row.pais_destino_cod,
        name: row.pais_destino_name
      } : null,
      usuario_origen: row.usuario_origen_email ? {
        id: row.usuario_origen_id,
        email: row.usuario_origen_email,
        nombre: row.usuario_origen_nombre
      } : null,
      usuario_destino: row.usuario_destino_email ? {
        id: row.usuario_destino_id,
        email: row.usuario_destino_email,
        nombre: row.usuario_destino_nombre
      } : null
    };

    res.json(transfer);

  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Update transfer status (receive/reject)
export const updateTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const {
      estado,
      comentarios_traslado,
      bodega_destino_id,
      ubicacion_destino_id,
      responsable_destino_id
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current transfer with origin sample data
      const transferQuery = `
        SELECT t.*,
               s_origen.cod as origen_cod,
               s_origen.material as origen_material,
               s_origen.lote as origen_lote,
               s_origen.peso_unitario as origen_peso_unitario,
               s_origen.unidad_medida as origen_unidad_medida,
               s_origen.fecha_vencimiento as origen_fecha_vencimiento,
               s_origen.categoria_id as origen_categoria_id,
               s_origen.proveedor_id as origen_proveedor_id
        FROM transfers t
        JOIN muestras s_origen ON t.muestra_origen_id = s_origen.id
        WHERE t.id = $1 FOR UPDATE
      `;
      const transferResult = await client.query(transferQuery, [id]);

      if (transferResult.rows.length === 0) {
        throw new ValidationError('Transfer not found');
      }

      const transfer = transferResult.rows[0];

      if (transfer.estado !== EstadoTransfer.ENVIADO) {
        throw new ValidationError('Transfer cannot be modified in current state');
      }

      // If approving (COMPLETADO), validate required fields
      if (estado === EstadoTransfer.COMPLETADO) {
        if (!bodega_destino_id || !ubicacion_destino_id || !responsable_destino_id) {
          throw new ValidationError('Warehouse, location, and responsible are required when approving transfer');
        }

        // Generate new sample code for destination country
        const newSampleCode = await generateSampleCode(transfer.pais_destino_id, client);

        // Calculate peso_total
        const pesoTotal = transfer.cantidad_trasladada * transfer.origen_peso_unitario;

        // Create new sample in destination country
        const createSampleQuery = `
          INSERT INTO muestras (
            cod, material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
            fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
            bodega_id, ubicacion_id, responsable_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `;

        const sampleResult = await client.query(createSampleQuery, [
          newSampleCode,
          transfer.origen_material,
          transfer.origen_lote,
          transfer.cantidad_trasladada,
          transfer.origen_peso_unitario,
          transfer.origen_unidad_medida,
          pesoTotal,
          transfer.origen_fecha_vencimiento,
          `Muestra recibida por traslado: ${transfer.codigo_generado}${comentarios_traslado ? ` - ${comentarios_traslado}` : ''}`,
          transfer.pais_destino_id,
          transfer.origen_categoria_id,
          transfer.origen_proveedor_id,
          bodega_destino_id,
          ubicacion_destino_id,
          responsable_destino_id
        ]);

        const newSampleId = sampleResult.rows[0].id;

        // Create movement record for destination (ENTRADA)
        const movementDestinoQuery = `
          INSERT INTO movimientos (
            sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
            cantidad_nueva, motivo, comentarios, usuario_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await client.query(movementDestinoQuery, [
          newSampleId,
          'ENTRADA',
          transfer.cantidad_trasladada,
          0, // Previous quantity is 0 for new sample
          transfer.cantidad_trasladada,
          `Traslado recibido: ${transfer.motivo}`,
          `Código: ${transfer.codigo_generado}${comentarios_traslado ? ` - ${comentarios_traslado}` : ''}`,
          req.user!.id
        ]);

        // Update transfer with destination sample and approval data
        const updateTransferQuery = `
          UPDATE transfers
          SET estado = $1,
              fecha_recepcion = CURRENT_TIMESTAMP,
              usuario_destino_id = $2,
              muestra_destino_id = $3,
              comentarios_traslado = $4
          WHERE id = $5
          RETURNING *
        `;

        const updateResult = await client.query(updateTransferQuery, [
          EstadoTransfer.COMPLETADO,
          req.user!.id,
          newSampleId,
          comentarios_traslado || null,
          id
        ]);

        await client.query('COMMIT');

        res.json({
          ...updateResult.rows[0],
          cantidad_trasladada: parseFloat(updateResult.rows[0].cantidad_trasladada),
          muestra_destino: {
            id: newSampleId,
            cod: newSampleCode,
            material: transfer.origen_material,
            lote: transfer.origen_lote
          }
        });

      } else {
        // Rejecting transfer (RECHAZADO)
        const updateTransferQuery = `
          UPDATE transfers
          SET estado = $1,
              fecha_recepcion = CURRENT_TIMESTAMP,
              usuario_destino_id = $2,
              comentarios_traslado = $3
          WHERE id = $4
          RETURNING *
        `;

        const updateResult = await client.query(updateTransferQuery, [
          estado,
          req.user!.id,
          comentarios_traslado || 'Traslado rechazado',
          id
        ]);

        // When rejecting, we need to restore the quantity to the origin sample
        if (estado === EstadoTransfer.RECHAZADO) {
          const restoreQuantityQuery = `
            UPDATE muestras
            SET cantidad = cantidad + $1
            WHERE id = $2
          `;
          await client.query(restoreQuantityQuery, [transfer.cantidad_trasladada, transfer.muestra_origen_id]);

          // Create a movement record to reflect the restoration
          const restoreMovementQuery = `
            INSERT INTO movimientos (
              sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
              cantidad_nueva, motivo, comentarios, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;

          // Get current quantity after restoration
          const currentQuantityQuery = 'SELECT cantidad FROM muestras WHERE id = $1';
          const currentQuantityResult = await client.query(currentQuantityQuery, [transfer.muestra_origen_id]);
          const newQuantity = parseFloat(currentQuantityResult.rows[0].cantidad);
          const previousQuantity = newQuantity - transfer.cantidad_trasladada;

          await client.query(restoreMovementQuery, [
            transfer.muestra_origen_id,
            'ENTRADA',
            transfer.cantidad_trasladada,
            previousQuantity,
            newQuantity,
            `Traslado rechazado: ${transfer.motivo}`,
            `Código: ${transfer.codigo_generado} - Cantidad restaurada por rechazo${comentarios_traslado ? ` - ${comentarios_traslado}` : ''}`,
            req.user!.id
          ]);
        }

        await client.query('COMMIT');

        res.json({
          ...updateResult.rows[0],
          cantidad_trasladada: parseFloat(updateResult.rows[0].cantidad_trasladada)
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating transfer:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      });
    }
  }
};

// Cancel transfer (admin only)
export const cancelTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Only admins can cancel transfers
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get transfer details
      const transferQuery = 'SELECT * FROM transfers WHERE id = $1 FOR UPDATE';
      const transferResult = await client.query(transferQuery, [id]);

      if (transferResult.rows.length === 0) {
        throw new ValidationError('Transfer not found');
      }

      const transfer = transferResult.rows[0];

      if (transfer.estado !== EstadoTransfer.ENVIADO) {
        throw new ValidationError('Only pending transfers can be cancelled');
      }

      // Restore quantity to origin sample
      const restoreQuery = 'UPDATE muestras SET cantidad = cantidad + $1 WHERE id = $2';
      await client.query(restoreQuery, [transfer.cantidad_trasladada, transfer.muestra_origen_id]);

      // Update transfer status
      const updateTransferQuery = `
        UPDATE transfers
        SET estado = $1, comentarios_traslado = $2
        WHERE id = $3
      `;
      await client.query(updateTransferQuery, [
        EstadoTransfer.RECHAZADO,
        'Cancelado por administrador',
        id
      ]);

      await client.query('COMMIT');

      res.json({ message: 'Transfer cancelled successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error cancelling transfer:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      });
    }
  }
};

// Delete transfer (only COMPLETADO or RECHAZADO transfers can be deleted)
export const deleteTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Only admins can delete transfers
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    // Get transfer details first
    const transferQuery = 'SELECT * FROM transfers WHERE id = $1';
    const transferResult = await pool.query(transferQuery, [id]);

    if (transferResult.rows.length === 0) {
      res.status(404).json({ message: 'Transfer not found' });
      return;
    }

    const transfer = transferResult.rows[0];

    // Only allow deletion of COMPLETADO or RECHAZADO transfers
    if (transfer.estado === EstadoTransfer.ENVIADO) {
      res.status(400).json({
        message: 'Cannot delete transfers with ENVIADO status. Use cancel instead.',
        allowedStates: ['COMPLETADO', 'RECHAZADO']
      });
      return;
    }

    // Delete the transfer
    await pool.query('DELETE FROM transfers WHERE id = $1', [id]);

    res.json({
      message: 'Transfer deleted successfully',
      deletedTransfer: {
        id: transfer.id,
        codigo_generado: transfer.codigo_generado,
        estado: transfer.estado
      }
    });

  } catch (error) {
    console.error('Error deleting transfer:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
      });
    }
  }
};