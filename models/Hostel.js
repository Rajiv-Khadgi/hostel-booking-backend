import { DataTypes } from 'sequelize';

const HostelModel = (sequelize) => {
    return sequelize.define('Hostel', {
        hostel_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        city: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        area: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true
        },
        longitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
            defaultValue: 'PENDING',
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'hostels',
        timestamps: true,
        underscored: true
    });
};

export default HostelModel;
