import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryValidation,
  updateCategoryValidation
} from '../controllers/categoriesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories
router.get('/', getCategories);

// Create new category
router.post('/', createCategoryValidation, createCategory);

// Update category
router.put('/:id', updateCategoryValidation, updateCategory);

// Delete category
router.delete('/:id', deleteCategory);

export default router;