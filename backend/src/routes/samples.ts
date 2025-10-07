import express from 'express';
import { getSamples, createSample, getSample, updateSample, deleteSample, getSamplesStats, createSampleValidation } from '../controllers/samplesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', getSamplesStats); // Must be before /:id route
router.get('/', getSamples);
router.post('/', createSampleValidation, createSample);
router.get('/:id', getSample);
router.put('/:id', createSampleValidation, updateSample);
router.delete('/:id', deleteSample);

export default router;