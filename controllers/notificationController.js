import NotificationService from '../services/notificationService.js';

/**
 * Get all notifications for the authenticated user
 */
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await NotificationService.getUserNotifications(userId);
        res.status(200).json(notifications);
    } catch (error) {
        console.error('getNotifications Controller Error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

/**
 * Mark a notification as read
 */
export const markRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        await NotificationService.markAsRead(notificationId, userId);
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('markRead Controller Error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

/**
 * Mark all notifications as read
 */
export const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await NotificationService.markAllAsRead(userId);
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('markAllRead Controller Error:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
};
