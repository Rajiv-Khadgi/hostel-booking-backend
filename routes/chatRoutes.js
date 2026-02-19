import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadChatFile } from '../middleware/uploadMiddleware.js';
import {
    startConversation,
    getMyConversations,
    getMessages,
    sendMessage,
    uploadFile
} from '../controllers/chatController.js';

const router = express.Router();

router.post('/conversations', authenticate, startConversation);
router.get('/conversations', authenticate, getMyConversations);
router.get('/conversations/:id/messages', authenticate, getMessages);
router.post('/messages', authenticate, sendMessage);
router.post('/upload', authenticate, uploadChatFile.single('file'), uploadFile);

export default router;
