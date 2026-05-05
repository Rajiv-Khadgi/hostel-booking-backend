import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Get Profile
router.get('/', authenticate, getProfile);

// Update Profile (with image upload)
router.put('/', authenticate, uploadImage.single('profile_image'), updateProfile);

export default router;
