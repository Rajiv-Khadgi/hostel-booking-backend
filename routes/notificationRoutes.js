import express from 'express';
import { getMyNotifications, markRead, markAllRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:notificationId/read', markRead);
router.patch('/read-all', markAllRead);

export default router;
