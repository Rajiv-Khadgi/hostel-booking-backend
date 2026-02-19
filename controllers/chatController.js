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

