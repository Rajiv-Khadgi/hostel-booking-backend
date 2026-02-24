import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    createRoom,
    updateRoom,
    deleteRoom,
    getRooms,
    getRoomById,
    uploadRoomImages,
    deleteRoomImage
} from '../controllers/roomController.js';
import { uploadPropertyImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getRooms);
router.get('/:id', getRoomById);

// Owner/Admin only
router.post('/', authenticate, authorize('owner', 'admin'), createRoom);
router.put('/:id', authenticate, authorize('owner', 'admin'), updateRoom);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteRoom);
router.post('/:id/images', authenticate, authorize('owner', 'admin'), uploadPropertyImage.array('images', 10), uploadRoomImages);
router.delete('/:id/images/:imageId', authenticate, authorize('owner', 'admin'), deleteRoomImage);

export default router;
