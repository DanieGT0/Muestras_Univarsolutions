import express, { Request, Response, NextFunction } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  changeUserPassword,
  getUsersValidation,
  createUserValidation,
  updateUserValidation,
  changePasswordValidation
} from '../controllers/usersController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Routes registered:

// Get all users with pagination
router.get('/', getUsersValidation, getUsers);

// Get user statistics
router.get('/stats', getUserStats);

// Create new user
router.post('/', createUserValidation, createUser);

// Update user
router.put('/:id', updateUserValidation, updateUser);

// Change user password
router.put('/:id/change-password', changePasswordValidation, changeUserPassword);

// Delete user
router.delete('/:id', deleteUser);

export default router;