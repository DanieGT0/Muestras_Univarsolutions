import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getTransfers,
  createTransfer,
  getTransfer,
  updateTransfer,
  cancelTransfer,
  deleteTransfer,
  createTransferValidation,
  updateTransferValidation
} from '../controllers/transfersController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all transfers with pagination and filters
router.get('/', getTransfers);

// Create new transfer
router.post('/', createTransferValidation, createTransfer);

// Get transfer by ID
router.get('/:id', getTransfer);

// Update transfer status (receive/reject)
router.put('/:id', updateTransferValidation, updateTransfer);

// Cancel transfer (admin only) - for ENVIADO status
router.put('/:id/cancel', cancelTransfer);

// Delete transfer (admin only) - for COMPLETADO/RECHAZADO status
router.delete('/:id', deleteTransfer);

export default router;