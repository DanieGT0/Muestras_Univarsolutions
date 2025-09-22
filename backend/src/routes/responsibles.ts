import express from 'express';
import {
  getResponsibles,
  createResponsible,
  updateResponsible,
  deleteResponsible,
  createResponsibleValidation,
  updateResponsibleValidation
} from '../controllers/responsiblesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getResponsibles);
router.post('/', createResponsibleValidation, createResponsible);
router.put('/:id', updateResponsibleValidation, updateResponsible);
router.delete('/:id', deleteResponsible);

export default router;