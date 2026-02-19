import ChatService from '../services/chatService.js';

// Start/Get Conversation
export const startConversation = async (req, res) => {
    try {
        const { targetUserId } = req.body; // Targeted receiver
        const conversation = await ChatService.startConversation(req.user.id, targetUserId);
        res.json({ success: true, conversation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get My Conversations
export const getMyConversations = async (req, res) => {
    try {
        const conversations = await ChatService.getUserConversations(req.user.id);
        res.json({ success: true, conversations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Messages
export const getMessages = async (req, res) => {
    try {
        const { id } = req.params; // Conversation ID
        const messages = await ChatService.getMessages(id);
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Send Message (HTTP Fallback)
export const sendMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const message = await ChatService.saveMessage(conversationId, req.user.id, content);

        // Note: Real-time emission usually happens in Socket, but this is database persistence
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Upload Chat File
export const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Generate URL (Ensure static folder is served)
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, fileUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
