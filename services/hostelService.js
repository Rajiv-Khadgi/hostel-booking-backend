import { Op } from 'sequelize';
import { Hostel, User, HostelImage, Image, Amenity, Review, Room, sequelize } from '../config/database.js';

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

    // Find all hostels with filters
    async findAll(query) {
        const { search, city, minPrice, maxPrice, amenities } = query;

        // 1. Base Filter for Hostel Table
        const whereClause = { status: 'APPROVED' }; // Only show approved hostels to public

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

        // 2. Include Options (Associations)
        const includeOptions = [
            {
                model: User,
                as: 'owner',
                attributes: ['user_id', 'first_name', 'last_name', 'email']
            },
            {
                model: Image,
                as: 'images',
                where: { entity_type: 'HOSTEL' },
                required: false // Left join: return hostel even if no images
            },
            {
                model: Review,
                as: 'reviews',
                attributes: ['rating'],
                required: false
            },
            {
                model: Amenity,
                as: 'amenities',
                through: { attributes: [] } // Exclude junction table data
            }
        ];

        // 3. Price Filter (Requires joining Rooms)
        // Check if hostel has AT LEAST ONE room in the price range
        if (minPrice || maxPrice) {
            const priceFilter = {};
            if (minPrice) priceFilter[Op.gte] = minPrice;
            if (maxPrice) priceFilter[Op.lte] = maxPrice;

            includeOptions.push({
                model: Room,
                as: 'rooms',
                where: {
                    price: priceFilter,
                    status: 'AVAILABLE'
                },
                required: true // Inner join: Only return hostels that have matching rooms
            });
        } else {
            // Optional: just include rooms for display info if no filter
            includeOptions.push({
                model: Room,
                as: 'rooms',
                required: false
            });
        }

        // 4. Amenity Filter
        // If sorting by specific amenities, we need to ensure the hostel has ALL of them.
        // This is complex in Sequelize. A simpler approach for now is to filter AFTER fetching, 
        // or use a separate subquery. For strict filtering "has all", subquery is best.
        // For MVP/Phase 1: We will filter where it matches *any* (standard include behavior) 
        // or refine if strict matching is needed.
        if (amenities) {
            const amenityList = amenities.split(',');
            includeOptions.forEach(inc => {
                if (inc.as === 'amenities') {
                    inc.where = { name: { [Op.in]: amenityList } };
                    inc.required = true;
                }
            });
        }

        // Execute Query
        const hostels = await Hostel.findAll({
            where: whereClause,
            include: includeOptions,
            order: [['created_at', 'DESC']]
        });

        return hostels;
    }

    // Find single hostel by ID
    async findById(id) {
        return await Hostel.findByPk(id, {
            include: [
                { model: User, as: 'owner', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: Room, as: 'rooms' },
                { model: Image, as: 'images', where: { entity_type: 'HOSTEL' }, required: false },
                { model: Amenity, as: 'amenities' },
                {
                    model: Review,
                    as: 'reviews',
                    include: [{ model: User, as: 'reviewer', attributes: ['first_name', 'last_name'] }]
                }
            ]
        });
    }

    // Update Hostel
    async update(id, data) {
        const hostel = await Hostel.findByPk(id);
        if (!hostel) throw new Error('Hostel not found');
        return await hostel.update(data);
    }

    // Delete Hostel
    async delete(id) {
        const hostel = await Hostel.findByPk(id);
        if (!hostel) throw new Error('Hostel not found');
        return await hostel.destroy();
    }
}

export default new HostelService();
