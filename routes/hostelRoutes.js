import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

import {
    createHostel,
    updateHostel,
    getHostelMetadata,
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
    deleteHostelImage,
    getNearbyHostels,
    setHostelCoverImage
} from '../controllers/hostelController.js';
import { getHostelReviews, createReview } from '../controllers/reviewController.js';
import { uploadPropertyImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Saved Hostels 
router.get('/saved', authenticate, getSavedHostels);
router.post('/:id/save', authenticate, saveHostel);
router.delete('/:id/save', authenticate, unsaveHostel);

// Owner/Admin only
router.get('/my-hostels', authenticate, authorize('owner', 'admin'), getMyHostels);

// Public route
router.get('/metadata', getHostelMetadata);
router.get('/', getHostels);
router.get('/nearby', getNearbyHostels);
router.get('/:id', getHostelById);
router.get('/:hostelId/reviews', getHostelReviews);

// Student Only
router.post('/:hostelId/reviews', authenticate, authorize('student'), createReview);

// More Owner/Admin only
router.post('/', authenticate, authorize('owner', 'admin'), createHostel);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateHostel);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteHostel);
router.patch('/:id/approve', authenticate, authorize('admin'), approveHostel);
router.patch('/:id/reject', authenticate, authorize('admin'), rejectHostel);
router.post('/:id/images', authenticate, authorize('owner', 'admin'), uploadPropertyImage.array('images', 5), uploadHostelImages);
router.delete('/:id/images/:imageId', authenticate, authorize('owner', 'admin'), deleteHostelImage);
router.put('/:id/images/:imageId/set-cover', authenticate, authorize('owner', 'admin'), setHostelCoverImage);

export default router;
