export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function getPaginationParams(options: PaginationOptions = {}): PaginationResult {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    maxLimit = MAX_LIMIT
  } = options;

  // Validar y sanitizar parámetros
  const validPage = Math.max(1, Math.floor(page));
  const validLimit = Math.min(Math.max(1, Math.floor(limit)), maxLimit);
  const offset = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    offset,
    skip: offset
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationResult
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    }
  };
}

export function buildPaginationQuery(
  baseQuery: string,
  pagination: PaginationResult,
  orderBy = 'id DESC'
): string {
  return `
    ${baseQuery}
    ORDER BY ${orderBy}
    LIMIT $1 OFFSET $2
  `;
}