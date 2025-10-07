import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getKardexEntries,
  getKardexStats,
  getKardexSummary,
  getKardexBySample,
  exportKardex
} from '../controllers/kardexController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get kardex statistics (must be before other routes)
router.get('/stats', getKardexStats);

// Get kardex summary (samples with movement statistics)
router.get('/summary', getKardexSummary);

// Export kardex data
router.get('/export', exportKardex);

// Get all kardex entries with pagination and filters
router.get('/', getKardexEntries);

// Get kardex entries for specific sample
router.get('/sample/:sampleId', getKardexBySample);

export default router;