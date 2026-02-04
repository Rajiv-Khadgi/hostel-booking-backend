import express from 'express';
import { getAmenities, getServices } from '../controllers/metadataController.js';

const router = express.Router();

router.get('/amenities', getAmenities);
router.get('/services', getServices);

export default router;
