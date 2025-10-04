import express from 'express';
import {
  getCountries,
  getAllCountriesForTransfers,
  createCountry,
  updateCountry,
  deleteCountry,
  createCountryValidation,
  updateCountryValidation
} from '../controllers/countriesController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all countries for transfers (unrestricted)
router.get('/transfers', getAllCountriesForTransfers);

// Get all countries (filtered by user role)
router.get('/', getCountries);

// Create new country (admin only)
router.post('/', requireAdmin, createCountryValidation, createCountry);

// Update country (admin only)
router.put('/:id', requireAdmin, updateCountryValidation, updateCountry);

// Delete country (admin only)
router.delete('/:id', requireAdmin, deleteCountry);

export default router;