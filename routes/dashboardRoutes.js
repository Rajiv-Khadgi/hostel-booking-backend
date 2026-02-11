import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authenticate, getDashboardStats);

export default router;
