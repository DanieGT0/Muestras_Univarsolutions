import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './config/database';
import { runStartupMigrations } from './utils/migrations';

// JWT secret validation
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is not defined!');
  console.error('🚨 Application cannot start without a secure JWT_SECRET');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short!');
  console.error('🚨 JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

const commonSecrets = ['secret', 'jwt_secret', 'your_jwt_secret_here', '123456', 'password'];
if (commonSecrets.includes(process.env.JWT_SECRET.toLowerCase())) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is using a common/weak value!');
  console.error('🚨 Please use a cryptographically secure random string');
  process.exit(1);
}

// Import routes
import authRoutes from './routes/auth';
import samplesRoutes from './routes/samples';
import securityRoutes from './routes/security';
import movementsRoutes from './routes/movements';
import kardexRoutes from './routes/kardex';
import transfersRoutes from './routes/transfers';
import usersRoutes from './routes/users';
import countriesRoutes from './routes/countries';
import categoriesRoutes from './routes/categories';
import suppliersRoutes from './routes/suppliers';
import locationsRoutes from './routes/locations';
import warehousesRoutes from './routes/warehouses';
import responsiblesRoutes from './routes/responsibles';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import importsRoutes from './routes/imports';

// Import CSRF protection
import { csrfProtection, getCSRFToken } from './middleware/csrfProtection';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with CSRF protection
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for dashboard exports
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for inline scripts in React
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for styled-components
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting - Security protection optimized for multiple users per office
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 600, // Supports up to 20 users per office IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});
app.use(generalLimiter);

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 login attempts per IP
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    console.warn(`🚨 Auth rate limit exceeded for IP: ${req.ip} - Potential brute force attack`);
    res.status(429).json({
      error: 'Too many login attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'https://muestras-univarsolutions-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

console.log('🌐 CORS Configuration loaded. Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for origin:', origin);
      return callback(null, true);
    }

    console.log('🚫 CORS blocked origin:', origin);
    console.log('📋 Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-CSRF-Token']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Sample Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoints - Only available in development
if (process.env.NODE_ENV === 'development') {
  // Debug endpoint for CORS configuration
  app.get('/debug/cors', (req, res) => {
    res.json({
      allowedOrigins,
      environment: {
        FRONTEND_URL: process.env.FRONTEND_URL,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        NODE_ENV: process.env.NODE_ENV
      },
      requestOrigin: req.headers.origin
    });
  });

  // Debug endpoint for auth token verification
  app.get('/debug/auth', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    res.json({
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      headers: {
        authorization: req.headers['authorization'],
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
      }
    });
  });
}

// CSRF token endpoint (must be authenticated)
app.get('/api/csrf-token', authenticateToken, getCSRFToken);

// API routes with security protections
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/samples', authenticateToken, csrfProtection, samplesRoutes);
app.use('/api/security', authenticateToken, csrfProtection, securityRoutes);
app.use('/api/movements', authenticateToken, csrfProtection, movementsRoutes);
app.use('/api/kardex', authenticateToken, csrfProtection, kardexRoutes);
app.use('/api/transfers', authenticateToken, csrfProtection, transfersRoutes);
app.use('/api/users', authenticateToken, csrfProtection, usersRoutes);
app.use('/api/countries', authenticateToken, csrfProtection, countriesRoutes);
app.use('/api/categories', authenticateToken, csrfProtection, categoriesRoutes);
app.use('/api/suppliers', authenticateToken, csrfProtection, suppliersRoutes);
app.use('/api/locations', authenticateToken, csrfProtection, locationsRoutes);
app.use('/api/warehouses', authenticateToken, csrfProtection, warehousesRoutes);
app.use('/api/responsibles', authenticateToken, csrfProtection, responsiblesRoutes);
app.use('/api/dashboard', authenticateToken, csrfProtection, dashboardRoutes);
app.use('/api/export', authenticateToken, csrfProtection, exportRoutes);
app.use('/api/imports', authenticateToken, csrfProtection, importsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Security-enhanced error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log full error details securely (server-side only)
  console.error('Security Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determine if this is a validation error or other known error
  const isTrustedError = err.name === 'ValidationError' ||
                        err.name === 'CastError' ||
                        (err as any).statusCode < 500;

  // Generic error response - never expose internal details in production
  const response = {
    success: false,
    message: isTrustedError ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    // Only include error details in development
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5) // Limit stack trace
    })
  };

  const statusCode = (err as any).statusCode || (err as any).status || 500;
  res.status(statusCode).json(response);
});

// Test database connection and run migrations
async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully');

    // Run migrations after successful connection
    await runStartupMigrations();

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Health check available at http://localhost:${PORT}/health`);

  try {
    await testDatabaseConnection();
    console.log('🎯 Server is ready to accept requests');
    console.log('🔄 Server will keep running...');
  } catch (error) {
    console.error('❌ Server startup failed due to database connection error:', error);
    // Don't exit, just log the error - continue running without DB for now
    console.log('⚠️  Server will continue without database connection');
  }
});

// Keep the server reference and handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', () => {
  console.log('❌ Server closed');
});

// Add process event handlers to debug what's causing the exit
process.on('exit', (code) => {
  console.log(`❌ Process exiting with code: ${code}`);
  console.trace('Exit stack trace:');
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  // Don't exit on unhandled rejection in development
});

process.on('SIGTERM', (signal) => {
  console.log(`💀 Received SIGTERM signal: ${signal}`);
});

process.on('SIGINT', (signal) => {
  console.log(`💀 Received SIGINT signal: ${signal}`);
});

// Prevent the process from exiting prematurely
process.on('beforeExit', (code) => {
  console.log(`⚠️  Process about to exit with code: ${code}`);
  console.trace('Before exit stack trace:');
});