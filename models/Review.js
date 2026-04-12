import { DataTypes } from 'sequelize';

const ReviewModel = (sequelize) => {
    return sequelize.define('Review', {
        review_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        hostel_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        booking_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('PUBLISHED', 'FLAGGED'),
            allowNull: false,
            defaultValue: 'PUBLISHED'
        },
        reply: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reply_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        is_flagged: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        flag_reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        flagged_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        flagged_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        unflagged_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        unflagged_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'reviews',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'hostel_id']
            }
        ]
    });
};

export default ReviewModel;
