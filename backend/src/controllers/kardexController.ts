import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { TipoMovimiento } from '../types';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorHandler';

// Get kardex entries with pagination and filters
export const getKardexEntries = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const material = req.query.material as string;
    const lote = req.query.lote as string;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Add country filtering based on user role
    const userRole = req.user!.role;
    const userId = req.user!.id;

    if (userRole === 'USER') {
      // USER role: only see data from their assigned countries
      conditions.push(`s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`);
      values.push(userId);
    }
    // ADMIN and COMMERCIAL can see all data

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

    if (material) {
      conditions.push(`s.material ILIKE $${++paramCount}`);
      values.push(`%${material}%`);
    }

    if (lote) {
      conditions.push(`s.lote ILIKE $${++paramCount}`);
      values.push(`%${lote}%`);
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
        m.id,
        m.sample_id,
        m.tipo_movimiento,
        m.cantidad_movida as cantidad,
        m.cantidad_anterior as saldo_anterior,
        m.cantidad_nueva as saldo_nuevo,
        m.motivo,
        m.fecha_movimiento,
        m.usuario_id,
        m.comentarios,
        s.cod as sample_cod,
        s.material as sample_material,
        s.lote as sample_lote,
        s.unidad_medida as sample_unidad,
        u.email as usuario_email,
        u.full_name as usuario_nombre,
        c.name as pais_name,
        cat.name as categoria_name,
        sup.name as proveedor_name,
        w.name as bodega_name,
        l.name as ubicacion_name
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      LEFT JOIN countries c ON s.pais_id = c.id
      LEFT JOIN categories cat ON s.categoria_id = cat.id
      LEFT JOIN suppliers sup ON s.proveedor_id = sup.id
      LEFT JOIN warehouses w ON s.bodega_id = w.id
      LEFT JOIN locations l ON s.ubicacion_id = l.id
      ${whereClause}
      ORDER BY m.fecha_movimiento DESC, m.id DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    const dataValues = [...values, pagination.limit, pagination.offset];
    const dataResult = await pool.query(dataQuery, dataValues);

    const kardexEntries = dataResult.rows.map(row => ({
      id: row.id,
      sample_id: row.sample_id,
      tipo_movimiento: row.tipo_movimiento,
      cantidad: parseFloat(row.cantidad),
      saldo_anterior: parseFloat(row.saldo_anterior),
      saldo_nuevo: parseFloat(row.saldo_nuevo),
      motivo: row.motivo,
      fecha_movimiento: row.fecha_movimiento,
      usuario_id: row.usuario_id,
      comentarios: row.comentarios,
      sample: row.sample_cod ? {
        id: row.sample_id,
        cod: row.sample_cod,
        material: row.sample_material,
        lote: row.sample_lote,
        unidad_medida: row.sample_unidad,
        pais: row.pais_name,
        categoria: row.categoria_name,
        proveedor: row.proveedor_name,
        bodega: row.bodega_name,
        ubicacion: row.ubicacion_name
      } : null,
      usuario: row.usuario_email ? {
        id: row.usuario_id,
        email: row.usuario_email,
        nombre: row.usuario_nombre
      } : null
    }));

    const result = createPaginatedResponse(kardexEntries, total, pagination);
    res.json(result);

  } catch (error) {
    console.error('Error fetching kardex entries:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Get kardex summary by sample
export const getKardexSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pagination = getPaginationParams({
      page: parseInt(req.query.page as string),
      limit: parseInt(req.query.limit as string)
    });

    // Get samples with their current stock and movement summary
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let whereClause = '';
    let queryParams: any[] = [];
    let countParams: any[] = [];
    let paramCount = 0;

    if (userRole === 'USER') {
      // USER role: only see samples from their assigned countries
      whereClause = `WHERE s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`;
      queryParams = [userId, pagination.limit, pagination.offset];
      countParams = [userId];
    } else {
      // ADMIN and COMMERCIAL can see all samples
      queryParams = [pagination.limit, pagination.offset];
      countParams = [];
    }

    const query = `
      SELECT
        s.id,
        s.cod,
        s.material,
        s.lote,
        s.cantidad as stock_actual,
        s.unidad_medida,
        c.name as pais_name,
        cat.name as categoria_name,
        sup.name as proveedor_name,
        w.name as bodega_name,
        l.name as ubicacion_name,
        COALESCE(k_stats.total_entradas, 0) as total_entradas,
        COALESCE(k_stats.total_salidas, 0) as total_salidas,
        COALESCE(k_stats.total_movimientos, 0) as total_movimientos,
        k_stats.ultimo_movimiento
      FROM muestras s
      LEFT JOIN countries c ON s.pais_id = c.id
      LEFT JOIN categories cat ON s.categoria_id = cat.id
      LEFT JOIN suppliers sup ON s.proveedor_id = sup.id
      LEFT JOIN warehouses w ON s.bodega_id = w.id
      LEFT JOIN locations l ON s.ubicacion_id = l.id
      LEFT JOIN (
        SELECT
          sample_id,
          SUM(CASE WHEN tipo_movimiento = 'ENTRADA' THEN cantidad_movida ELSE 0 END) as total_entradas,
          SUM(CASE WHEN tipo_movimiento = 'SALIDA' THEN cantidad_movida ELSE 0 END) as total_salidas,
          COUNT(*) as total_movimientos,
          MAX(fecha_movimiento) as ultimo_movimiento
        FROM movimientos
        GROUP BY sample_id
      ) k_stats ON s.id = k_stats.sample_id
      ${whereClause}
      ORDER BY s.fecha_registro DESC
      LIMIT $${userRole === 'USER' ? 2 : 1} OFFSET $${userRole === 'USER' ? 3 : 2}
    `;

    const countQuery = userRole === 'USER'
      ? 'SELECT COUNT(*) FROM muestras WHERE pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)'
      : 'SELECT COUNT(*) FROM muestras';

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    const summary = dataResult.rows.map(row => ({
      sample: {
        id: row.id,
        cod: row.cod,
        material: row.material,
        lote: row.lote,
        stock_actual: parseFloat(row.stock_actual),
        unidad_medida: row.unidad_medida,
        pais: row.pais_name,
        categoria: row.categoria_name,
        proveedor: row.proveedor_name,
        bodega: row.bodega_name,
        ubicacion: row.ubicacion_name
      },
      estadisticas: {
        total_entradas: parseFloat(row.total_entradas) || 0,
        total_salidas: parseFloat(row.total_salidas) || 0,
        total_movimientos: parseInt(row.total_movimientos) || 0,
        ultimo_movimiento: row.ultimo_movimiento
      }
    }));

    const result = createPaginatedResponse(summary, total, pagination);
    res.json(result);

  } catch (error) {
    console.error('Error fetching kardex summary:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Get kardex by sample ID
export const getKardexBySample = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sampleId } = req.params;

    const pagination = getPaginationParams({
      page: parseInt(req.query.page as string),
      limit: parseInt(req.query.limit as string)
    });

    // Get sample info first with country filtering
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let sampleQuery: string;
    let sampleParams: any[];

    if (userRole === 'USER') {
      // USER role: only see samples from their assigned countries
      sampleQuery = `
        SELECT
          s.*,
          c.name as pais_name,
          cat.name as categoria_name,
          sup.name as proveedor_name,
          w.name as bodega_name,
          l.name as ubicacion_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers sup ON s.proveedor_id = sup.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        WHERE s.id = $1 AND s.pais_id IN (
          SELECT country_id FROM user_countries WHERE user_id = $2
        )
      `;
      sampleParams = [sampleId, userId];
    } else {
      // ADMIN and COMMERCIAL can see any sample
      sampleQuery = `
        SELECT
          s.*,
          c.name as pais_name,
          cat.name as categoria_name,
          sup.name as proveedor_name,
          w.name as bodega_name,
          l.name as ubicacion_name
        FROM muestras s
        LEFT JOIN countries c ON s.pais_id = c.id
        LEFT JOIN categories cat ON s.categoria_id = cat.id
        LEFT JOIN suppliers sup ON s.proveedor_id = sup.id
        LEFT JOIN warehouses w ON s.bodega_id = w.id
        LEFT JOIN locations l ON s.ubicacion_id = l.id
        WHERE s.id = $1
      `;
      sampleParams = [sampleId];
    }

    const sampleResult = await pool.query(sampleQuery, sampleParams);

    if (sampleResult.rows.length === 0) {
      res.status(404).json({ message: 'Sample not found' });
      return;
    }

    // Get movement entries for this sample
    const countQuery = 'SELECT COUNT(*) FROM movimientos WHERE sample_id = $1';
    const countResult = await pool.query(countQuery, [sampleId]);
    const total = parseInt(countResult.rows[0].count);

    const kardexQuery = `
      SELECT
        m.id,
        m.sample_id,
        m.tipo_movimiento,
        m.cantidad_movida as cantidad,
        m.cantidad_anterior as saldo_anterior,
        m.cantidad_nueva as saldo_nuevo,
        m.motivo,
        m.fecha_movimiento,
        m.usuario_id,
        m.comentarios,
        u.email as usuario_email,
        u.full_name as usuario_nombre
      FROM movimientos m
      LEFT JOIN users u ON m.usuario_id = u.id
      WHERE m.sample_id = $1
      ORDER BY m.fecha_movimiento DESC, m.id DESC
      LIMIT $2 OFFSET $3
    `;

    const kardexResult = await pool.query(kardexQuery, [sampleId, pagination.limit, pagination.offset]);

    const sampleRow = sampleResult.rows[0];
    const sample = {
      id: sampleRow.id,
      cod: sampleRow.cod,
      material: sampleRow.material,
      lote: sampleRow.lote,
      cantidad: parseFloat(sampleRow.cantidad),
      unidad_medida: sampleRow.unidad_medida,
      pais: sampleRow.pais_name,
      categoria: sampleRow.categoria_name,
      proveedor: sampleRow.proveedor_name,
      bodega: sampleRow.bodega_name,
      ubicacion: sampleRow.ubicacion_name
    };

    const kardexEntries = kardexResult.rows.map(row => ({
      id: row.id,
      sample_id: row.sample_id,
      tipo_movimiento: row.tipo_movimiento,
      cantidad: parseFloat(row.cantidad),
      saldo_anterior: parseFloat(row.saldo_anterior),
      saldo_nuevo: parseFloat(row.saldo_nuevo),
      motivo: row.motivo,
      fecha_movimiento: row.fecha_movimiento,
      usuario_id: row.usuario_id,
      comentarios: row.comentarios,
      usuario: row.usuario_email ? {
        id: row.usuario_id,
        email: row.usuario_email,
        nombre: row.usuario_nombre
      } : null
    }));

    const result = createPaginatedResponse(kardexEntries, total, pagination);

    res.json({
      sample,
      kardex: result
    });

  } catch (error) {
    console.error('Error fetching kardex by sample:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

// Export kardex data
export const exportKardex = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sampleId = req.query.sample_id ? parseInt(req.query.sample_id as string) : null;
    const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : null;
    const dateTo = req.query.date_to ? new Date(req.query.date_to as string) : null;

    // Build WHERE conditions for export
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Add country filtering based on user role
    const userRole = req.user!.role;
    const userId = req.user!.id;

    if (userRole === 'USER') {
      // USER role: only export data from their assigned countries
      conditions.push(`s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`);
      values.push(userId);
    }
    // ADMIN and COMMERCIAL can export all data

    if (sampleId) {
      conditions.push(`m.sample_id = $${++paramCount}`);
      values.push(sampleId);
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

    const query = `
      SELECT
        m.id,
        m.sample_id,
        m.tipo_movimiento,
        m.cantidad_movida as cantidad,
        m.cantidad_anterior as saldo_anterior,
        m.cantidad_nueva as saldo_nuevo,
        m.motivo,
        m.fecha_movimiento,
        m.usuario_id,
        m.comentarios,
        s.cod as sample_cod,
        s.material as sample_material,
        s.lote as sample_lote,
        s.unidad_medida as sample_unidad,
        u.email as usuario_email,
        u.full_name as usuario_nombre,
        c.name as pais_name,
        cat.name as categoria_name,
        sup.name as proveedor_name,
        w.name as bodega_name,
        l.name as ubicacion_name
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      LEFT JOIN countries c ON s.pais_id = c.id
      LEFT JOIN categories cat ON s.categoria_id = cat.id
      LEFT JOIN suppliers sup ON s.proveedor_id = sup.id
      LEFT JOIN warehouses w ON s.bodega_id = w.id
      LEFT JOIN locations l ON s.ubicacion_id = l.id
      ${whereClause}
      ORDER BY m.fecha_movimiento DESC, m.id DESC
      LIMIT 10000
    `;

    const result = await pool.query(query, values);

    const exportData = result.rows.map(row => ({
      fecha_movimiento: row.fecha_movimiento,
      sample_cod: row.sample_cod,
      material: row.sample_material,
      lote: row.sample_lote,
      tipo_movimiento: row.tipo_movimiento,
      cantidad: parseFloat(row.cantidad),
      saldo_anterior: parseFloat(row.saldo_anterior),
      saldo_nuevo: parseFloat(row.saldo_nuevo),
      unidad_medida: row.sample_unidad,
      motivo: row.motivo,
      usuario: row.usuario_nombre || row.usuario_email,
      pais: row.pais_name,
      categoria: row.categoria_name,
      proveedor: row.proveedor_name,
      bodega: row.bodega_name,
      ubicacion: row.ubicacion_name
    }));

    res.json({
      data: exportData,
      count: exportData.length,
      exported_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error exporting kardex:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};