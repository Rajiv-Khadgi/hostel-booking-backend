import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createRoom,
    updateRoom,
    deleteRoom,
    getRooms,
    getRoomById
} from '../controllers/roomController.js';

const router = express.Router();

// Public routes
router.get('/', getRooms);
router.get('/:id', getRoomById);

// Owner/Admin only
router.post('/', authenticate, authorize('owner','admin'), createRoom);
router.put('/:id', authenticate, authorize('owner','admin'), updateRoom);
router.delete('/:id', authenticate, authorize('owner','admin'), deleteRoom);

export default router;
