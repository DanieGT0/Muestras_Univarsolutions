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
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all countries for transfers (unrestricted)
router.get('/transfers', getAllCountriesForTransfers);

// Get all countries (filtered by user role)
router.get('/', getCountries);

// Create new country
router.post('/', createCountryValidation, createCountry);

// Update country
router.put('/:id', updateCountryValidation, updateCountry);

// Delete country
router.delete('/:id', deleteCountry);

export default router;