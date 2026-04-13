import ChatService from '../services/chatService.js';

const mapChatErrorStatus = (message = '') => {
    if (
        message.includes('not allowed') ||
        message.includes('disabled') ||
        message.includes('Not a participant') ||
        message.includes('Cannot start a conversation with yourself')
    ) {
        return 403;
    }

    if (message.includes('not found') || message.includes('Invalid')) {
        return 400;
    }

    return 500;
};

const ensureChatRoleAllowed = (req, res) => {
    if (req.user?.role === 'admin') {
        res.status(403).json({ error: 'Admin chat is disabled' });
        return false;
    }
    return true;
};

// Start/Get Conversation
export const startConversation = async (req, res) => {
    if (!ensureChatRoleAllowed(req, res)) return;

    try {
        const { targetUserId } = req.body; // Targeted receiver
        const conversation = await ChatService.startConversation(req.user.id, targetUserId);
        res.json({ success: true, conversation });
    } catch (err) {
        res.status(mapChatErrorStatus(err.message)).json({ error: err.message });
    }
};

// Get My Conversations
export const getMyConversations = async (req, res) => {
    if (!ensureChatRoleAllowed(req, res)) return;

    try {
        const conversations = await ChatService.getUserConversations(req.user.id);
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(mapChatErrorStatus(err.message)).json({ error: err.message });
    }
};

// Get Messages
export const getMessages = async (req, res) => {
    if (!ensureChatRoleAllowed(req, res)) return;

    try {
        const { id } = req.params; // Conversation ID
        const messages = await ChatService.getMessages(id, req.user.id);
        res.json({ success: true, messages });
    } catch (err) {
        res.status(mapChatErrorStatus(err.message)).json({ error: err.message });
    }
};

// Send Message (HTTP Fallback)
export const sendMessage = async (req, res) => {
    if (!ensureChatRoleAllowed(req, res)) return;

    try {
        const { conversationId, content } = req.body;
        const message = await ChatService.saveMessage(conversationId, req.user.id, content);

        // Note: Real-time emission usually happens in Socket, but this is database persistence
        res.json({ success: true, message });
    } catch (err) {
        res.status(mapChatErrorStatus(err.message)).json({ error: err.message });
    }
};

// Upload Chat File
export const uploadFile = async (req, res) => {
    if (!ensureChatRoleAllowed(req, res)) return;

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Multer-Cloudinary provides path (secure_url) in req.file.path
        const fileUrl = req.file.path;
        res.json({ success: true, fileUrl });
    } catch (err) {
        res.status(mapChatErrorStatus(err.message)).json({ error: err.message });
    }
};
