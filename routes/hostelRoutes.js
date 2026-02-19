import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createHostel,
    updateHostel,
    deleteHostel,
    getHostels,
    getHostelById,
    approveHostel,
    rejectHostel,
    saveHostel,
    unsaveHostel,
    getSavedHostels
} from '../controllers/hostelController.js';

const router = express.Router();

// Saved Hostels 
router.get('/saved', authenticate, getSavedHostels);
router.post('/:id/save', authenticate, saveHostel);
router.delete('/:id/save', authenticate, unsaveHostel);

// Public route
router.get('/', getHostels);
router.get('/:id', getHostelById);

// Owner/Admin only
router.post('/', authenticate, authorize('owner', 'admin'), createHostel);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateHostel);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteHostel);
router.patch('/:id/approve', authenticate, authorize('admin'), approveHostel);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectHostel);

export default router;
