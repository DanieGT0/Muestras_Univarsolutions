import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { UserRole } from '../types';
import { getMovementsAnalytics, getDashboardStats } from '../controllers/dashboardController';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Dashboard stats - accessible by all authenticated users with country filtering
router.get('/stats', getDashboardStats);

// Movement analytics - accessible by all authenticated users with country filtering
router.get('/movements-analytics', getMovementsAnalytics);

export default router;