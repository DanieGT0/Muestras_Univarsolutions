import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { getErrorMessage } from '../utils/errorHandler';

interface DailyMovement {
  fecha: string;
  entradas: number;
  salidas: number;
}

interface MovementsAnalytics {
  daily_movements: DailyMovement[];
  total_entries: number;
  total_exits: number;
  total_days: number;
}

export const getMovementsAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Get query parameters
    const fecha_desde = req.query.fecha_desde as string;
    const fecha_hasta = req.query.fecha_hasta as string;
    const pais_id = req.query.pais_id as string;
    const categoria_id = req.query.categoria_id as string;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Add country filtering based on user role
    if (userRole === UserRole.USER) {
      // USER role: only see movements from their assigned countries
      conditions.push(`s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`);
      values.push(userId);
    }

    // Date filters
    if (fecha_desde) {
      conditions.push(`m.fecha_movimiento >= $${++paramCount}`);
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      conditions.push(`m.fecha_movimiento <= $${++paramCount}`);
      values.push(fecha_hasta);
    }

    // Country filter (if provided and user has access)
    if (pais_id && pais_id !== 'all') {
      if (userRole === UserRole.USER) {
        // For USER role, ensure they can only filter by their assigned countries
        conditions.push(`s.pais_id = $${++paramCount} AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $${++paramCount})`);
        values.push(parseInt(pais_id), userId);
      } else {
        // ADMIN and COMMERCIAL can filter by any country
        conditions.push(`s.pais_id = $${++paramCount}`);
        values.push(parseInt(pais_id));
      }
    }

    // Category filter
    if (categoria_id && categoria_id !== 'all') {
      conditions.push(`s.categoria_id = $${++paramCount}`);
      values.push(parseInt(categoria_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query for daily movements
    const query = `
      SELECT
        DATE(m.fecha_movimiento) as fecha,
        SUM(CASE WHEN m.tipo_movimiento = 'ENTRADA' THEN m.cantidad_movida ELSE 0 END) as entradas,
        SUM(CASE WHEN m.tipo_movimiento = 'SALIDA' THEN m.cantidad_movida ELSE 0 END) as salidas
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      ${whereClause}
      GROUP BY DATE(m.fecha_movimiento)
      ORDER BY DATE(m.fecha_movimiento) DESC
      LIMIT 30
    `;

    const result = await pool.query(query, values);

    // Process the results
    const dailyMovements: DailyMovement[] = result.rows.map(row => ({
      fecha: row.fecha,
      entradas: parseInt(row.entradas) || 0,
      salidas: parseInt(row.salidas) || 0
    }));

    // Calculate totals
    const total_entries = dailyMovements.reduce((sum, day) => sum + day.entradas, 0);
    const total_exits = dailyMovements.reduce((sum, day) => sum + day.salidas, 0);
    const total_days = dailyMovements.length;

    const analytics: MovementsAnalytics = {
      daily_movements: dailyMovements.reverse(), // Show oldest to newest
      total_entries,
      total_exits,
      total_days
    };

    res.json(analytics);

  } catch (error) {
    console.error('Error getting movements analytics:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let countryFilter = '';
    let queryParams: any[] = [];

    // Add country filtering based on user role
    if (userRole === UserRole.USER) {
      countryFilter = 'AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      queryParams = [userId];
    }

    // Get total samples
    const samplesQuery = `
      SELECT COUNT(*) as total_samples,
             COUNT(CASE WHEN s.cantidad > 0 THEN 1 END) as active_samples,
             COUNT(CASE WHEN s.cantidad > 0 AND s.cantidad < 5 THEN 1 END) as low_stock
      FROM muestras s
      WHERE 1=1 ${countryFilter}
    `;
    const samplesResult = await pool.query(samplesQuery, queryParams);

    // Get recent movements count (last 7 days)
    const movementsQuery = `
      SELECT COUNT(*) as recent_movements
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      WHERE m.fecha_movimiento >= CURRENT_DATE - INTERVAL '7 days' ${countryFilter}
    `;
    const movementsResult = await pool.query(movementsQuery, queryParams);

    const stats = {
      totalSamples: parseInt(samplesResult.rows[0].total_samples) || 0,
      activeSamples: parseInt(samplesResult.rows[0].active_samples) || 0,
      lowStock: parseInt(samplesResult.rows[0].low_stock) || 0,
      recentMovements: parseInt(movementsResult.rows[0].recent_movements) || 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};