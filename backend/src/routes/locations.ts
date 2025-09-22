import express from 'express';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  createLocationValidation,
  updateLocationValidation
} from '../controllers/locationsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getLocations);
router.post('/', createLocationValidation, createLocation);
router.put('/:id', updateLocationValidation, updateLocation);
router.delete('/:id', deleteLocation);

export default router;