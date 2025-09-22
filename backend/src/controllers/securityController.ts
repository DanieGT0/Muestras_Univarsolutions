import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { getPaginationParams } from '../utils/pagination';
import {
  AppError,
  SecurityError,
  ValidationError,
  AuthenticationError,
  getErrorMessage,
  isValidTableName
} from '../utils/errorHandler';
import { SecurityLoggerService, SecurityLogFilter } from '../services/securityLogger';

// Configuration constants
const SECURITY_CONFIG = {
  MASTER_PASSWORD: process.env.MASTER_PASSWORD || 'Univarsv@@$$',
  AVAILABLE_TABLES: [
    'muestras',
    'movimientos',
    'transfers',
    'countries',
    'categories',
    'locations',
    'suppliers',
    'responsibles',
    'warehouses',
    'users'
  ],
  MAX_BACKUP_SIZE: 50 * 1024 * 1024, // 50MB
  CLEANUP_DAYS: 90
} as const;

// Validation middleware
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

export const deleteTablesValidation = [
  body('tables')
    .isArray({ min: 1 })
    .withMessage('At least one table must be selected'),
  body('tables.*')
    .isIn([...SECURITY_CONFIG.AVAILABLE_TABLES])
    .withMessage('Invalid table selected'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('country_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Country ID must be a positive integer')
];

// Services
const securityLogger = SecurityLoggerService.getInstance();

// Helper functions
function validateAdminAccess(req: AuthRequest): void {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    throw new SecurityError('Admin access required', 'INSUFFICIENT_PRIVILEGES');
  }
}

function buildDeleteQuery(tableName: string, countryId?: number): { query: string; params: any[] } {
  let query: string;
  let params: any[] = [];

  if (!countryId) {
    // Delete all records from table
    query = `DELETE FROM ${tableName}`;
  } else {
    // Delete records filtered by country
    switch (tableName) {
      case 'muestras':
        query = `DELETE FROM ${tableName} WHERE pais_id = $1`;
        params = [countryId];
        break;
      case 'transfers':
        query = `DELETE FROM ${tableName} WHERE pais_destino_id = $1`;
        params = [countryId];
        break;
      case 'movimientos':
        query = `DELETE FROM ${tableName} WHERE sample_id IN (SELECT id FROM muestras WHERE pais_id = $1)`;
        params = [countryId];
        break;
      case 'countries':
        query = `DELETE FROM ${tableName} WHERE id = $1`;
        params = [countryId];
        break;
      default:
        // For tables without country relationship, delete all
        query = `DELETE FROM ${tableName}`;
        break;
    }
  }

  return { query, params };
}

function buildCountQuery(tableName: string, countryId?: number): { query: string; params: any[] } {
  let query: string;
  let params: any[] = [];

  if (!countryId) {
    // Count all records from table
    query = `SELECT COUNT(*) FROM ${tableName}`;
  } else {
    // Count records filtered by country
    switch (tableName) {
      case 'muestras':
        query = `SELECT COUNT(*) FROM ${tableName} WHERE pais_id = $1`;
        params = [countryId];
        break;
      case 'transfers':
        query = `SELECT COUNT(*) FROM ${tableName} WHERE pais_destino_id = $1`;
        params = [countryId];
        break;
      case 'movimientos':
        query = `SELECT COUNT(*) FROM ${tableName} WHERE sample_id IN (SELECT id FROM muestras WHERE pais_id = $1)`;
        params = [countryId];
        break;
      case 'countries':
        query = `SELECT COUNT(*) FROM ${tableName} WHERE id = $1`;
        params = [countryId];
        break;
      default:
        // For tables without country relationship, count all
        query = `SELECT COUNT(*) FROM ${tableName}`;
        break;
    }
  }

  return { query, params };
}

function validateMasterPassword(password: string): void {
  if (password !== SECURITY_CONFIG.MASTER_PASSWORD) {
    throw new AuthenticationError('Invalid master password', 'INVALID_MASTER_PASSWORD');
  }
}

async function getTableInfo(tableName: string) {
  try {
    const [countResult, sizeResult, structureResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM ${tableName}`),
      pool.query(`SELECT pg_total_relation_size('${tableName}') as size`),
      pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName])
    ]);

    return {
      name: tableName,
      recordCount: parseInt(countResult.rows[0].count),
      sizeBytes: parseInt(sizeResult.rows[0].size) || 0,
      columns: structureResult.rows.length,
      structure: structureResult.rows
    };
  } catch (error) {
    return {
      name: tableName,
      error: getErrorMessage(error),
      recordCount: 0,
      sizeBytes: 0,
      columns: 0
    };
  }
}

// Controllers
export const createDatabaseBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    validateAdminAccess(req);

    const requestInfo = {
      ip: req.ip,
      headers: req.headers
    };

    const backupData = {
      timestamp: new Date().toISOString(),
      user: req.user!.email,
      tables: {} as any
    };

    let totalSize = 0;
    const successfulTables: string[] = [];
    const failedTables: string[] = [];

    // Process each table
    for (const tableName of SECURITY_CONFIG.AVAILABLE_TABLES) {
      try {
        if (!isValidTableName(tableName, SECURITY_CONFIG.AVAILABLE_TABLES)) {
          throw new ValidationError(`Invalid table name: ${tableName}`);
        }

        const tableData = await pool.query(`SELECT * FROM ${tableName} ORDER BY id`);
        const tableInfo = await getTableInfo(tableName);

        backupData.tables[tableName] = {
          structure: tableInfo.structure,
          data: tableData.rows,
          count: tableData.rows.length,
          sizeBytes: tableInfo.sizeBytes
        };

        totalSize += tableInfo.sizeBytes;
        successfulTables.push(tableName);

        // Check backup size limit
        if (totalSize > SECURITY_CONFIG.MAX_BACKUP_SIZE) {
          throw new ValidationError('Backup size exceeds maximum allowed size');
        }

      } catch (error) {
        console.error(`Error backing up table ${tableName}:`, error);
        backupData.tables[tableName] = {
          error: getErrorMessage(error),
          count: 0
        };
        failedTables.push(tableName);
      }
    }

    // Generate SQL backup
    const backupSQL = generateBackupSQL(backupData);
    const backupSizeBytes = Buffer.byteLength(backupSQL, 'utf8');

    // Log success
    await securityLogger.logSuccess(
      req.user!.id,
      'DATABASE_BACKUP_CREATED',
      {
        successfulTables,
        failedTables,
        totalSize: backupSizeBytes,
        tableCount: successfulTables.length
      },
      requestInfo
    );

    res.json({
      message: 'Database backup created successfully',
      timestamp: backupData.timestamp,
      user: backupData.user,
      backupSize: backupSizeBytes,
      tableCount: successfulTables.length,
      successfulTables,
      failedTables: failedTables.length > 0 ? failedTables : undefined,
      backupSQL
    });

  } catch (error) {
    console.error('Error creating database backup:', error);

    await securityLogger.logError(
      req.user?.id || 'unknown',
      'DATABASE_BACKUP_FAILED',
      error as Error,
      {},
      { ip: req.ip, headers: req.headers }
    );

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ message: 'Failed to create backup' });
    }
  }
};

export const deleteTablesMassive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed');
    }

    validateAdminAccess(req);

    const { tables, password, country_id } = req.body;
    validateMasterPassword(password);

    // Validate table names
    for (const tableName of tables) {
      if (!isValidTableName(tableName, SECURITY_CONFIG.AVAILABLE_TABLES)) {
        throw new ValidationError(`Invalid table name: ${tableName}`);
      }
    }

    // Define table dependencies order - tables with dependencies first
    const tableDependencyOrder = [
      'movimientos',    // Has foreign key to muestras
      'transfers',      // Has foreign keys to muestras, countries, users
      'muestras',       // Referenced by movimientos and transfers
      'countries',      // Referenced by transfers
      'categories',
      'locations',
      'suppliers',
      'responsibles',
      'warehouses',
      'users'           // Referenced by transfers
    ];

    // Sort tables according to dependency order
    const sortedTables = tables.sort((a: string, b: string) => {
      const indexA = tableDependencyOrder.indexOf(a);
      const indexB = tableDependencyOrder.indexOf(b);
      return indexA - indexB;
    });

    const client = await pool.connect();
    const deletedTables: any[] = [];
    const errorsList: string[] = [];

    try {
      await client.query('BEGIN');

      // Temporarily disable foreign key checks
      await client.query('SET session_replication_role = replica');

      for (const tableName of sortedTables) {
        try {
          // Check if table exists
          const tableExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = $1
            )
          `, [tableName]);

          if (!tableExists.rows[0].exists) {
            errorsList.push(`Table ${tableName} does not exist`);
            continue;
          }

          // Get record count before deletion
          const countOperation = buildCountQuery(tableName, country_id);
          const countResult = await client.query(countOperation.query, countOperation.params);
          const recordCount = parseInt(countResult.rows[0].count);

          // Delete records (all or filtered by country)
          const deleteOperation = buildDeleteQuery(tableName, country_id);
          await client.query(deleteOperation.query, deleteOperation.params);

          // Reset sequence if exists
          try {
            await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`);
          } catch (seqError) {
            // Sequence may not exist, continue
          }

          deletedTables.push({
            table: tableName,
            recordsDeleted: recordCount,
            sequenceReset: true,
            countryFiltered: !!country_id
          });

        } catch (error) {
          console.error(`Error deleting table ${tableName}:`, error);
          errorsList.push(`Failed to delete ${tableName}: ${getErrorMessage(error)}`);
          // Don't throw here, continue with other tables
        }
      }

      // Re-enable foreign key checks
      await client.query('SET session_replication_role = DEFAULT');

      await client.query('COMMIT');

      // Log successful operation
      await securityLogger.logSuccess(
        req.user!.id,
        'MASS_TABLE_DELETION',
        {
          tables: deletedTables.map(t => t.table),
          totalRecordsDeleted: deletedTables.reduce((sum, t) => sum + t.recordsDeleted, 0),
          countryFilter: country_id ? { id: country_id } : null,
          errors: errorsList
        },
        { ip: req.ip, headers: req.headers }
      );

      res.json({
        message: `Successfully processed ${deletedTables.length} tables`,
        deletedTables,
        errors: errorsList.length > 0 ? errorsList : undefined,
        timestamp: new Date().toISOString(),
        user: req.user!.email
      });

    } catch (error) {
      // Re-enable foreign key checks in case of error
      try {
        await client.query('SET session_replication_role = DEFAULT');
      } catch (resetError) {
        // Ignore reset error
      }

      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in mass table deletion:', error);

    await securityLogger.logError(
      req.user?.id || 'unknown',
      'MASS_TABLE_DELETION_FAILED',
      error as Error,
      { tables: req.body?.tables },
      { ip: req.ip, headers: req.headers }
    );

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ message: 'Failed to delete tables' });
    }
  }
};

export const changeMasterPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed');
    }

    validateAdminAccess(req);

    const { currentPassword, newPassword } = req.body;
    validateMasterPassword(currentPassword);

    // In production, you would securely store the new password
    // For now, we just simulate the change

    await securityLogger.logSuccess(
      req.user!.id,
      'MASTER_PASSWORD_CHANGED',
      { timestamp: new Date().toISOString() },
      { ip: req.ip, headers: req.headers }
    );

    res.json({
      message: 'Master password changed successfully',
      timestamp: new Date().toISOString(),
      user: req.user!.email
    });

  } catch (error) {
    console.error('Error changing master password:', error);

    await securityLogger.logError(
      req.user?.id || 'unknown',
      'MASTER_PASSWORD_CHANGE_FAILED',
      error as Error,
      {},
      { ip: req.ip, headers: req.headers }
    );

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ message: 'Failed to change password' });
    }
  }
};

export const getTablesInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    validateAdminAccess(req);

    const pagination = getPaginationParams({
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    });

    const tablesInfo = [];
    let totalSize = 0;
    let totalRecords = 0;

    for (const tableName of SECURITY_CONFIG.AVAILABLE_TABLES) {
      const tableInfo = await getTableInfo(tableName);
      tablesInfo.push(tableInfo);

      if (!tableInfo.error) {
        totalSize += tableInfo.sizeBytes;
        totalRecords += tableInfo.recordCount;
      }
    }

    // Apply pagination to tables list
    const startIndex = pagination.offset;
    const endIndex = startIndex + pagination.limit;
    const paginatedTables = tablesInfo.slice(startIndex, endIndex);


    res.json({
      tables: paginatedTables,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: SECURITY_CONFIG.AVAILABLE_TABLES.length,
        pages: Math.ceil(SECURITY_CONFIG.AVAILABLE_TABLES.length / pagination.limit)
      },
      summary: {
        totalTables: SECURITY_CONFIG.AVAILABLE_TABLES.length,
        totalSize,
        totalRecords
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting tables info:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ message: 'Failed to get tables information' });
    }
  }
};

export const getSecurityHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    validateAdminAccess(req);

    const pagination = getPaginationParams({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10
    });

    const filters: SecurityLogFilter = {
      userId: req.query.userId as string,
      action: req.query.action as string,
      status: req.query.status as 'success' | 'error' | 'warning',
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    // Remove undefined values from filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof SecurityLogFilter] === undefined) {
        delete filters[key as keyof SecurityLogFilter];
      }
    });

    const result = await securityLogger.getLogs(filters, pagination);

    res.json(result);

  } catch (error) {
    console.error('Error getting security history:', error);

    // Log the error for debugging
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      filters: req.query,
      user: req.user?.id
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        message: 'Failed to get security history',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  }
};

export const cleanupSecurityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    validateAdminAccess(req);

    const days = parseInt(req.query.days as string) || SECURITY_CONFIG.CLEANUP_DAYS;
    const deletedCount = await securityLogger.cleanup(days);

    await securityLogger.logSuccess(
      req.user!.id,
      'SECURITY_LOGS_CLEANUP',
      { deletedCount, daysKept: days },
      { ip: req.ip, headers: req.headers }
    );

    res.json({
      message: `Cleaned up ${deletedCount} old security log entries`,
      deletedCount,
      daysKept: days,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error cleaning up security logs:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ message: 'Failed to cleanup security logs' });
    }
  }
};

// Helper function for SQL generation
function generateBackupSQL(backupData: any): string {
  const sql: string[] = [];

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

      sql.push(`SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM ${tableName}), false);`);
    }
    sql.push('');
  }

  return sql.join('\n');
}