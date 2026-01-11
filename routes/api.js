import express from 'express';
import cookieParser from 'cookie-parser';

import {
    registerStudent,
    registerOwner,
    login,
    forgotPassword,
    resetPassword,
    refresh,
    logout,
    profile
} from '../controllers/authController.js';

import hostelRoutes from './hostelRoutes.js';
import roomRoutes from './roomRoutes.js'; // new
import hostelImageRoutes from "./hostelImageRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import visitRoutes from './visitRoutes.js';

import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(cookieParser());

// Auth
router.post('/register/student', registerStudent);
router.post('/register/owner', registerOwner);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/profile', authenticate, profile);

// Hostel CRUD
router.use('/hostels', hostelRoutes);


router.use('/hostels', hostelImageRoutes);
// Room CRUD
router.use('/rooms', roomRoutes); // new

router.use('/bookings', bookingRoutes);

router.use('/visits', visitRoutes);


export default router;
