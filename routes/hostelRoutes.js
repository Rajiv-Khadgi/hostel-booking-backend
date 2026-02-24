import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

import {
    createHostel,
    updateHostel,
    deleteHostel,
    getHostels,
    getMyHostels,
    getHostelById,
    approveHostel,
    rejectHostel,
    saveHostel,
    unsaveHostel,
    getSavedHostels,
    uploadHostelImages,
    deleteHostelImage
} from '../controllers/hostelController.js';
import { uploadPropertyImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Saved Hostels 
router.get('/saved', authenticate, getSavedHostels);
router.post('/:id/save', authenticate, saveHostel);
router.delete('/:id/save', authenticate, unsaveHostel);

// Owner/Admin only
router.get('/my-hostels', authenticate, authorize('owner', 'admin'), getMyHostels);

// Public route
router.get('/', getHostels);
router.get('/:id', getHostelById);

// More Owner/Admin only
router.post('/', authenticate, authorize('owner', 'admin'), createHostel);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateHostel);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteHostel);
router.patch('/:id/approve', authenticate, authorize('admin'), approveHostel);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectHostel);
router.post('/:id/images', authenticate, authorize('owner', 'admin'), uploadPropertyImage.array('images', 10), uploadHostelImages);
router.delete('/:id/images/:imageId', authenticate, authorize('owner', 'admin'), deleteHostelImage);

export default router;
