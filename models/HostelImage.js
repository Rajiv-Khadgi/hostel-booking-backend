import { DataTypes } from 'sequelize';

const HostelImageModel = (sequelize) => {
  return sequelize.define('HostelImage', {
    image_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_cover: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hostel_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'hostel_images',
    timestamps: true,
    underscored: true
  });
};

export default HostelImageModel;
