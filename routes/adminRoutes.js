import express from 'express';
import { 
    getAllUsers, 
    updateUserStatus, 
    getAllHostels, 
    deleteHostelAdmin, 
    updateHostelStatusAdmin,
    getAllReviews, 
    deleteReviewAdmin 
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All admin routes must be authenticated and have the admin role
router.use(authenticate);
router.use(authorize('admin'));

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);

// Hostel management
router.get('/hostels', getAllHostels);
router.patch('/hostels/:id/status', updateHostelStatusAdmin);
router.delete('/hostels/:id', deleteHostelAdmin);

// Review management
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReviewAdmin);

export default router;
