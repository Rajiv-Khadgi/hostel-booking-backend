import { Hostel, User } from '../config/database.js';
import { CreateHostelDTO } from '../dto/CreateHostelDTO.js';
import { UpdateHostelDTO } from '../dto/UpdateHostelDTO.js';



// Create Hostel 
export const createHostel = async (req, res) => {
    try {
        // Check if this owner already has a hostel
        const existingHostel = await Hostel.findOne({ where: { user_id: req.user.id } });
        if (existingHostel) {
            return res.status(400).json({ 
                error: 'Each owner can register only one hostel' 
            });
        }

        const dto = new CreateHostelDTO(req.body);
        const data = await dto.validate();

        const hostel = await Hostel.create({
            ...data,
            user_id: req.user.id // assign owner automatically
        });

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

        // Validate input
        const dto = new UpdateHostelDTO(req.body);
        const data = await dto.validate();

        // Find the hostel
        const hostel = await Hostel.findByPk(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        // Only admin or the owner of this hostel can update
        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: only admin or owner can update' });
        }

        // Perform the update
        await hostel.update(data);

        res.json({ success: true, message: 'Hostel updated successfully', hostel });
    } catch (err) {
        console.error('Update hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Delete Hostel 
export const deleteHostel = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the hostel
        const hostel = await Hostel.findByPk(id);
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });

        // Only admin or the owner of this hostel can delete
        if (req.user.role !== 'admin' && hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: only admin or owner can delete' });
        }

        // Perform the deletion
        await hostel.destroy();

        res.json({ success: true, message: 'Hostel deleted successfully' });
    } catch (err) {
        console.error('Delete hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};


//  Get all Hostels 
export const getHostels = async (req, res) => {
    try {
        const hostels = await Hostel.findAll({
            include: {
                model: User,
                as: 'owner',
                attributes: ['user_id', 'first_name', 'last_name', 'email']
            }
        });
        res.json({ success: true, hostels });
    } catch (err) {
        console.error('Get hostels error:', err);
        res.status(400).json({ error: err.message });
    }
};

//  Get single Hostel 
export const getHostelById = async (req, res) => {
    try {
        const { id } = req.params;
        const hostel = await Hostel.findByPk(id, {
            include: {
                model: User,
                as: 'owner',
                attributes: ['user_id', 'first_name', 'last_name', 'email']
            }
        });
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });
        res.json({ success: true, hostel });
    } catch (err) {
        console.error('Get hostel error:', err);
        res.status(400).json({ error: err.message });
    }
};
