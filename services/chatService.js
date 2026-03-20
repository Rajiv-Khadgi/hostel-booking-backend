import { Conversation, Message, User, sequelize } from '../config/database.js';
import { Op } from 'sequelize';

class ChatService {

    // Start or Get Conversation
    async startConversation(userId1, userId2) {
        // Ensure consistent ordering to avoid duplicate conversations (smaller ID first)
        const [p1, p2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

        // Check availability
        let conversation = await Conversation.findOne({
            where: {
                participant1_id: p1,
                participant2_id: p2
            }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participant1_id: p1,
                participant2_id: p2
            });
        }

        return conversation;
    }

    // Get User Conversations
    async getUserConversations(userId) {
        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    { participant1_id: userId },
                    { participant2_id: userId }
                ]
            },
            include: [
                { model: User, as: 'participant1', attributes: ['user_id', 'first_name', 'last_name', 'profile_image'] },
                { model: User, as: 'participant2', attributes: ['user_id', 'first_name', 'last_name', 'profile_image'] },
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['created_at', 'DESC']] // Fetch last message for preview
                }
            ],
            order: [['last_message_at', 'DESC']]
        });

        // Add unread count for each conversation
        const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.count({
                where: {
                    conversation_id: conv.conversation_id,
                    sender_id: { [Op.ne]: userId },
                    is_read: false
                }
            });
            // Plain object to add custom property
            const plain = conv.get({ plain: true });
            plain.unreadCount = unreadCount;
            return plain;
        }));

        return enrichedConversations;
    }

    // Check if user is participant
    async isParticipant(conversationId, userId) {
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) return false;
        return conversation.participant1_id === userId || conversation.participant2_id === userId;
    }

    // Get Messages in Conversation
    async getMessages(conversationId) {
        return await Message.findAll({
            where: { conversation_id: conversationId },
            include: [
                { model: User, as: 'sender', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']]
        });
    }

    // Save Message (Used by Socket and HTTP)
    async saveMessage(conversationId, senderId, content, attachmentUrl = null) {
        const message = await Message.create({
            conversation_id: conversationId,
            sender_id: senderId,
            content,
            attachment_url: attachmentUrl
        });

        // Update conversation last_message_at
        await Conversation.update(
            { last_message_at: new Date() },
            { where: { conversation_id: conversationId } }
        );

        return await Message.findByPk(message.message_id, {
            include: [{ model: User, as: 'sender', attributes: ['user_id', 'first_name', 'last_name', 'profile_image'] }]
        });
    }

    // Mark messages as read
    async markMessagesAsRead(conversationId, userId) {
        return await Message.update(
            { is_read: true },
            {
                where: {
                    conversation_id: conversationId,
                    sender_id: { [Op.ne]: userId },
                    is_read: false
                }
            }
        );
    }
}

export default new ChatService();
