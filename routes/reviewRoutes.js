import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createReview,
    getHostelReviews,
    updateReview,
    deleteReview,
    replyToReview
} from '../controllers/reviewController.js';

const router = express.Router();

// Public: Get reviews for a hostel
router.get('/hostels/:hostelId/reviews', getHostelReviews);

// Student: Create Review
router.post('/hostels/:hostelId/reviews', authenticate, authorize('student'), createReview);

// Student: Update own review
router.put('/reviews/:id', authenticate, authorize('student'), updateReview);

// Student/Admin: Delete review
router.delete('/reviews/:id', authenticate, deleteReview);

// Owner: Reply to review
router.patch('/reviews/:id/reply', authenticate, authorize('owner'), replyToReview);

export default router;
