import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import {
    requestRegistrationOtp,
    registerStudent,
    registerOwner,
    login,
    forgotPassword,
    resetPassword,
    refresh,
    logout
} from '../controllers/authController.js';

import hostelRoutes from './hostelRoutes.js';
import dashboardRoutes from './dashboardRoutes.js'; // new
import bookingRoutes from "./bookingRoutes.js";
import visitRoutes from './visitRoutes.js';
import metadataRoutes from './metadataRoutes.js';
import roomRoutes from './roomRoutes.js';
import chatRoutes from './chatRoutes.js';
import profileRoutes from './profileRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';

import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(cookieParser());

// Rate Limiters
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 OTP requests per `window`
    message: { error: 'Too many OTP requests from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 registration attempts per `window`
    message: { error: 'Too many registration attempts from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth
router.post('/register-request', otpLimiter, requestRegistrationOtp);
router.post('/register/student', registerLimiter, registerStudent);
router.post('/register/owner', registerLimiter, registerOwner);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);


// Profile
router.use('/profile', profileRoutes);

// Metadata (Public)
router.use('/metadata', metadataRoutes);

// Hostel CRUD
router.use('/hostels', hostelRoutes);


// Dashboard
router.use('/dashboard', dashboardRoutes); // new

// Room CRUD
router.use('/rooms', roomRoutes); // new

router.use('/bookings', bookingRoutes);

router.use('/visits', visitRoutes);

// Chat
router.use('/chat', chatRoutes); // Added route
// Payments
router.use('/payments', paymentRoutes);
// Reviews
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);


export default router;
