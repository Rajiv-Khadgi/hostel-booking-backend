import { DataTypes } from 'sequelize';

const AmenityModel = (sequelize) => {
    return sequelize.define('Amenity', {
        amenity_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        icon: {
            type: DataTypes.STRING, // Store icon class or URL
            allowNull: true
        }
    }, {
        tableName: 'amenities',
        timestamps: false,
        underscored: true
    });
};

export default AmenityModel;
