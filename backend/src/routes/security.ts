import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  createDatabaseBackup,
  deleteTablesMassive,
  changeMasterPassword,
  getTablesInfo,
  getSecurityHistory,
  cleanupSecurityLogs,
  changePasswordValidation,
  deleteTablesValidation
} from '../controllers/securityController';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Crear backup completo de base de datos
router.post('/backup', createDatabaseBackup);

// Eliminar tablas masivamente con contraseña
router.post('/delete-tables', deleteTablesValidation, deleteTablesMassive);

// Cambiar contraseña maestra
router.post('/change-password', changePasswordValidation, changeMasterPassword);

// Obtener información de tablas disponibles
router.get('/tables-info', getTablesInfo);

// Obtener historial de acciones de seguridad
router.get('/history', getSecurityHistory);

// Limpiar logs antiguos de seguridad
router.delete('/logs/cleanup', cleanupSecurityLogs);

export default router;