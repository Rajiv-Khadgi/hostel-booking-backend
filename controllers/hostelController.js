import HostelService from '../services/hostelService.js';
import { CreateHostelDTO } from '../dto/CreateHostelDTO.js';
import { UpdateHostelDTO } from '../dto/UpdateHostelDTO.js';

// Create Hostel 
export const createHostel = async (req, res) => {
    try {
        const dto = new CreateHostelDTO(req.body);
        const data = await dto.validate();

        const hostel = await HostelService.create(data, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Hostel created successfully',
            hostel
        });
    } catch (err) {
        console.error('Create hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};


// Update Hostel 
export const updateHostel = async (req, res) => {
    try {
        const { id } = req.params;
        const dto = new UpdateHostelDTO(req.body);
        const data = await dto.validate();

        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updatedHostel = await HostelService.update(id, data);
        res.json({ success: true, message: 'Hostel updated successfully', hostel: updatedHostel });
    } catch (err) {
        console.error('Update hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Delete Hostel 
export const deleteHostel = async (req, res) => {
    try {
        const { id } = req.params;
        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await HostelService.delete(id);
        res.json({ success: true, message: 'Hostel deleted successfully' });
    } catch (err) {
        console.error('Delete hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};


// Get Hostel Metadata (Filters)
export const getHostelMetadata = async (req, res) => {
    try {
        const metadata = await HostelService.getMetadata();
        res.json({ success: true, ...metadata });
    } catch (err) {
        console.error('Get metadata error:', err);
        res.status(500).json({ error: err.message });
    }
};

//  Get all Hostels (Public Search)
export const getHostels = async (req, res) => {
    try {
        const result = await HostelService.findAll(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Get hostels error:', err);
        res.status(400).json({ error: err.message });
    }
};

// Get Nearby Hostels
export const getNearbyHostels = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        const hostels = await HostelService.findNearby(lat, lng, radius || 10);
        res.json({ success: true, hostels });
    } catch (err) {
        console.error('Get nearby hostels error:', err);
        res.status(500).json({ error: err.message });
    }
};

//  Get my hostels (Auth required)
export const getMyHostels = async (req, res) => {
    try {
        const hostels = await HostelService.findMyHostels(req.user.id);
        res.json({ success: true, hostels });
    } catch (err) {
        console.error('Get my hostels error:', err);
        res.status(500).json({ error: err.message });
    }
};

//  Get single Hostel 
export const getHostelById = async (req, res) => {
    try {
        const hostel = await HostelService.findById(req.params.id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });
        res.json({ success: true, hostel });
    } catch (err) {
        console.error('Get hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};

// Approve Hostel 
export const approveHostel = async (req, res) => {
    try {
        const { id } = req.params;
        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (hostel.status === 'APPROVED') {
            return res.status(400).json({ error: 'Hostel is already approved' });
        }

        await HostelService.update(id, { status: 'APPROVED' });
        const updatedHostel = await HostelService.findById(id);

        res.json({ success: true, message: 'Hostel approved', hostel: updatedHostel });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Reject Hostel
export const rejectHostel = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (hostel.status === 'REJECTED') {
            return res.status(400).json({ error: 'Hostel is already rejected' });
        }

        await HostelService.update(id, { status: 'REJECTED' });
        const updatedHostel = await HostelService.findById(id);

        res.json({
            success: true,
            message: 'Hostel rejected',
            reason: reason || 'No reason provided',
            hostel: updatedHostel
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Save Hostel
export const saveHostel = async (req, res) => {
    try {
        const { id } = req.params;
        await HostelService.saveHostel(req.user.id, id);
        res.json({ success: true, message: 'Hostel saved' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Unsave Hostel
export const unsaveHostel = async (req, res) => {
    try {
        const { id } = req.params;
        await HostelService.unsaveHostel(req.user.id, id);
        res.json({ success: true, message: 'Hostel removed from saved list' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get Saved Hostels
export const getSavedHostels = async (req, res) => {
    try {
        const hostels = await HostelService.getSavedHostels(req.user.id);
        res.json({ success: true, hostels });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Upload Hostel Images
export const uploadHostelImages = async (req, res) => {
    try {
        const { id } = req.params;
        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const { Image } = await import('../config/database.js');

        // Check if hostel already has a cover image
        const existingCover = await Image.findOne({
            where: { entity_type: 'HOSTEL', entity_id: id, is_cover: true }
        });

        const targetCoverIndex = parseInt(req.body.coverIndex) || 0;

        const imagesToSave = req.files.map((file, idx) => ({
            image_url: file.path, // Full Cloudinary URL
            entity_type: 'HOSTEL',
            entity_id: id,
            is_cover: !existingCover && idx === targetCoverIndex ? true : false
        }));

        await Image.bulkCreate(imagesToSave);

        // Return updated images list
        const updatedImages = await Image.findAll({ where: { entity_type: 'HOSTEL', entity_id: id } });

        res.json({ success: true, message: 'Images uploaded successfully', images: updatedImages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Hostel Image
export const deleteHostelImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Image } = await import('../config/database.js');
        const image = await Image.findOne({ where: { image_id: imageId, entity_id: id, entity_type: 'HOSTEL' } });

        if (!image) return res.status(404).json({ error: 'Image not found' });


        await image.destroy();

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Set Hostel Cover Image
export const setHostelCoverImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const hostel = await HostelService.findById(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { Image } = await import('../config/database.js');
        const image = await Image.findOne({ where: { image_id: imageId, entity_id: id, entity_type: 'HOSTEL' } });

        if (!image) return res.status(404).json({ error: 'Image not found' });

        // Reset all images to false
        await Image.update({ is_cover: false }, { where: { entity_id: id, entity_type: 'HOSTEL' } });

        // Set selected to true
        image.is_cover = true;
        await image.save();

        const updatedImages = await Image.findAll({
            where: { entity_type: 'HOSTEL', entity_id: id },
            order: [['createdAt', 'ASC']]
        });

        res.json({ success: true, message: 'Cover image updated successfully', images: updatedImages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
