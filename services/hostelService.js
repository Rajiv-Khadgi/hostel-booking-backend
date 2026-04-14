import { Op } from 'sequelize';
import { Hostel, User, Image, Amenity, Service, Review, Room, SavedHostel, sequelize } from '../config/database.js';

class HostelService {

    // Create a new hostel
    async create(data, userId) {
        const { amenityIds, serviceIds, ...hostelData } = data;

        const hostel = await Hostel.create({
            ...hostelData,
            user_id: userId,
            status: 'PENDING'
        });

        if (amenityIds && amenityIds.length > 0) {
            await hostel.addAmenities(amenityIds);
        }

        if (serviceIds && serviceIds.length > 0) {
            await hostel.addServices(serviceIds);
        }

        // Return refreshed hostel with associations
        return this.findById(hostel.hostel_id);
    }

    // Find all hostels with filters & pagination
    async findAll(query) {
        const { search, city, minPrice, maxPrice, amenities, page = 1, limit = 12, sortBy, gender_type, rating, beds } = query;

        const whereClause = { status: 'APPROVED' };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { city: { [Op.iLike]: `%${search}%` } },
                { area: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (city) {
            whereClause.city = { [Op.iLike]: `%${city}%` };
        }

        if (gender_type) {
            whereClause.gender_type = gender_type;
        }

        const includeOptions = [
            { model: User, as: 'owner', attributes: ['first_name', 'last_name'] },
            { 
                model: Image, 
                as: 'images', 
                where: { entity_type: 'HOSTEL', is_cover: true }, 
                attributes: ['image_url'],
                required: false 
            },
            { model: Review, as: 'reviews', attributes: ['rating'], required: false },
            { model: Amenity, as: 'amenities', attributes: ['name', 'icon'], through: { attributes: [] } },
            { model: Service, as: 'services', attributes: ['name', 'icon'], through: { attributes: [] } }
        ];

        // Price & Bed Filter
        const roomWhere = { status: 'AVAILABLE' };
        let requireRooms = false;

        if (minPrice || maxPrice) {
            roomWhere.price = {};
            if (minPrice) roomWhere.price[Op.gte] = minPrice;
            if (maxPrice) roomWhere.price[Op.lte] = maxPrice;
            requireRooms = true;
        }

        if (beds) {
            roomWhere.available_beds = { [Op.gte]: Number(beds) };
            requireRooms = true;
        }

        includeOptions.push({
            model: Room,
            as: 'rooms',
            where: Object.keys(roomWhere).length > 1 ? roomWhere : { status: 'AVAILABLE' },
            attributes: ['price', 'available_beds'],
            required: requireRooms
        });

        // Amenity Filter
        if (amenities) {
            const amenityList = amenities.split(',');
            includeOptions.forEach(inc => {
                if (inc.as === 'amenities') {
                    inc.where = { name: { [Op.in]: amenityList } };
                    inc.required = true;
                }
            });
        }

        const allHostels = await Hostel.findAll({
            where: whereClause,
            attributes: ['hostel_id', 'name', 'city', 'area', 'gender_type', 'latitude', 'longitude'],
            include: includeOptions,
            order: [['created_at', 'DESC']]
        });

        // Calculate stats & apply remaining filters locally for speed
        let processed = allHostels.map(h => {
             const json = h.toJSON();
             const avg_rating = json.reviews?.length ? json.reviews.reduce((a, r) => a + Number(r.rating), 0) / json.reviews.length : 0;
             const min_price = json.rooms?.length ? Math.min(...json.rooms.map(r => Number(r.price))) : 0;
             return { ...json, avg_rating, min_price };
        });

        if (rating) {
            const minRating = Number(rating);
            processed = processed.filter(h => h.avg_rating >= minRating);
        }

        if (sortBy === 'rating') processed.sort((a, b) => b.avg_rating - a.avg_rating);
        else if (sortBy === 'price_asc') processed.sort((a, b) => a.min_price - b.min_price);
        else if (sortBy === 'price_desc') processed.sort((a, b) => b.min_price - a.min_price);

        // Paginate
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 12;
        const startIndex = (p - 1) * l;
        const endIndex = p * l;

        const paginatedHostels = processed.slice(startIndex, endIndex);

        return {
            hostels: paginatedHostels,
            totalItems: processed.length,
            totalPages: Math.ceil(processed.length / l) || 1,
            currentPage: p
        };
    }

    // Get global metadata (filters)
    async getMetadata() {
        const amenities = await Amenity.findAll({
            attributes: ['name', 'icon'],
            group: ['name', 'icon']
        });

        const maxPriceRoom = await Room.findOne({
            order: [['price', 'DESC']],
            attributes: ['price']
        });
        
        const price = maxPriceRoom ? Number(maxPriceRoom.price) : 30000;
        const maxPrice = Math.ceil(price / 500) * 500;

        return { amenities, maxPrice };
    }

    // Find nearby hostels
    async findNearby(lat, lng, radiusKm) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radius = parseFloat(radiusKm);

        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates');
        }

        const haversine = `(
            6371 * acos(
                cos(radians(${latitude}))
                * cos(radians(latitude::float))
                * cos(radians(longitude::float) - radians(${longitude}))
                + sin(radians(${latitude})) * sin(radians(latitude::float))
            )
        )`;

        return await Hostel.findAll({
            attributes: ['hostel_id', 'name', 'latitude', 'longitude', 'city', 'area', 'gender_type',
                [sequelize.literal(haversine), 'distance']
            ],
            where: {
                status: 'APPROVED',
                latitude: { [Op.not]: null },
                longitude: { [Op.not]: null },
                [Op.and]: sequelize.where(sequelize.literal(haversine), '<=', radius)
            },
            include: [
                { 
                    model: Image, 
                    as: 'images', 
                    where: { entity_type: 'HOSTEL', is_cover: true }, 
                    attributes: ['image_url'],
                    required: false 
                },
                { model: Room, as: 'rooms', attributes: ['room_id', 'price'] },
                { model: Review, as: 'reviews', attributes: ['rating'] }
            ],
            order: sequelize.literal('distance ASC')
        });
    }

    // Find my hostels (Owner Dashboard)
    async findMyHostels(userId) {
        return await Hostel.findAll({
            where: { user_id: userId },
            attributes: ['hostel_id', 'name', 'city', 'area', 'status', 'created_at'],
            include: [
                { 
                    model: Image, 
                    as: 'images', 
                    where: { entity_type: 'HOSTEL', is_cover: true }, 
                    attributes: ['image_url'],
                    required: false 
                },
                { model: Room, as: 'rooms', attributes: ['room_id', 'room_number', 'status'] },
                { model: Amenity, as: 'amenities', attributes: ['name'], through: { attributes: [] } },
                { model: Service, as: 'services', attributes: ['name'], through: { attributes: [] } }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    // Find single hostel by ID
    async findById(id) {
        return await Hostel.findByPk(id, {
            include: [
                { model: User, as: 'owner', attributes: ['user_id', 'first_name', 'middle_name', 'last_name', 'profile_image', 'phone', 'email'] },
                {
                    model: Room,
                    as: 'rooms',
                    attributes: ['room_id', 'room_type', 'room_number', 'price', 'total_beds', 'available_beds', 'status']
                },
                { 
                    model: Image, 
                    as: 'images', 
                    where: { entity_type: 'HOSTEL' }, 
                    attributes: ['image_id', 'image_url', 'is_cover'],
                    required: false 
                },
                { model: Amenity, as: 'amenities', attributes: ['name', 'icon'], through: { attributes: [] } },
                { model: Service, as: 'services', attributes: ['name', 'icon'], through: { attributes: [] } },
                {
                    model: Review,
                    as: 'reviews',
                    attributes: ['review_id', 'rating', 'comments', 'reply', 'reply_date', 'created_at'],
                    include: [{ model: User, as: 'reviewer', attributes: ['first_name', 'last_name', 'profile_image'] }]
                }
            ]
        });
    }

    // Update Hostel
    async update(id, data) {
        const hostel = await Hostel.findByPk(id);
        if (!hostel) throw new Error('Hostel not found');
        
        const { amenityIds, serviceIds, ...hostelData } = data;
        await hostel.update(hostelData);
        
        if (amenityIds) await hostel.setAmenities(amenityIds);
        if (serviceIds) await hostel.setServices(serviceIds);
        
        return this.findById(id);
    }

    // Delete Hostel
    async delete(id) {
        const hostel = await Hostel.findByPk(id);
        if (!hostel) throw new Error('Hostel not found');
        return await hostel.destroy();
    }

    // Save Hostel (Wishlist)
    async saveHostel(userId, hostelId) {
        const hostel = await Hostel.findByPk(hostelId);
        if (!hostel) throw new Error('Hostel not found');

        // Check if already saved (handled by unique constraint, but good to check)
        const existing = await SavedHostel.findOne({
            where: { user_id: userId, hostel_id: hostelId }
        });

        if (existing) return existing; // Idempotent success

        return await SavedHostel.create({ user_id: userId, hostel_id: hostelId });
    }

    // Unsave Hostel
    async unsaveHostel(userId, hostelId) {
        return await SavedHostel.destroy({
            where: { user_id: userId, hostel_id: hostelId }
        });
    }

    // Get Saved Hostels for User
    async getSavedHostels(userId) {
        const saved = await SavedHostel.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Hostel,
                    as: 'hostel',
                    attributes: ['hostel_id', 'name', 'city', 'area', 'gender_type', 'latitude', 'longitude'],
                    include: [
                        { 
                            model: Image, 
                            as: 'images', 
                            where: { entity_type: 'HOSTEL', is_cover: true }, 
                            attributes: ['image_url'],
                            required: false 
                        },
                        { model: Room, as: 'rooms', attributes: ['price', 'available_beds'] } 
                    ]
                }
            ]
        });

        // Transform for cleaner frontend consumption 
        return saved.map(s => {
            const h = s.hostel;
            const prices = h.rooms.map(r => r.price);
            const minPrice = prices.length ? Math.min(...prices) : null;

            return {
                ...h.toJSON(),
                min_price: minPrice,
                saved_at: s.created_at
            };
        });
    }
}

export default new HostelService();
