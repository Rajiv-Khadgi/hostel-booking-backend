import { DataTypes } from 'sequelize';

const NotificationModel = (sequelize) => {
    return sequelize.define('Notification', {
        notification_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        recipient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false
            // e.g., 'booking_request', 'booking_approved', 'message_received', 'payment_success', 'visit_scheduled'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        related_id: {
            type: DataTypes.STRING(100),
            allowNull: true
            // e.g., booking_id, conversation_id, etc.
        }
    }, {
        tableName: 'notifications',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['recipient_id']
            },
            {
                fields: ['is_read']
            }
        ]
    });
};

export default NotificationModel;
