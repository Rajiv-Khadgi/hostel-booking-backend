import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { uploadChatFile } from '../middleware/uploadMiddleware.js';
import {
    startConversation,
    getMyConversations,
    getMessages,
    sendMessage,
    uploadFile
} from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticate, authorize('student', 'owner'));

router.post('/conversations', startConversation);
router.get('/conversations', getMyConversations);
router.get('/conversations/:id/messages', getMessages);
router.post('/messages', sendMessage);
router.post('/upload', uploadChatFile.single('file'), uploadFile);

export default router;
