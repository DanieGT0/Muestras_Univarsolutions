import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  exportSamples,
  exportMovements,
  exportAllKardex,
  exportKardex,
  exportTransfers,
  exportUsers
} from '../controllers/exportController';

const router = Router();

// All export routes require authentication
router.use(authenticateToken);

// Export samples - accessible by all authenticated users with country filtering
router.get('/samples', exportSamples);

// Export movements - accessible by all authenticated users with country filtering
router.get('/movements', exportMovements);

// Export all kardex - accessible by all authenticated users with country filtering
router.get('/kardex', exportAllKardex);

// Export kardex for specific sample - accessible by all authenticated users with country filtering
router.get('/kardex/:sampleId', exportKardex);

// Export transfers - accessible by all authenticated users with country filtering
router.get('/transfers', exportTransfers);

// Export users - accessible only by ADMIN users
router.get('/users', exportUsers);

export default router;