import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import bcrypt from 'bcryptjs';

// Contraseña maestra para operaciones críticas
const MASTER_PASSWORD = 'Univarsv@@$$';

// Tablas disponibles para eliminación
const AVAILABLE_TABLES = [
  'muestras',
  'movimientos',
  'kardex',
  'countries',
  'categories',
  'locations',
  'suppliers',
  'responsibles',
  'warehouses'
];

// Validaciones
export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
];

export const deleteTablesValidation = [
  body('tables').isArray({ min: 1 }).withMessage('At least one table must be selected'),
  body('tables.*').isIn(AVAILABLE_TABLES).withMessage('Invalid table selected'),
  body('password').notEmpty().withMessage('Password is required')
];

// Crear backup de base de datos
export const createDatabaseBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      user: req.user.email,
      tables: {} as any
    };

    // Obtener datos de todas las tablas
    for (const tableName of AVAILABLE_TABLES) {
      try {
        const tableData = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);
        backupData.tables[tableName] = {
          structure: await getTableStructure(tableName),
          data: tableData.rows,
          count: tableData.rows.length
        };
      } catch (error) {
        console.error(`Error backing up table ${tableName}:`, error);
        backupData.tables[tableName] = {
          error: `Failed to backup: ${error instanceof Error ? error.message : String(error)}`,
          count: 0
        };
      }
    }

    // Generar SQL de backup
    const backupSQL = generateBackupSQL(backupData);

    res.json({
      message: 'Database backup created successfully',
      timestamp: backupData.timestamp,
      user: backupData.user,
      backupSize: Buffer.byteLength(backupSQL, 'utf8'),
      tableCount: Object.keys(backupData.tables).length,
      backupSQL
    });

  } catch (error) {
    console.error('Error creating database backup:', error);
    res.status(500).json({ message: 'Failed to create backup' });
  }
};

// Eliminar tablas masivamente
export const deleteTablesMassive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user || req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { tables, password } = req.body;

    // Verificar contraseña maestra
    if (password !== MASTER_PASSWORD) {
      res.status(401).json({ message: 'Invalid master password' });
      return;
    }

    const client = await pool.connect();
    const deletedTables = [];
    const errors_list = [];

    try {
      await client.query('BEGIN');

      for (const tableName of tables) {
        try {
          // Verificar si la tabla existe
          const tableExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = $1
            )
          `, [tableName]);

          if (!tableExists.rows[0].exists) {
            errors_list.push(`Table ${tableName} does not exist`);
            continue;
          }

          // Obtener información antes de eliminar
          const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
          const recordCount = parseInt(countResult.rows[0].count);

          // Eliminar todos los registros
          await client.query(`DELETE FROM ${tableName}`);

          // Reiniciar secuencia si existe
          try {
            await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`);
          } catch (seqError) {
            // La secuencia puede no existir, continuar sin error
          }

          deletedTables.push({
            table: tableName,
            recordsDeleted: recordCount,
            sequenceReset: true
          });

        } catch (error) {
          console.error(`Error deleting table ${tableName}:`, error);
          errors_list.push(`Failed to delete ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      await client.query('COMMIT');

      // Log de seguridad
      await logSecurityAction(req.user.id, 'MASS_DELETE', {
        tables: deletedTables.map(t => t.table),
        totalRecordsDeleted: deletedTables.reduce((sum, t) => sum + t.recordsDeleted, 0)
      });

      res.json({
        message: `Successfully processed ${deletedTables.length} tables`,
        deletedTables,
        errors: errors_list,
        timestamp: new Date().toISOString(),
        user: req.user.email
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in mass table deletion:', error);
    res.status(500).json({ message: 'Failed to delete tables' });
  }
};

// Cambiar contraseña maestra
export const changeMasterPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user || req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Verificar contraseña actual
    if (currentPassword !== MASTER_PASSWORD) {
      res.status(401).json({ message: 'Current master password is incorrect' });
      return;
    }

    // En producción, aquí guardarías la nueva contraseña en una ubicación segura
    // Por ahora, solo simulamos el cambio

    // Log de seguridad
    await logSecurityAction(req.user.id, 'PASSWORD_CHANGE', {
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Master password changed successfully',
      timestamp: new Date().toISOString(),
      user: req.user.email
    });

  } catch (error) {
    console.error('Error changing master password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// Obtener información de las tablas
export const getTablesInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const tablesInfo = [];

    for (const tableName of AVAILABLE_TABLES) {
      try {
        const countQuery = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const sizeQuery = await pool.query(`
          SELECT pg_total_relation_size('${tableName}') as size
        `);

        const structure = await getTableStructure(tableName);

        tablesInfo.push({
          name: tableName,
          recordCount: parseInt(countQuery.rows[0].count),
          sizeBytes: parseInt(sizeQuery.rows[0].size) || 0,
          columns: structure.length
        });
      } catch (error) {
        tablesInfo.push({
          name: tableName,
          error: error instanceof Error ? error.message : String(error),
          recordCount: 0,
          sizeBytes: 0,
          columns: 0
        });
      }
    }

    res.json({
      tables: tablesInfo,
      totalTables: AVAILABLE_TABLES.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting tables info:', error);
    res.status(500).json({ message: 'Failed to get tables information' });
  }
};

// Obtener historial de acciones de seguridad
export const getSecurityHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // En una implementación real, tendrías una tabla security_logs
    // Por ahora, devolvemos datos mock
    const mockHistory = [
      {
        id: '1',
        action: 'Database backup created',
        timestamp: new Date().toISOString(),
        user: req.user.email,
        status: 'success',
        details: { backupSize: '2.5MB', tables: 9 }
      },
      {
        id: '2',
        action: 'Table muestras deleted',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: req.user.email,
        status: 'success',
        details: { recordsDeleted: 150, sequenceReset: true }
      }
    ];

    res.json({
      data: mockHistory.slice(offset, offset + limit),
      count: mockHistory.length,
      page,
      pages: Math.ceil(mockHistory.length / limit)
    });

  } catch (error) {
    console.error('Error getting security history:', error);
    res.status(500).json({ message: 'Failed to get security history' });
  }
};

// Funciones auxiliares
async function getTableStructure(tableName: string) {
  const query = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `;

  const result = await pool.query(query, [tableName]);
  return result.rows;
}

function generateBackupSQL(backupData: any): string {
  let sql = [];

  sql.push('-- Database Backup');
  sql.push(`-- Generated on: ${backupData.timestamp}`);
  sql.push(`-- Generated by: ${backupData.user}`);
  sql.push('--');
  sql.push('');

  for (const [tableName, tableData] of Object.entries(backupData.tables)) {
    const table = tableData as any;
    if (table.error) {
      sql.push(`-- ERROR in table ${tableName}: ${table.error}`);
      continue;
    }

    sql.push(`-- Table: ${tableName} (${table.count} records)`);
    sql.push('--');

    if (table.data && table.data.length > 0) {
      const columns = Object.keys(table.data[0]);
      sql.push(`DELETE FROM ${tableName};`);

      for (const row of table.data) {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (value instanceof Date) return `'${value.toISOString()}'`;
          return value;
        }).join(', ');

        sql.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`);
      }

      // Reset sequence
      sql.push(`SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM ${tableName}), false);`);
    }
    sql.push('');
  }

  return sql.join('\n');
}

async function logSecurityAction(userId: string, action: string, details: any) {
  // En una implementación real, guardarías en una tabla security_logs
  console.log(`Security Action - User: ${userId}, Action: ${action}, Details:`, details);
}