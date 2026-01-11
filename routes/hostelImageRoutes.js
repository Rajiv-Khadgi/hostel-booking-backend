import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadHostelImage as upload } from '../middleware/uploadMiddleware.js';
import {
    uploadHostelImage,
    getHostelImages,
    deleteHostelImage
} from '../controllers/hostelImageController.js';

const router = express.Router();

// Upload image (owner/admin)
router.post(
    '/:id/images',
    authenticate,
    upload.single('image'),
    uploadHostelImage
);

// Get images (public)
router.get('/:id/images', getHostelImages);

// Delete image (owner/admin)
router.delete(
    '/images/:imageId',
    authenticate,
    deleteHostelImage
);

export default router;
