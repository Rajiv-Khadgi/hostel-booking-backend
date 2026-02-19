import { DataTypes } from 'sequelize';


const RoomModel = (sequelize) => {
    const Room = sequelize.define('Room', {
        room_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        room_type: {
            type: DataTypes.ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'),
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        total_beds: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        available_beds: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('AVAILABLE', 'FULL', 'INACTIVE'),
            allowNull: false,
            defaultValue: 'AVAILABLE'
        },
        hostel_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'hostels',
                key: 'hostel_id'
            },
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'rooms',
        timestamps: true,
        underscored: true
    });



    return Room;
};

export default RoomModel;
