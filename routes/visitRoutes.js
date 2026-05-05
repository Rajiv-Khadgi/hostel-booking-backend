import express from 'express';
import {
    scheduleVisit,
    updateVisitStatus,
    getVisits,
    cancelVisit
} from '../controllers/visitController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Student
router.post('/', authenticate, authorize('student'), scheduleVisit);
router.get('/', authenticate, getVisits);
router.patch('/:visitId/cancel', authenticate, authorize('student'), cancelVisit);

// Owner
router.patch('/:visitId/status', authenticate, authorize('owner'), updateVisitStatus);

export default router;
