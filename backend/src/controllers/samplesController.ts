import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UnidadMedida } from '../types';

export const createSampleValidation = [
  body('material').isLength({ min: 1, max: 200 }),
  body('lote').isLength({ min: 1, max: 100 }),
  body('cantidad').isInt({ min: 0 }),
  body('peso_unitario').isFloat({ min: 0 }),
  body('unidad_medida').isIn(Object.values(UnidadMedida)),
  body('peso_total').isFloat({ min: 0 }),
  body('fecha_vencimiento').optional().isISO8601(),
  body('comentarios').optional().isLength({ max: 500 }),
  body('pais_id').isInt({ min: 1 }),
  body('categoria_id').isInt({ min: 1 }),
  body('proveedor_id').isInt({ min: 1 }),
  body('bodega_id').isInt({ min: 1 }),
  body('ubicacion_id').isInt({ min: 1 }),
  body('responsable_id').isInt({ min: 1 })
];

export const getSamples = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    const userRole = req.user!.role;
    const userId = req.user!.id;

    let query: string;
    let countQuery: string;
    let queryParams: any[];
    let countParams: any[];

    // Build search condition
    const searchCondition = search ? `AND s.material ILIKE $${search ? 1 : 0}` : '';
    const searchParam = search ? `%${search}%` : null;

    if (userRole === 'ADMIN' || userRole === 'COMMERCIAL') {
      // ADMIN and COMMERCIAL can see all samples with cantidad > 0
      const paramOffset = search ? 1 : 0;
      query = `
        SELECT
          s.*,
          c.cod as pais_cod, c.name as pais_name,
          cat.cod as categoria_cod, cat.name as categoria_name,
          p.cod as proveedor_cod, p.name as proveedor_name,
          w.cod as bodega_cod, w.name as bodega_name,
          l.cod as ubicacion_cod, l.name as ubicacion_name,
          r.cod as responsable_cod, r.name as responsable_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers p ON s.proveedor_id = p.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE s.cantidad > 0 ${searchCondition}
        ORDER BY s.fecha_registro DESC
        LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}
      `;
      countQuery = `SELECT COUNT(*) FROM muestras WHERE cantidad > 0 ${searchCondition}`;
      queryParams = search ? [searchParam, limit, offset] : [limit, offset];
      countParams = search ? [searchParam] : [];
    } else {
      // USER role: only see samples from their assigned countries with cantidad > 0
      const paramOffset = search ? 2 : 1;
      query = `
        SELECT
          s.*,
          c.cod as pais_cod, c.name as pais_name,
          cat.cod as categoria_cod, cat.name as categoria_name,
          p.cod as proveedor_cod, p.name as proveedor_name,
          w.cod as bodega_cod, w.name as bodega_name,
          l.cod as ubicacion_cod, l.name as ubicacion_name,
          r.cod as responsable_cod, r.name as responsable_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers p ON s.proveedor_id = p.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE s.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $1
        )
        AND s.cantidad > 0 ${searchCondition}
        ORDER BY s.fecha_registro DESC
        LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}
      `;
      countQuery = `
        SELECT COUNT(*) FROM muestras
        WHERE pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $1
        )
        AND cantidad > 0 ${searchCondition}
      `;
      queryParams = search ? [userId, searchParam, limit, offset] : [userId, limit, offset];
      countParams = search ? [userId, searchParam] : [userId];
    }

    const [samplesResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const samples = samplesResult.rows.map(row => ({
      ...row,
      pais: row.pais_cod ? { id: row.pais_id, cod: row.pais_cod, name: row.pais_name } : null,
      categoria: row.categoria_cod ? { id: row.categoria_id, cod: row.categoria_cod, name: row.categoria_name } : null,
      proveedor: row.proveedor_cod ? { id: row.proveedor_id, cod: row.proveedor_cod, name: row.proveedor_name } : null,
      bodega: row.bodega_cod ? { id: row.bodega_id, cod: row.bodega_cod, name: row.bodega_name } : null,
      ubicacion: row.ubicacion_cod ? { id: row.ubicacion_id, cod: row.ubicacion_cod, name: row.ubicacion_name } : null,
      responsable: row.responsable_cod ? { id: row.responsable_id, cod: row.responsable_cod, name: row.responsable_name } : null,
    }));

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: samples,
      count: total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
      fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
      bodega_id, ubicacion_id, responsable_id
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate unique code with format: [COUNTRY][DD][MM][YY][###]
      // First get country code
      const countryQuery = 'SELECT cod FROM countries WHERE id = $1';
      const countryResult = await client.query(countryQuery, [pais_id]);
      if (countryResult.rows.length === 0) {
        res.status(400).json({ message: 'Invalid country ID' });
        return;
      }
      const countryCod = countryResult.rows[0].cod;

      // Generate date parts (DD, MM, YY)
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);
      const datePrefix = `${day}${month}${year}`;

      // Get daily correlative for this country and date
      const dailyPrefix = `${countryCod}${datePrefix}`;
      const codeQuery = 'SELECT COUNT(*) as count FROM muestras WHERE cod LIKE $1';
      const codeResult = await client.query(codeQuery, [`${dailyPrefix}%`]);
      const correlative = parseInt(codeResult.rows[0].count) + 1;

      // Final code: [COUNTRY][DD][MM][YY][###]
      const cod = `${dailyPrefix}${correlative.toString().padStart(3, '0')}`;

      // Create the sample
      const insertQuery = `
        INSERT INTO muestras (
          cod, material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
          fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
          bodega_id, ubicacion_id, responsable_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const sampleResult = await client.query(insertQuery, [
        cod, material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
        fecha_vencimiento || null, comentarios || null, pais_id, categoria_id,
        proveedor_id, bodega_id, ubicacion_id, responsable_id
      ]);

      const newSample = sampleResult.rows[0];

      // Create initial ENTRADA movement
      const movementQuery = `
        INSERT INTO movimientos (
          sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
          cantidad_nueva, motivo, comentarios, usuario_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const movementResult = await client.query(movementQuery, [
        newSample.id,
        'ENTRADA',
        Math.round(cantidad), // Convert to integer as required by schema
        0, // cantidad_anterior is 0 for new samples
        Math.round(cantidad), // cantidad_nueva equals the initial quantity
        'Registro inicial de muestra',
        `Muestra registrada: ${material} - Lote: ${lote}`,
        req.user!.id
      ]);

      await client.query('COMMIT');
      res.status(201).json(newSample);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating sample:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let query: string;
    let queryParams: any[];

    if (userRole === 'ADMIN' || userRole === 'COMMERCIAL') {
      // ADMIN and COMMERCIAL can see any sample
      query = `
        SELECT
          s.*,
          c.cod as pais_cod, c.name as pais_name,
          cat.cod as categoria_cod, cat.name as categoria_name,
          p.cod as proveedor_cod, p.name as proveedor_name,
          w.cod as bodega_cod, w.name as bodega_name,
          l.cod as ubicacion_cod, l.name as ubicacion_name,
          r.cod as responsable_cod, r.name as responsable_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers p ON s.proveedor_id = p.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE s.id = $1
      `;
      queryParams = [id];
    } else {
      // USER role: only see samples from their assigned countries
      query = `
        SELECT
          s.*,
          c.cod as pais_cod, c.name as pais_name,
          cat.cod as categoria_cod, cat.name as categoria_name,
          p.cod as proveedor_cod, p.name as proveedor_name,
          w.cod as bodega_cod, w.name as bodega_name,
          l.cod as ubicacion_cod, l.name as ubicacion_name,
          r.cod as responsable_cod, r.name as responsable_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers p ON s.proveedor_id = p.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        LEFT JOIN responsibles r ON s.responsable_id = r.id
        WHERE s.id = $1 AND s.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $2
        )
      `;
      queryParams = [id, userId];
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Sample not found' });
      return;
    }

    const row = result.rows[0];
    const sample = {
      ...row,
      pais: row.pais_cod ? { id: row.pais_id, cod: row.pais_cod, name: row.pais_name } : null,
      categoria: row.categoria_cod ? { id: row.categoria_id, cod: row.categoria_cod, name: row.categoria_name } : null,
      proveedor: row.proveedor_cod ? { id: row.proveedor_id, cod: row.proveedor_cod, name: row.proveedor_name } : null,
      bodega: row.bodega_cod ? { id: row.bodega_id, cod: row.bodega_cod, name: row.bodega_name } : null,
      ubicacion: row.ubicacion_cod ? { id: row.ubicacion_id, cod: row.ubicacion_cod, name: row.ubicacion_name } : null,
      responsable: row.responsable_cod ? { id: row.responsable_id, cod: row.responsable_cod, name: row.responsable_name } : null,
    };

    res.json(sample);
  } catch (error) {
    console.error('Error fetching sample:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const {
      material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
      fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
      bodega_id, ubicacion_id, responsable_id
    } = req.body;

    // Check if sample exists
    const checkQuery = 'SELECT id FROM muestras WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ message: 'Sample not found' });
      return;
    }

    const updateQuery = `
      UPDATE muestras SET
        material = $1, lote = $2, cantidad = $3, peso_unitario = $4,
        unidad_medida = $5, peso_total = $6, fecha_vencimiento = $7,
        comentarios = $8, pais_id = $9, categoria_id = $10,
        proveedor_id = $11, bodega_id = $12, ubicacion_id = $13,
        responsable_id = $14
      WHERE id = $15
      RETURNING *
    `;

    await pool.query(updateQuery, [
      material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
      fecha_vencimiento || null, comentarios || null, pais_id, categoria_id,
      proveedor_id, bodega_id, ubicacion_id, responsable_id, id
    ]);

    // Get the updated sample with all relations
    const getUpdatedQuery = `
      SELECT
        s.*,
        c.cod as pais_cod, c.name as pais_name,
        cat.cod as categoria_cod, cat.name as categoria_name,
        p.cod as proveedor_cod, p.name as proveedor_name,
        w.cod as bodega_cod, w.name as bodega_name,
        l.cod as ubicacion_cod, l.name as ubicacion_name,
        r.cod as responsable_cod, r.name as responsable_name
      FROM muestras s
      LEFT JOIN countries c ON s.pais_id = c.id
      LEFT JOIN categories cat ON s.categoria_id = cat.id
      LEFT JOIN suppliers p ON s.proveedor_id = p.id
      LEFT JOIN warehouses w ON s.bodega_id = w.id
      LEFT JOIN locations l ON s.ubicacion_id = l.id
      LEFT JOIN responsibles r ON s.responsable_id = r.id
      WHERE s.id = $1
    `;

    const updatedResult = await pool.query(getUpdatedQuery, [id]);
    const row = updatedResult.rows[0];

    const sample = {
      ...row,
      pais: row.pais_cod ? { id: row.pais_id, cod: row.pais_cod, name: row.pais_name } : null,
      categoria: row.categoria_cod ? { id: row.categoria_id, cod: row.categoria_cod, name: row.categoria_name } : null,
      proveedor: row.proveedor_cod ? { id: row.proveedor_id, cod: row.proveedor_cod, name: row.proveedor_name } : null,
      bodega: row.bodega_cod ? { id: row.bodega_id, cod: row.bodega_cod, name: row.bodega_name } : null,
      ubicacion: row.ubicacion_cod ? { id: row.ubicacion_id, cod: row.ubicacion_cod, name: row.ubicacion_name } : null,
      responsable: row.responsable_cod ? { id: row.responsable_id, cod: row.responsable_cod, name: row.responsable_name } : null,
    };

    res.json(sample);
  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if sample exists
    const checkQuery = 'SELECT id FROM muestras WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ message: 'Sample not found' });
      return;
    }

    // Delete the sample
    const deleteQuery = 'DELETE FROM muestras WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Sample deleted successfully' });
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSamplesStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let query: string;
    let queryParams: any[];

    if (userRole === 'ADMIN' || userRole === 'COMMERCIAL') {
      // ADMIN and COMMERCIAL can see stats for all samples with cantidad > 0
      query = `
        SELECT
          COUNT(*) as total_muestras,
          COALESCE(SUM(cantidad), 0) as total_unidades,
          COALESCE(SUM(peso_total), 0) as total_peso
        FROM muestras
        WHERE cantidad > 0
      `;
      queryParams = [];
    } else {
      // USER role: only see stats for samples from their assigned countries with cantidad > 0
      query = `
        SELECT
          COUNT(*) as total_muestras,
          COALESCE(SUM(cantidad), 0) as total_unidades,
          COALESCE(SUM(peso_total), 0) as total_peso
        FROM muestras s
        WHERE s.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $1
        )
        AND s.cantidad > 0
      `;
      queryParams = [userId];
    }

    const result = await pool.query(query, queryParams);
    const stats = result.rows[0];

    res.json({
      totalMuestras: parseInt(stats.total_muestras),
      totalUnidades: parseFloat(stats.total_unidades),
      totalPeso: parseFloat(stats.total_peso)
    });
  } catch (error) {
    console.error('Error fetching samples stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};