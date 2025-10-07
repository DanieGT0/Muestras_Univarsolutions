import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { downloadTemplate, importSamples, validateImport, confirmImport, uploadMiddleware } from '../controllers/importsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/imports/template - Descargar plantilla Excel
router.get('/template', downloadTemplate);

// POST /api/imports/validate - Validar archivo Excel sin importar
router.post('/validate', uploadMiddleware, validateImport);

// POST /api/imports/confirm - Confirmar e importar datos previamente validados
router.post('/confirm', confirmImport);

// POST /api/imports/samples - Importar muestras desde Excel (método antiguo, mantener por compatibilidad)
router.post('/samples', uploadMiddleware, importSamples);

export default router;