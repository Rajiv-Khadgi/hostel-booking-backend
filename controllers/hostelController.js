import HostelService from '../services/hostelService.js';
import { CreateHostelDTO } from '../dto/CreateHostelDTO.js';
import { UpdateHostelDTO } from '../dto/UpdateHostelDTO.js';

// Create Hostel 
export const createHostel = async (req, res) => {
    try {
        // TODO: Move this check to Service or proper validator
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

        // Authorization check (Service could handle this too, but Controller is fine for now)
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


//  Get all Hostels (Public Search)
export const getHostels = async (req, res) => {
    try {
        const hostels = await HostelService.findAll(req.query);
        res.json({ success: true, hostels });
    } catch (err) {
        console.error('Get hostels error:', err);
        res.status(400).json({ error: err.message });
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
