import express from 'express';
import { getSamples, createSample, getSample, updateSample, deleteSample, createSampleValidation } from '../controllers/samplesController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getSamples);
router.post('/', createSampleValidation, createSample);
router.get('/:id', getSample);
router.put('/:id', createSampleValidation, updateSample);
router.delete('/:id', deleteSample);

export default router;