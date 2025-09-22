import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getKardexEntries,
  getKardexSummary,
  getKardexBySample,
  exportKardex
} from '../controllers/kardexController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all kardex entries with pagination and filters
router.get('/', getKardexEntries);

// Get kardex summary (samples with movement statistics)
router.get('/summary', getKardexSummary);

// Export kardex data
router.get('/export', exportKardex);

// Get kardex entries for specific sample
router.get('/sample/:sampleId', getKardexBySample);

export default router;