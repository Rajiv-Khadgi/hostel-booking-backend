import { DataTypes } from 'sequelize';

const ConversationModel = (sequelize) => {
    const Conversation = sequelize.define('Conversation', {
        conversation_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        participant1_id: { // Usually the Student
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        participant2_id: { // Usually the Owner
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        last_message_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'conversations',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['participant1_id', 'participant2_id']
            }
        ]
    });

    return Conversation;
};

export default ConversationModel;
