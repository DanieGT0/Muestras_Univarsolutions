import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getMovements,
  getMovementsStats,
  createMovement,
  getMovement,
  deleteMovement,
  createMovementValidation
} from '../controllers/movementsController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get movements statistics (must be before /:id route)
router.get('/stats', getMovementsStats);

// Get all movements with pagination and filters
router.get('/', getMovements);

// Create new movement
router.post('/', createMovementValidation, createMovement);

// Get movement by ID
router.get('/:id', getMovement);

// Delete movement (admin only)
router.delete('/:id', deleteMovement);

export default router;