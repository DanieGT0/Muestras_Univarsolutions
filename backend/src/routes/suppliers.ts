import express from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSupplierValidation,
  updateSupplierValidation
} from '../controllers/suppliersController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getSuppliers);
router.post('/', createSupplierValidation, createSupplier);
router.put('/:id', updateSupplierValidation, updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;