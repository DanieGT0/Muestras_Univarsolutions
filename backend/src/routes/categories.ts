import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryValidation,
  updateCategoryValidation
} from '../controllers/categoriesController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories
router.get('/', getCategories);

// Create new category (admin only)
router.post('/', requireAdmin, createCategoryValidation, createCategory);

// Update category (admin only)
router.put('/:id', requireAdmin, updateCategoryValidation, updateCategory);

// Delete category (admin only)
router.delete('/:id', requireAdmin, deleteCategory);

export default router;