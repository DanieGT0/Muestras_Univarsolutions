import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  downloadCountriesTemplate,
  downloadCategoriesTemplate,
  downloadSuppliersTemplate,
  downloadWarehousesTemplate,
  downloadLocationsTemplate,
  downloadResponsiblesTemplate,
  importCountries,
  importCategories,
  importSuppliers,
  importWarehouses,
  importLocations,
  importResponsibles,
  uploadMiddleware
} from '../controllers/configImportController';

const router = Router();

// Todas las rutas requieren autenticación y rol ADMIN
router.use(authenticateToken);
router.use(requireAdmin);

// RUTAS DE DESCARGA DE PLANTILLAS

// GET /api/config-imports/countries/template
router.get('/countries/template', downloadCountriesTemplate);

// GET /api/config-imports/categories/template
router.get('/categories/template', downloadCategoriesTemplate);

// GET /api/config-imports/suppliers/template
router.get('/suppliers/template', downloadSuppliersTemplate);

// GET /api/config-imports/warehouses/template
router.get('/warehouses/template', downloadWarehousesTemplate);

// GET /api/config-imports/locations/template
router.get('/locations/template', downloadLocationsTemplate);

// GET /api/config-imports/responsibles/template
router.get('/responsibles/template', downloadResponsiblesTemplate);

// RUTAS DE IMPORTACIÓN

// POST /api/config-imports/countries/import
router.post('/countries/import', uploadMiddleware, importCountries);

// POST /api/config-imports/categories/import
router.post('/categories/import', uploadMiddleware, importCategories);

// POST /api/config-imports/suppliers/import
router.post('/suppliers/import', uploadMiddleware, importSuppliers);

// POST /api/config-imports/warehouses/import
router.post('/warehouses/import', uploadMiddleware, importWarehouses);

// POST /api/config-imports/locations/import
router.post('/locations/import', uploadMiddleware, importLocations);

// POST /api/config-imports/responsibles/import
router.post('/responsibles/import', uploadMiddleware, importResponsibles);

export default router;
