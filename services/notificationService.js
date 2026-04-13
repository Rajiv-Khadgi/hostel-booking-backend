import { Notification, User, sequelize } from '../config/database.js';
import { emitToUser } from '../utils/socket.js';
import * as emailService from './emailService.js';

class NotificationService {
    /**
     * Create a notification and deliver it via Socket and Email (if applicable)
     */
    async createNotification({
        recipient_id,
        sender_id = null,
        type,
        title,
        message,
        related_id = null,
        shouldEmail = false
    }) {
        try {
            // 1. Save to Database
            const notification = await Notification.create({
                recipient_id,
                sender_id,
                type,
                title,
                message,
                related_id
            });

            // 2. Emit via Socket (Real-time)
            emitToUser(recipient_id, 'new_notification', notification);

            // 3. Send Email (if important event and shouldEmail is true)
            if (shouldEmail) {
                const recipient = await User.findByPk(recipient_id);
                if (recipient && recipient.email) {
                    await emailService.sendEmail(
                        recipient.email,
                        title,
                        this._generateEmailHtml(title, message)
                    );
                }
            }

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            // We don't throw here to avoid breaking the main flow of the caller (e.g., booking)
            return null;
        }
    }

    /**
     * Get all notifications for a user
     */
    async getUserNotifications(userId) {
        return await Notification.findAll({
            where: { recipient_id: userId },
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'sender', attributes: ['user_id', 'first_name', 'last_name', 'profile_image'] }
            ],
            limit: 50 // Limit to last 50
        });
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId, userId) {
        return await Notification.update(
            { is_read: true },
            { where: { notification_id: notificationId, recipient_id: userId } }
        );
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        return await Notification.update(
            { is_read: true },
            { where: { recipient_id: userId, is_read: false } }
        );
    }

    /**
     * Private helper to generate simple email HTML
     */
    _generateEmailHtml(title, message) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #059669;">${title}</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">${message}</p>
                <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e5e7eb;" />
                <p style="color: #6b7280; font-size: 14px;">
                    This is an automated notification from HostelHub. You can manage your notifications in your dashboard.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="display: inline-block; background-color: #059669; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 10px;">
                    View Dashboard
                </a>
            </div>
        `;
    }
}

export default new NotificationService();
