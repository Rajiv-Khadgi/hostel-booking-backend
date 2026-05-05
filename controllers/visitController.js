import VisitService from '../services/visitService.js';
import { CreateVisitDTO } from '../dto/CreateVisitDTO.js';

const mapScheduleVisitError = (res, err) => {
    if (err.message === 'Hostel not found') return res.status(404).json({ error: err.message });
    if (err.message.includes('already')) return res.status(409).json({ error: err.message });
    if (err.message.includes('tomorrow')) return res.status(400).json({ error: err.message });
    if (err.message.includes('Unauthorized')) return res.status(403).json({ error: err.message });
    return res.status(400).json({ error: err.message });
};

const mapUpdateVisitError = (res, err) => {
    if (err.message === 'Visit not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Unauthorized') return res.status(403).json({ error: err.message });
    if (err.message === 'Invalid status') return res.status(400).json({ error: err.message });
    if (err.message.includes('Invalid status transition')) return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: err.message });
};

const mapCancelVisitError = (res, err) => {
    if (err.message === 'Visit not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Unauthorized') return res.status(403).json({ error: err.message });
    if (err.message.includes('Cannot cancel')) return res.status(409).json({ error: err.message });
    return res.status(500).json({ error: err.message });
};

//  Student: Schedule Visit 
export const scheduleVisit = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ error: 'Only students can schedule visits' });
        }

        const dto = new CreateVisitDTO(req.body);
        const data = await dto.validate();

        const visit = await VisitService.schedule(data, req.user.id, req.user.role);

        return res.status(201).json({
            success: true,
            message: 'Visit scheduled successfully',
            visit
        });

    } catch (err) {
        console.error('Schedule visit error:', err);
        return mapScheduleVisitError(res, err);
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
        console.error('Update visit status error:', err);
        return mapUpdateVisitError(res, err);
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

// Student: Cancel own REQUESTED visit
export const cancelVisit = async (req, res) => {
    try {
        const { visitId } = req.params;
        const result = await VisitService.cancelVisit(visitId, req.user.id);
        return res.json({
            success: true,
            message: 'Visit cancelled successfully',
            visit: result
        });
    } catch (err) {
        console.error('Cancel visit error:', err);
        return mapCancelVisitError(res, err);
    }
};
