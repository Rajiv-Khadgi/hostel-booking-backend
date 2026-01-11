import { DataTypes } from 'sequelize';

const BookingModel = (sequelize) => {
    const Booking = sequelize.define('Booking', {
        booking_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        room_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },

        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },

        months: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(
                'REQUESTED',
                'APPROVED',
                'REJECTED',
                'CANCELLED',
                'COMPLETED'
            ),
            defaultValue: 'REQUESTED'
        }

    }, {
        tableName: 'bookings',
        timestamps: true,
        underscored: true
    });

    return Booking;
};

export default BookingModel;
