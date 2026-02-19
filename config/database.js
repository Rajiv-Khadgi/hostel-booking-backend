import { Sequelize } from 'sequelize';
import UserModel from '../models/User.js';
import HostelModel from '../models/Hostel.js';
import RoomModel from '../models/Room.js';
import AmenityModel from '../models/Amenity.js';
import ServiceModel from '../models/Service.js';
import ReviewModel from '../models/Review.js';
import ImageModel from '../models/Image.js'; // Polymorphic
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

import SavedHostelModel from '../models/SavedHostel.js';

// Initialize Models
export const User = UserModel(sequelize);
export const Hostel = HostelModel(sequelize);
export const Room = RoomModel(sequelize);
export const Amenity = AmenityModel(sequelize);
export const Service = ServiceModel(sequelize);
export const Review = ReviewModel(sequelize);
export const Image = ImageModel(sequelize);
export const Booking = BookingModel(sequelize);
export const Visit = VisitModel(sequelize);
export const SavedHostel = SavedHostelModel(sequelize);


// Associations

// User <-> Hostel (Ownership)
User.hasMany(Hostel, { foreignKey: 'user_id', as: 'hostels' });
Hostel.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// User <-> SavedHostel <-> Hostel (Wishlist)
User.belongsToMany(Hostel, { through: SavedHostel, as: 'savedHostels', foreignKey: 'user_id' });
Hostel.belongsToMany(User, { through: SavedHostel, as: 'savedBy', foreignKey: 'hostel_id' });
// Also useful to access the junction table directly if needed
User.hasMany(SavedHostel, { foreignKey: 'user_id' });
SavedHostel.belongsTo(User, { foreignKey: 'user_id' });
Hostel.hasMany(SavedHostel, { foreignKey: 'hostel_id' });
SavedHostel.belongsTo(Hostel, { foreignKey: 'hostel_id' });


// Hostel <-> Room
Hostel.hasMany(Room, { foreignKey: 'hostel_id', as: 'rooms' });
Room.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'hostel' });

// Polymorphic Images
Hostel.hasMany(Image, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'HOSTEL' },
    as: 'images'
});

Room.hasMany(Image, {
    foreignKey: 'entity_id',
    constraints: false,
    scope: { entity_type: 'ROOM' },
    as: 'images'
});

Image.belongsTo(Hostel, { foreignKey: 'entity_id', constraints: false });
Image.belongsTo(Room, { foreignKey: 'entity_id', constraints: false });

// Amenities & Services (Many-to-Many)
Hostel.belongsToMany(Amenity, { through: 'HostelAmenities', foreignKey: 'hostel_id', as: 'amenities' });
Amenity.belongsToMany(Hostel, { through: 'HostelAmenities', foreignKey: 'amenity_id', as: 'hostels' });

Hostel.belongsToMany(Service, { through: 'HostelServices', foreignKey: 'hostel_id', as: 'services' });
Service.belongsToMany(Hostel, { through: 'HostelServices', foreignKey: 'service_id', as: 'hostels' });

// Reviews
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

Hostel.hasMany(Review, { foreignKey: 'hostel_id', as: 'reviews' });
Review.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'hostel' });

// Bookings
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'student' });

Room.hasMany(Booking, { foreignKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// Visits
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
