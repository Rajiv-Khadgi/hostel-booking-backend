import { DataTypes } from 'sequelize';

const ImageModel = (sequelize) => {
    return sequelize.define('Image', {
        image_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entity_type: {
            type: DataTypes.ENUM('HOSTEL', 'ROOM'),
            allowNull: false
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        is_cover: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'images',
        timestamps: true,
        underscored: true
    });
};

export default ImageModel;
