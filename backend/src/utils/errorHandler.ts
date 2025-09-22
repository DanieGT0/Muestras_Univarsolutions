export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function isValidTableName(tableName: string, allowedTables: readonly string[]): boolean {
  return allowedTables.includes(tableName) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
}

export function sanitizeString(input: string, maxLength = 255): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>\"']/g, ''); // Remove potentially dangerous characters
}

export class SecurityError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 403, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 401, code);
  }
}