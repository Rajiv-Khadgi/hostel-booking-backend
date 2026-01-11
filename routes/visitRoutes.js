import express from 'express';
import {
    scheduleVisit,
    updateVisitStatus,
    getVisits
} from '../controllers/visitController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Student
router.post('/', authenticate, scheduleVisit);
router.get('/', authenticate, getVisits);

// Owner
router.patch('/:visitId/status', authenticate, updateVisitStatus);

export default router;
