import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createHostel,
    updateHostel,
    deleteHostel,
    getHostels,
    getHostelById
} from '../controllers/hostelController.js';

const router = express.Router();

// Public route
router.get('/', getHostels);
router.get('/:id', getHostelById);

// Owner/Admin only
router.post('/', authenticate, authorize('owner', 'admin'), createHostel);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateHostel);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteHostel);

export default router;
