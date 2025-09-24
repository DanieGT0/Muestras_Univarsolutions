import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool from './config/database';
import { runMigrations } from '../scripts/deploy';

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting - Disabled for development troubleshooting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100 to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: () => true // Temporarily disable all rate limiting
});
// app.use(limiter); // Commented out for troubleshooting

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'https://muestras-univarsolutions-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('🚫 CORS blocked origin:', origin);
    console.log('✅ Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/samples', samplesRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/movements', movementsRoutes);
app.use('/api/kardex', kardexRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/responsibles', responsiblesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/imports', importsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
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
    await runMigrations();

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