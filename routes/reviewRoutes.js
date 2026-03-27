import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createReview,
    getHostelReviews,
    updateReview,
    deleteReview,
    replyToReview,
    flagReview
} from '../controllers/reviewController.js';

const router = express.Router();

// Student: Update own review
router.put('/:id', authenticate, authorize('student'), updateReview);

// Student/Admin: Delete review
router.delete('/:id', authenticate, deleteReview);

// Owner: Reply to review
router.patch('/:id/reply', authenticate, authorize('owner'), replyToReview);

// Owner: Flag review
router.patch('/:id/flag', authenticate, authorize('owner'), flagReview);

export default router;
