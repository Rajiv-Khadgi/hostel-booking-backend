import { DataTypes } from 'sequelize';

const SavedHostelModel = (sequelize) => {
    return sequelize.define('SavedHostel', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        hostel_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'saved_hostels',
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

export default SavedHostelModel;
