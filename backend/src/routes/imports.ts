import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { downloadTemplate, importSamples, uploadMiddleware } from '../controllers/importsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/imports/template - Descargar plantilla Excel
router.get('/template', downloadTemplate);

// POST /api/imports/samples - Importar muestras desde Excel
router.post('/samples', uploadMiddleware, importSamples);

export default router;