import VisitService from '../services/visitService.js';
import { CreateVisitDTO } from '../dto/CreateVisitDTO.js';

//  Student: Schedule Visit 
export const scheduleVisit = async (req, res) => {
    try {
        const dto = new CreateVisitDTO(req.body);
        const data = await dto.validate();

        const visit = await VisitService.schedule(data, req.user.id);

        return res.status(201).json({
            success: true,
            message: 'Visit scheduled successfully',
            visit
        });

    } catch (err) {
        if (err.message === 'Hostel not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('already')) return res.status(409).json({ error: err.message });

        console.error('Schedule visit error:', err);
        return res.status(400).json({ error: err.message });
    }
};

// Owner: Approve / Reject Visit 
export const updateVisitStatus = async (req, res) => {
    try {
        const { visitId } = req.params;
        const { status } = req.body;

        const visit = await VisitService.updateStatus(visitId, status, req.user.id);

        return res.json({
            success: true,
            message: `Visit ${status.toLowerCase()} successfully`,
            visit
        });

    } catch (err) {
        if (err.message === 'Visit not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Unauthorized') return res.status(403).json({ error: err.message });
        if (err.message === 'Invalid status') return res.status(400).json({ error: err.message });

        console.error('Update visit status error:', err);
        return res.status(500).json({ error: err.message });
    }
};

// Get Visits 
export const getVisits = async (req, res) => {
    try {
        const visits = await VisitService.findAll(req.user.id, req.user.role);
        return res.json({ success: true, visits });

    } catch (err) {
        console.error('Get visits error:', err);
        return res.status(500).json({ error: err.message });
    }
};
