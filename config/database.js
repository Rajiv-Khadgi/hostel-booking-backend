import { Sequelize } from 'sequelize';
import UserModel from '../models/User.js';
import HostelModel from '../models/Hostel.js';
import RoomModel from '../models/Room.js'; // new
import HostelImageModel from '../models/HostelImage.js';
import BookingModel from '../models/Booking.js';
import VisitModel from '../models/Visit.js';


export const sequelize = new Sequelize(
    process.env.DB_NAME || 'hostel_booking',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'HOSTEL',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// Initialize models
export const User = UserModel(sequelize);
export const Hostel = HostelModel(sequelize);
export const Room = RoomModel(sequelize);
export const HostelImage = HostelImageModel(sequelize);
export const Booking = BookingModel(sequelize);
export const Visit = VisitModel(sequelize);


// Define associations
User.hasMany(Hostel, { foreignKey: 'user_id', as: 'hostels' });
Hostel.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

Hostel.hasMany(Room, { foreignKey: 'hostel_id', as: 'rooms' });
Room.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'hostel' });

Hostel.hasMany(HostelImage, { foreignKey: 'hostel_id', as: 'images' });
HostelImage.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'hostel' });


User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'student' });

Room.hasMany(Booking, { foreignKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });


User.hasMany(Visit, { foreignKey: 'user_id', as: 'visits' });
Visit.belongsTo(User, { foreignKey: 'user_id', as: 'student' });

Hostel.hasMany(Visit, { foreignKey: 'hostel_id', as: 'visits' });
Visit.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'hostel' });


export const initDB = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true }); // alter true ensures DB structure updates
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error;
    }
};
