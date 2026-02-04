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
import bookingRoutes from "./bookingRoutes.js";
import visitRoutes from './visitRoutes.js';
import metadataRoutes from './metadataRoutes.js';

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

// Metadata (Public)
router.use('/', metadataRoutes);

// Hostel CRUD
router.use('/hostels', hostelRoutes);


// Room CRUD
router.use('/rooms', roomRoutes); // new

router.use('/bookings', bookingRoutes);

router.use('/visits', visitRoutes);


export default router;
