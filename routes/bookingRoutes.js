import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createBooking,
    updateBookingStatus,
    getBookings
} from '../controllers/bookingController.js';

const router = express.Router();

// Student Routes
// Student can create a booking
router.post('/', authenticate, authorize('student'), createBooking);

// Student can view their own bookings
router.get('/student', authenticate, authorize('student'), getBookings);

//  Owner/Admin Routes 
// Owner/Admin can approve or reject a booking
router.put('/:bookingId/status', authenticate, authorize('owner', 'admin'), updateBookingStatus);

// Owner/Admin can view bookings for their hostels
router.get('/owner', authenticate, authorize('owner', 'admin'), getBookings);

export default router;
