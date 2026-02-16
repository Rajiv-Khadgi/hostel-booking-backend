import { DataTypes } from 'sequelize';

const MessageModel = (sequelize) => {
    const Message = sequelize.define('Message', {
        message_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        conversation_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'conversations',
                key: 'conversation_id'
            },
            onDelete: 'CASCADE'
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true // Can be null if sending just an attachment
        },
        attachment_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'messages',
        timestamps: true,
        underscored: true
    });

    return Message;
};

export default MessageModel;
