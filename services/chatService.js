import { Conversation, Message, User, sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import NotificationService from './notificationService.js';

class ChatService {
    _isDisallowedPair(role1, role2) {
        if (role1 === 'admin' || role2 === 'admin') return true;
        return role1 === 'owner' && role2 === 'owner';
    }

    async _validateConversationParticipants(participant1Id, participant2Id) {
        const [participant1, participant2] = await Promise.all([
            User.findByPk(participant1Id, { attributes: ['user_id', 'role'] }),
            User.findByPk(participant2Id, { attributes: ['user_id', 'role'] })
        ]);

        if (!participant1 || !participant2) {
            throw new Error('User not found');
        }

        if (participant1.role === 'admin' || participant2.role === 'admin') {
            throw new Error('Admin chat is disabled');
        }

        if (participant1.role === 'owner' && participant2.role === 'owner') {
            throw new Error('Owner-to-owner chat is not allowed');
        }

        return { participant1, participant2 };
    }

    async _getConversationWithParticipants(conversationId) {
        return Conversation.findByPk(conversationId, {
            include: [
                { model: User, as: 'participant1', attributes: ['user_id', 'role'] },
                { model: User, as: 'participant2', attributes: ['user_id', 'role'] }
            ]
        });
    }

    async _assertUserCanAccessConversation(conversationId, userId) {
        const normalizedUserId = Number(userId);
        const conversation = await this._getConversationWithParticipants(conversationId);

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const isParticipant =
            conversation.participant1_id === normalizedUserId ||
            conversation.participant2_id === normalizedUserId;

        if (!isParticipant) {
            throw new Error('Not a participant of this conversation');
        }

        if (this._isDisallowedPair(conversation.participant1.role, conversation.participant2.role)) {
            throw new Error('This conversation is not allowed by role policy');
        }

        return conversation;
    }

    // Start or Get Conversation
    async startConversation(userId1, userId2) {
        const firstUserId = Number(userId1);
        const secondUserId = Number(userId2);

        if (!Number.isInteger(firstUserId) || !Number.isInteger(secondUserId)) {
            throw new Error('Invalid participant ids');
        }

        if (firstUserId === secondUserId) {
            throw new Error('Cannot start a conversation with yourself');
        }

        await this._validateConversationParticipants(firstUserId, secondUserId);

        // Ensure consistent ordering to avoid duplicate conversations (smaller ID first)
        const [p1, p2] = firstUserId < secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];

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
        const normalizedUserId = Number(userId);

        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    { participant1_id: normalizedUserId },
                    { participant2_id: normalizedUserId }
                ]
            },
            include: [
                { model: User, as: 'participant1', attributes: ['user_id', 'first_name', 'last_name', 'profile_image', 'role'] },
                { model: User, as: 'participant2', attributes: ['user_id', 'first_name', 'last_name', 'profile_image', 'role'] },
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['created_at', 'DESC']] // Fetch last message for preview
                }
            ],
            order: [['last_message_at', 'DESC']]
        });

        const eligibleConversations = conversations.filter((conv) => {
            const p1Role = conv.participant1?.role;
            const p2Role = conv.participant2?.role;
            return !this._isDisallowedPair(p1Role, p2Role);
        });

        // Add unread count for each allowed conversation
        const enrichedConversations = await Promise.all(eligibleConversations.map(async (conv) => {
            const unreadCount = await Message.count({
                where: {
                    conversation_id: conv.conversation_id,
                    sender_id: { [Op.ne]: normalizedUserId },
                    is_read: false
                }
            });
            // Plain object to add custom property
            const plain = conv.get({ plain: true });
            if (plain.participant1) delete plain.participant1.role;
            if (plain.participant2) delete plain.participant2.role;
            plain.unreadCount = unreadCount;
            return plain;
        }));

        return enrichedConversations;
    }

    // Check if user is participant
    async isParticipant(conversationId, userId) {
        try {
            await this._assertUserCanAccessConversation(conversationId, userId);
            return true;
        } catch {
            return false;
        }
    }

    // Get Messages in Conversation
    async getMessages(conversationId, requesterUserId) {
        await this._assertUserCanAccessConversation(conversationId, requesterUserId);

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
        const normalizedSenderId = Number(senderId);

        const conversation = await this._assertUserCanAccessConversation(conversationId, normalizedSenderId);

        const message = await Message.create({
            conversation_id: conversationId,
            sender_id: normalizedSenderId,
            content,
            attachment_url: attachmentUrl
        });

        // Update conversation last_message_at
        await Conversation.update(
            { last_message_at: new Date() },
            { where: { conversation_id: conversationId } }
        );

        const savedMessage = await Message.findByPk(message.message_id, {
            include: [{ model: User, as: 'sender', attributes: ['user_id', 'first_name', 'last_name', 'profile_image'] }]
        });

        // Trigger Notification for the other participant
        const recipientId = conversation.participant1_id === normalizedSenderId ? conversation.participant2_id : conversation.participant1_id;

        await NotificationService.createNotification({
            recipient_id: recipientId,
            sender_id: normalizedSenderId,
            type: 'message_received',
            title: 'New Message',
            message: `You have a new message from ${savedMessage.sender.first_name}`,
            related_id: conversationId,
            shouldEmail: false // Messages usually don't trigger emails unless it's a "missed message" digest, which we haven't implemented.
        });

        return savedMessage;
    }

    // Mark messages as read
    async markMessagesAsRead(conversationId, userId) {
        const normalizedUserId = Number(userId);
        await this._assertUserCanAccessConversation(conversationId, normalizedUserId);

        return await Message.update(
            { is_read: true },
            {
                where: {
                    conversation_id: conversationId,
                    sender_id: { [Op.ne]: normalizedUserId },
                    is_read: false
                }
            }
        );
    }
}

export default new ChatService();
