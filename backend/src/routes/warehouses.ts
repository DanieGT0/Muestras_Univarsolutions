import express from 'express';
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createWarehouseValidation,
  updateWarehouseValidation
} from '../controllers/warehousesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getWarehouses);
router.post('/', createWarehouseValidation, createWarehouse);
router.put('/:id', updateWarehouseValidation, updateWarehouse);
router.delete('/:id', deleteWarehouse);

export default router;