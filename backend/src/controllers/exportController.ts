import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { ExcelExporter, ExcelColumn } from '../utils/excelExporter';
import { getErrorMessage } from '../utils/errorHandler';

export const exportSamples = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const query = `
      SELECT
        s.id,
        s.cod,
        s.material,
        s.lote,
        s.cantidad,
        s.peso_unitario,
        s.unidad_medida,
        s.peso_total,
        s.fecha_vencimiento,
        s.comentarios,
        s.fecha_registro,
        c.name as pais,
        cat.name as categoria,
        p.name as proveedor,
        l.name as ubicacion,
        w.name as bodega,
        r.name as responsable
      FROM muestras s
      LEFT JOIN countries c ON s.pais_id = c.id
      LEFT JOIN categories cat ON s.categoria_id = cat.id
      LEFT JOIN suppliers p ON s.proveedor_id = p.id
      LEFT JOIN locations l ON s.ubicacion_id = l.id
      LEFT JOIN warehouses w ON s.bodega_id = w.id
      LEFT JOIN responsibles r ON s.responsable_id = r.id
      WHERE s.cantidad > 0 ${countryFilter}
      ORDER BY s.cod
    `;

    const result = await pool.query(query, queryParams);

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id' },
      { header: 'Código', key: 'cod' },
      { header: 'Material', key: 'material' },
      { header: 'Lote', key: 'lote' },
      { header: 'Cantidad', key: 'cantidad' },
      { header: 'Peso Unitario', key: 'peso_unitario' },
      { header: 'Unidad Medida', key: 'unidad_medida' },
      { header: 'Peso Total', key: 'peso_total' },
      { header: 'Fecha Vencimiento', key: 'fecha_vencimiento' },
      { header: 'Comentarios', key: 'comentarios' },
      { header: 'Fecha Registro', key: 'fecha_registro' },
      { header: 'País', key: 'pais' },
      { header: 'Categoría', key: 'categoria' },
      { header: 'Proveedor', key: 'proveedor' },
      { header: 'Ubicación', key: 'ubicacion' },
      { header: 'Bodega', key: 'bodega' },
      { header: 'Responsable', key: 'responsable' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      fecha_vencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento).toLocaleDateString() : '',
      fecha_registro: row.fecha_registro ? new Date(row.fecha_registro).toLocaleDateString() : ''
    }));

    const filename = `muestras_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting samples:', error);
    res.status(500).json({
      message: 'Error al exportar muestras',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const exportMovements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let countryFilter = '';
    let queryParams: any[] = [];

    if (userRole === UserRole.USER) {
      countryFilter = 'AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      queryParams = [userId];
    }

    const query = `
      SELECT
        m.id,
        s.cod,
        s.material,
        m.tipo_movimiento,
        m.cantidad_movida,
        m.cantidad_anterior,
        m.cantidad_nueva,
        m.motivo,
        m.comentarios,
        m.fecha_movimiento,
        u.full_name as usuario,
        c.name as pais
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      LEFT JOIN countries c ON s.pais_id = c.id
      WHERE 1=1 ${countryFilter}
      ORDER BY m.fecha_movimiento DESC
    `;

    const result = await pool.query(query, queryParams);

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id' },
      { header: 'Código Muestra', key: 'cod' },
      { header: 'Material', key: 'material' },
      { header: 'Tipo Movimiento', key: 'tipo_movimiento' },
      { header: 'Cantidad Movida', key: 'cantidad_movida' },
      { header: 'Cantidad Anterior', key: 'cantidad_anterior' },
      { header: 'Cantidad Nueva', key: 'cantidad_nueva' },
      { header: 'Motivo', key: 'motivo' },
      { header: 'Comentarios', key: 'comentarios' },
      { header: 'Fecha', key: 'fecha_movimiento' },
      { header: 'Usuario', key: 'usuario' },
      { header: 'País', key: 'pais' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      fecha_movimiento: row.fecha_movimiento ? new Date(row.fecha_movimiento).toLocaleString() : ''
    }));

    const filename = `movimientos_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting movements:', error);
    res.status(500).json({
      message: 'Error al exportar movimientos',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const exportAllKardex = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let countryFilter = '';
    let queryParams: any[] = [];

    if (userRole === UserRole.USER) {
      countryFilter = 'AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      queryParams = [userId];
    }

    const query = `
      SELECT
        m.id,
        m.fecha_movimiento,
        m.tipo_movimiento,
        m.cantidad_movida,
        m.cantidad_anterior,
        m.cantidad_nueva,
        m.motivo,
        m.comentarios,
        u.full_name as usuario,
        s.cod,
        s.material,
        s.lote,
        c.name as pais
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      LEFT JOIN countries c ON s.pais_id = c.id
      WHERE 1=1 ${countryFilter}
      ORDER BY m.fecha_movimiento DESC
    `;

    const result = await pool.query(query, queryParams);

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id' },
      { header: 'Fecha', key: 'fecha_movimiento' },
      { header: 'Código Muestra', key: 'cod' },
      { header: 'Material', key: 'material' },
      { header: 'Lote', key: 'lote' },
      { header: 'Tipo Movimiento', key: 'tipo_movimiento' },
      { header: 'Cantidad Movida', key: 'cantidad_movida' },
      { header: 'Stock Anterior', key: 'cantidad_anterior' },
      { header: 'Stock Nuevo', key: 'cantidad_nueva' },
      { header: 'Motivo', key: 'motivo' },
      { header: 'Comentarios', key: 'comentarios' },
      { header: 'Usuario', key: 'usuario' },
      { header: 'País', key: 'pais' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      fecha_movimiento: row.fecha_movimiento ? new Date(row.fecha_movimiento).toLocaleString() : ''
    }));

    const filename = `kardex_completo_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting all kardex:', error);
    res.status(500).json({
      message: 'Error al exportar kardex completo',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const exportKardex = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const sampleId = req.params.sampleId;

    let countryFilter = '';
    let queryParams: any[] = [sampleId];

    if (userRole === UserRole.USER) {
      countryFilter = 'AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $2)';
      queryParams.push(userId);
    }

    const query = `
      SELECT
        m.fecha_movimiento,
        m.tipo_movimiento,
        m.cantidad_movida,
        m.cantidad_anterior,
        m.cantidad_nueva,
        m.motivo,
        m.comentarios,
        u.full_name as usuario,
        s.cod,
        s.material
      FROM movimientos m
      LEFT JOIN muestras s ON m.sample_id = s.id
      LEFT JOIN users u ON m.usuario_id = u.id
      WHERE m.sample_id = $1 ${countryFilter}
      ORDER BY m.fecha_movimiento DESC
    `;

    const result = await pool.query(query, queryParams);

    const columns: ExcelColumn[] = [
      { header: 'Fecha', key: 'fecha_movimiento' },
      { header: 'Tipo', key: 'tipo_movimiento' },
      { header: 'Cantidad Movida', key: 'cantidad_movida' },
      { header: 'Stock Anterior', key: 'cantidad_anterior' },
      { header: 'Stock Nuevo', key: 'cantidad_nueva' },
      { header: 'Motivo', key: 'motivo' },
      { header: 'Comentarios', key: 'comentarios' },
      { header: 'Usuario', key: 'usuario' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      fecha_movimiento: row.fecha_movimiento ? new Date(row.fecha_movimiento).toLocaleString() : ''
    }));

    const sampleInfo = result.rows[0];
    const filename = `kardex_${sampleInfo?.cod || sampleId}_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting kardex:', error);
    res.status(500).json({
      message: 'Error al exportar kardex',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const exportTransfers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let countryFilter = '';
    let queryParams: any[] = [];

    if (userRole === UserRole.USER) {
      countryFilter = 'AND s.pais_id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      queryParams = [userId];
    }

    const query = `
      SELECT
        t.id,
        s.cod,
        s.material,
        t.cantidad_trasladada,
        cd.name as pais_destino,
        t.codigo_generado,
        t.motivo,
        t.comentarios_traslado,
        t.estado,
        t.fecha_envio,
        t.fecha_recepcion,
        u_origen.full_name as usuario_origen,
        u_destino.full_name as usuario_destino
      FROM transfers t
      LEFT JOIN muestras s ON t.muestra_origen_id = s.id
      LEFT JOIN countries cd ON t.pais_destino_id = cd.id
      LEFT JOIN users u_origen ON t.usuario_origen_id = u_origen.id
      LEFT JOIN users u_destino ON t.usuario_destino_id = u_destino.id
      WHERE 1=1 ${countryFilter}
      ORDER BY t.fecha_envio DESC
    `;

    const result = await pool.query(query, queryParams);

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id' },
      { header: 'Código Muestra', key: 'cod' },
      { header: 'Material', key: 'material' },
      { header: 'Cantidad Trasladada', key: 'cantidad_trasladada' },
      { header: 'País Destino', key: 'pais_destino' },
      { header: 'Código Generado', key: 'codigo_generado' },
      { header: 'Motivo', key: 'motivo' },
      { header: 'Comentarios', key: 'comentarios_traslado' },
      { header: 'Estado', key: 'estado' },
      { header: 'Fecha Envío', key: 'fecha_envio' },
      { header: 'Fecha Recepción', key: 'fecha_recepcion' },
      { header: 'Usuario Origen', key: 'usuario_origen' },
      { header: 'Usuario Destino', key: 'usuario_destino' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      fecha_envio: row.fecha_envio ? new Date(row.fecha_envio).toLocaleString() : '',
      fecha_recepcion: row.fecha_recepcion ? new Date(row.fecha_recepcion).toLocaleString() : ''
    }));

    const filename = `traslados_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting transfers:', error);
    res.status(500).json({
      message: 'Error al exportar traslados',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};

export const exportUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only ADMIN can export users
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'No autorizado para exportar usuarios' });
      return;
    }

    const query = `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        STRING_AGG(c.name, ', ') as paises_asignados
      FROM users u
      LEFT JOIN user_countries uc ON u.id = uc.user_id
      LEFT JOIN countries c ON uc.country_id = c.id
      GROUP BY u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.updated_at
      ORDER BY u.full_name
    `;

    const result = await pool.query(query);

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id' },
      { header: 'Email', key: 'email' },
      { header: 'Nombre Completo', key: 'full_name' },
      { header: 'Rol', key: 'role' },
      { header: 'Activo', key: 'is_active' },
      { header: 'Fecha Creación', key: 'created_at' },
      { header: 'Última Actualización', key: 'updated_at' },
      { header: 'Países Asignados', key: 'paises_asignados' }
    ];

    const data = result.rows.map(row => ({
      ...row,
      is_active: row.is_active ? 'Sí' : 'No',
      created_at: row.created_at ? new Date(row.created_at).toLocaleString() : '',
      updated_at: row.updated_at ? new Date(row.updated_at).toLocaleString() : ''
    }));

    const filename = `usuarios_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportToExcel(res, data, columns, filename);

  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({
      message: 'Error al exportar usuarios',
      error: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined
    });
  }
};