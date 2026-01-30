import { DataTypes } from 'sequelize';

const ServiceModel = (sequelize) => {
    return sequelize.define('Service', {
        service_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'services',
        timestamps: false,
        underscored: true
    });
};

export default ServiceModel;
