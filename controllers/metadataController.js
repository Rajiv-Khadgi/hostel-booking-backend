import { Amenity, Service } from '../config/database.js';

// Get all Amenities
export const getAmenities = async (req, res) => {
    try {
        const amenities = await Amenity.findAll();
        res.json({ success: true, amenities });
    } catch (err) {
        console.error('Get amenities error:', err);
        res.status(500).json({ error: 'Failed to fetch amenities' });
    }
};

// Get all Services
export const getServices = async (req, res) => {
    try {
        const services = await Service.findAll();
        res.json({ success: true, services });
    } catch (err) {
        console.error('Get services error:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
};
