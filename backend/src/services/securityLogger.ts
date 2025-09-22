import pool from '../config/database';
import { PaginationResult, createPaginatedResponse, buildPaginationQuery } from '../utils/pagination';

export interface SecurityLog {
  id?: number;
  user_id: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'error' | 'warning';
  created_at?: Date;
}

export interface SecurityLogFilter {
  userId?: string;
  action?: string;
  status?: 'success' | 'error' | 'warning';
  dateFrom?: Date;
  dateTo?: Date;
}

export class SecurityLoggerService {
  private static instance: SecurityLoggerService;

  public static getInstance(): SecurityLoggerService {
    if (!SecurityLoggerService.instance) {
      SecurityLoggerService.instance = new SecurityLoggerService();
    }
    return SecurityLoggerService.instance;
  }

  async ensureLogTableExists(): Promise<void> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS security_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          status VARCHAR(50) DEFAULT 'success',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await pool.query(createTableQuery);

      // Create indexes separately to avoid issues if they already exist
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_status ON security_logs(status);',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);'
      ];

      for (const indexQuery of indexes) {
        try {
          await pool.query(indexQuery);
        } catch (indexError) {
          console.warn('Index creation warning:', indexError);
          // Continue if index creation fails
        }
      }
    } catch (error) {
      console.error('Error ensuring security_logs table exists:', error);
      throw error;
    }
  }

  async log(logData: SecurityLog): Promise<number> {
    await this.ensureLogTableExists();

    const query = `
      INSERT INTO security_logs (user_id, action, details, ip_address, user_agent, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      logData.user_id,
      logData.action,
      JSON.stringify(logData.details || {}),
      logData.ip_address,
      logData.user_agent,
      logData.status || 'success'
    ];

    const result = await pool.query(query, values);
    return result.rows[0].id;
  }

  async getLogs(
    filters: SecurityLogFilter = {},
    pagination: PaginationResult
  ) {
    try {
      await this.ensureLogTableExists();

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (filters.userId) {
        conditions.push(`user_id = $${++paramCount}`);
        values.push(filters.userId);
      }

      if (filters.action) {
        conditions.push(`action ILIKE $${++paramCount}`);
        values.push(`%${filters.action}%`);
      }

      if (filters.status) {
        conditions.push(`status = $${++paramCount}`);
        values.push(filters.status);
      }

      if (filters.dateFrom) {
        conditions.push(`created_at >= $${++paramCount}`);
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        conditions.push(`created_at <= $${++paramCount}`);
        values.push(filters.dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM security_logs ${whereClause}`;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data
      const dataQuery = buildPaginationQuery(
        `SELECT
          id, user_id, action, details, ip_address, user_agent, status, created_at
         FROM security_logs ${whereClause}`,
        pagination,
        'created_at DESC'
      );

      const dataValues = [...values, pagination.limit, pagination.offset];
      const dataResult = await pool.query(dataQuery, dataValues);

      return createPaginatedResponse(
        dataResult.rows.map(row => ({
          ...row,
          details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
        })),
        total,
        pagination
      );
    } catch (error) {
      console.error('Error getting security logs:', error);

      // Return empty result if there's an error
      return createPaginatedResponse([], 0, pagination);
    }
  }

  async logSuccess(
    userId: string,
    action: string,
    details: Record<string, any> = {},
    request?: { ip?: string; headers?: any }
  ): Promise<number> {
    return this.log({
      user_id: userId,
      action,
      details,
      ip_address: request?.ip,
      user_agent: request?.headers?.['user-agent'],
      status: 'success'
    });
  }

  async logError(
    userId: string,
    action: string,
    error: Error | string,
    details: Record<string, any> = {},
    request?: { ip?: string; headers?: any }
  ): Promise<number> {
    const errorDetails = {
      ...details,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    };

    return this.log({
      user_id: userId,
      action,
      details: errorDetails,
      ip_address: request?.ip,
      user_agent: request?.headers?.['user-agent'],
      status: 'error'
    });
  }

  async cleanup(daysToKeep = 90): Promise<number> {
    await this.ensureLogTableExists();

    const query = `
      DELETE FROM security_logs
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}