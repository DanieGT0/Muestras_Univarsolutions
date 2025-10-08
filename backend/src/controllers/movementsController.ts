import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { TipoMovimiento } from '../types';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { getErrorMessage, AppError, ValidationError } from '../utils/errorHandler';

// Validation middleware
export const createMovementValidation = [
  body('sample_id').isInt({ min: 1 }).withMessage('Sample ID is required'),
  body('tipo_movimiento').isIn(Object.values(TipoMovimiento)).withMessage('Invalid movement type'),
  body('cantidad_movida').isInt({ min: 1 }).withMessage('Movement quantity must be an integer greater than 0'),
  body('motivo').isLength({ min: 1, max: 255 }).withMessage('Reason is required'),
  body('comentarios').optional().isLength({ max: 500 }).withMessage('Comments too long')
];

// Get movements statistics
export const getMovementsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let whereClause = '';
    const values: any[] = [];

    if (userRole === 'USER') {
      whereClause = 'WHERE s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      values.push(userId);
    }

    const query = `
      SELECT
        COUNT(*) as total_movimientos,
        SUM(CASE WHEN m.tipo_movimiento = 'ENTRADA' THEN 1 ELSE 0 END) as total_entradas,
        SUM(CASE WHEN m.tipo_movimiento = 'SALIDA' THEN 1 ELSE 0 END) as total_salidas
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    const stats = result.rows[0];

    res.json({
      totalMovimientos: parseInt(stats.total_movimientos) || 0,
      totalEntradas: parseInt(stats.total_entradas) || 0,
      totalSalidas: parseInt(stats.total_salidas) || 0
    });
  } catch (error) {
    console.error('Error getting movements stats:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Get movements with pagination
export const getMovements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pagination = getPaginationParams({
      page: parseInt(req.query.page as string),
      limit: parseInt(req.query.limit as string)
    });

    // Filters
    const sampleId = req.query.sample_id ? parseInt(req.query.sample_id as string) : null;
    const tipoMovimiento = req.query.tipo_movimiento as TipoMovimiento;
    const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : null;
    const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : null;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Add country filtering based on user role
    const userRole = req.user!.role;
    const userId = req.user!.id;

    if (userRole === 'USER') {
      // USER role: only see movements from their assigned countries
      conditions.push(`s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`);
      values.push(userId);
    }
    // ADMIN and COMMERCIAL can see all movements

    if (sampleId) {
      conditions.push(`m.sample_id = $${++paramCount}`);
      values.push(sampleId);
    }

    if (tipoMovimiento) {
      conditions.push(`m.tipo_movimiento = $${++paramCount}`);
      values.push(tipoMovimiento);
    }

    if (dateFrom) {
      conditions.push(`m.fecha_movimiento >= $${++paramCount}`);
      values.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`m.fecha_movimiento <= $${++paramCount}`);
      values.push(dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*)
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT
        m.*,
        s.cod as sample_cod,
        s.material as sample_material,
        s.lote as sample_lote,
        s.unidad_medida as sample_unidad_medida,
        s.pais_id as sample_pais_id,
        s.responsable_id as sample_responsable_id,
        p.name as sample_pais_name,
        r.name as sample_responsable_name,
        u.email as usuario_email,
        u.full_name as usuario_nombre
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      LEFT JOIN countries p ON s.pais_id = p.id
      LEFT JOIN responsibles r ON s.responsable_id = r.id
      ${whereClause}
      ORDER BY m.fecha_movimiento DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const dataValues = [...values, pagination.limit, pagination.offset];
    const dataResult = await pool.query(dataQuery, dataValues);

    const movements = dataResult.rows.map(row => ({
      id: row.id,
      sample_id: row.sample_id,
      tipo_movimiento: row.tipo_movimiento,
      cantidad_movida: parseInt(row.cantidad_movida),
      cantidad_anterior: parseInt(row.cantidad_anterior),
      cantidad_nueva: parseInt(row.cantidad_nueva),
      motivo: row.motivo,
      comentarios: row.comentarios,
      fecha_movimiento: row.fecha_movimiento,
      usuario_id: row.usuario_id,
      sample: row.sample_cod ? {
        id: row.sample_id,
        cod: row.sample_cod,
        material: row.sample_material,
        lote: row.sample_lote,
        unidad_medida: row.sample_unidad_medida,
        pais_id: row.sample_pais_id,
        pais_name: row.sample_pais_name,
        responsable_id: row.sample_responsable_id,
        responsable_name: row.sample_responsable_name
      } : null,
      usuario: row.usuario_email ? {
        id: row.usuario_id,
        email: row.usuario_email,
        nombre: row.usuario_nombre
      } : null
    }));

    const result = createPaginatedResponse(movements, total, pagination);
    res.json(result);

  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Create movement
export const createMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      sample_id,
      tipo_movimiento,
      cantidad_movida,
      motivo,
      comentarios
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current sample data
      const sampleQuery = 'SELECT * FROM muestras WHERE id = $1 FOR UPDATE';
      const sampleResult = await client.query(sampleQuery, [sample_id]);

      if (sampleResult.rows.length === 0) {
        throw new ValidationError('Sample not found');
      }

      const sample = sampleResult.rows[0];
      const cantidadAnterior = parseInt(sample.cantidad);

      // Calculate new quantity
      let cantidadNueva: number;
      if (tipo_movimiento === TipoMovimiento.ENTRADA) {
        cantidadNueva = cantidadAnterior + parseInt(cantidad_movida);
      } else {
        cantidadNueva = cantidadAnterior - parseInt(cantidad_movida);

        if (cantidadNueva < 0) {
          throw new ValidationError('Insufficient stock for this movement');
        }
      }

      // Create movement record
      const movementQuery = `
        INSERT INTO movimientos (
          sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
          cantidad_nueva, motivo, comentarios, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const movementResult = await client.query(movementQuery, [
        sample_id,
        tipo_movimiento,
        parseInt(cantidad_movida),
        cantidadAnterior,
        cantidadNueva,
        motivo,
        comentarios || null,
        req.user!.id
      ]);

      // Update sample quantity
      const updateSampleQuery = 'UPDATE muestras SET cantidad = $1 WHERE id = $2';
      await client.query(updateSampleQuery, [cantidadNueva, sample_id]);

      await client.query('COMMIT');

      res.status(201).json({
        ...movementResult.rows[0],
        cantidad_movida: parseInt(movementResult.rows[0].cantidad_movida),
        cantidad_anterior: parseInt(movementResult.rows[0].cantidad_anterior),
        cantidad_nueva: parseInt(movementResult.rows[0].cantidad_nueva)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating movement:', error);

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

// Get movement by ID
export const getMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let query: string;
    let queryParams: any[];

    if (userRole === 'USER') {
      // USER role: only see movements from their assigned countries
      query = `
        SELECT
          m.*,
          s.cod as sample_cod,
          s.material as sample_material,
          s.lote as sample_lote,
          s.unidad_medida as sample_unidad_medida,
          s.pais_id as sample_pais_id,
          s.responsable_id as sample_responsable_id,
          p.name as sample_pais_name,
          r.name as sample_responsable_name,
          u.email as usuario_email,
          u.full_name as usuario_nombre
        FROM movimientos m
        LEFT JOIN muestras s ON m.sample_id = s.id
        LEFT JOIN users u ON m.usuario_id = u.id
        LEFT JOIN countries p ON s.pais_id = p.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE m.id = $1 AND s.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $2
        )
      `;
      queryParams = [id, userId];
    } else {
      // ADMIN and COMMERCIAL can see any movement
      query = `
        SELECT
          m.*,
          s.cod as sample_cod,
          s.material as sample_material,
          s.lote as sample_lote,
          s.unidad_medida as sample_unidad_medida,
          s.pais_id as sample_pais_id,
          s.responsable_id as sample_responsable_id,
          p.name as sample_pais_name,
          r.name as sample_responsable_name,
          u.email as usuario_email,
          u.full_name as usuario_nombre
        FROM movimientos m
        LEFT JOIN muestras s ON m.sample_id = s.id
        LEFT JOIN users u ON m.usuario_id = u.id
        LEFT JOIN countries p ON s.pais_id = p.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE m.id = $1
      `;
      queryParams = [id];
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Movement not found' });
      return;
    }

    const row = result.rows[0];
    const movement = {
      id: row.id,
      sample_id: row.sample_id,
      tipo_movimiento: row.tipo_movimiento,
      cantidad_movida: parseInt(row.cantidad_movida),
      cantidad_anterior: parseInt(row.cantidad_anterior),
      cantidad_nueva: parseInt(row.cantidad_nueva),
      motivo: row.motivo,
      comentarios: row.comentarios,
      fecha_movimiento: row.fecha_movimiento,
      usuario_id: row.usuario_id,
      sample: row.sample_cod ? {
        id: row.sample_id,
        cod: row.sample_cod,
        material: row.sample_material,
        lote: row.sample_lote,
        unidad_medida: row.sample_unidad_medida,
        pais_id: row.sample_pais_id,
        pais_name: row.sample_pais_name,
        responsable_id: row.sample_responsable_id,
        responsable_name: row.sample_responsable_name
      } : null,
      usuario: row.usuario_email ? {
        id: row.usuario_id,
        email: row.usuario_email,
        nombre: row.usuario_nombre
      } : null
    };

    res.json(movement);

  } catch (error) {
    console.error('Error fetching movement:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Delete movement (admin and user - reverses the movement)
export const deleteMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Only admins and users can delete movements (not COMMERCIAL)
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'USER') {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get movement details
      const movementQuery = 'SELECT * FROM movimientos WHERE id = $1';
      const movementResult = await client.query(movementQuery, [id]);

      if (movementResult.rows.length === 0) {
        throw new ValidationError('Movement not found');
      }

      const movement = movementResult.rows[0];

      // Reverse the movement by updating sample quantity back to cantidad_anterior
      const updateSampleQuery = 'UPDATE muestras SET cantidad = $1 WHERE id = $2';
      await client.query(updateSampleQuery, [movement.cantidad_anterior, movement.sample_id]);

      // Delete movement
      await client.query('DELETE FROM movimientos WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ message: 'Movement deleted successfully' });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error deleting movement:', error);

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