import express from 'express';
import { login, register, loginValidation, registerValidation } from '../controllers/authController';

const router = express.Router();

router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register);

export default router;