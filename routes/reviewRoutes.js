import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createReview,
    getHostelReviews,
    getHostelReviewsForOwner,
    getMyHostelReview,
    updateReview,
    deleteReview,
    replyToReview,
    flagReview,
    unflagReview
} from '../controllers/reviewController.js';

const router = express.Router();

// Student: fetch own review for a hostel, including hidden state
router.get('/hostel/:hostelId/me', authenticate, authorize('student'), getMyHostelReview);

// Owner/Admin: manage reviews for a hostel, including flagged entries
router.get('/hostel/:hostelId', authenticate, authorize('owner', 'admin'), getHostelReviewsForOwner);

// Student: Update own review
router.put('/:id', authenticate, authorize('student'), updateReview);

// Student/Admin: Delete review
router.delete('/:id', authenticate, deleteReview);

// Owner: Reply to review
router.patch('/:id/reply', authenticate, authorize('owner'), replyToReview);

// Owner: Flag review
router.patch('/:id/flag', authenticate, authorize('owner'), flagReview);

// Owner/Admin: Restore a flagged review
router.patch('/:id/unflag', authenticate, authorize('owner', 'admin'), unflagReview);

export default router;
