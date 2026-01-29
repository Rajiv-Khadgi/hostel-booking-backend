import { Visit, Hostel, User } from '../config/database.js';
import { CreateVisitDTO } from '../dto/CreateVisitDTO.js';
import { sendEmail } from '../services/emailService.js';

//  Student: Schedule Visit 
export const scheduleVisit = async (req, res) => {
    try {
        const dto = new CreateVisitDTO(req.body);
        const data = await dto.validate();

        const hostel = await Hostel.findByPk(data.hostel_id, {
            include: { model: User, as: 'owner' }
        });

        if (!hostel) {
            return res.status(404).json({ error: 'Hostel not found' });
        }

        // Prevent duplicate pending visit
        const existingVisit = await Visit.findOne({
            where: {
                user_id: req.user.id,
                hostel_id: data.hostel_id,
                status: 'REQUESTED'
            }
        });

        if (existingVisit) {
            return res.status(409).json({
                error: 'You already have a pending visit request for this hostel'
            });
        }

        const student = await User.findByPk(req.user.id, {
            attributes: ['first_name', 'last_name', 'email']
        });


        const visit = await Visit.create({
            user_id: req.user.id,
            hostel_id: data.hostel_id,
            visit_date: data.visit_date,
            status: 'REQUESTED'
        });

        // EMAIL to Hostel Owner
        await sendEmail(
            hostel.owner.email,
            'New Hostel Visit Request',
            `
                <h3>New Visit Request</h3>
                <p><b>Hostel:</b> ${hostel.name}</p>
                <p><b>Student:</b> ${student.first_name} ${student.last_name}</p>
                <p><b>Visit Date:</b> ${data.visit_date}</p>
                <p>Please login to approve or reject this visit.</p>
            `
        );

        return res.status(201).json({
            success: true,
            message: 'Visit scheduled successfully',
            visit
        });

    } catch (err) {
        console.error('Schedule visit error:', err);
        return res.status(400).json({ error: err.message });
    }
};

// Owner: Approve / Reject Visit 
export const updateVisitStatus = async (req, res) => {
    try {
        const { visitId } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const visit = await Visit.findByPk(visitId, {
            include: [
                {
                    model: Hostel,
                    as: 'hostel'
                },
                {
                    model: User,
                    as: 'student'
                }
            ]
        });

        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }

        if (visit.hostel.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        visit.status = status;
        await visit.save();

        // EMAIL to Student
        await sendEmail(
            visit.student.email,
            `Visit ${status}`,
            `
                <p>Your visit request for hostel 
                <b>${visit.hostel.name}</b> scheduled on 
                <b>${visit.visit_date}</b> has been 
                <b>${status.toLowerCase()}</b>.</p>
            `
        );

        return res.json({
            success: true,
            message: `Visit ${status.toLowerCase()} successfully`,
            visit
        });

    } catch (err) {
        console.error('Update visit status error:', err);
        return res.status(500).json({ error: err.message });
    }
};

// Get Visits 
export const getVisits = async (req, res) => {
    try {
        let whereClause = {};

        if (req.user.role === 'student') {
            whereClause.user_id = req.user.id;
        }

        if (req.user.role === 'owner') {
            whereClause['$hostel.user_id$'] = req.user.id;
        }

        const visits = await Visit.findAll({
            where: whereClause,
            include: [
                {
                    model: Hostel,
                    as: 'hostel'
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['user_id', 'first_name', 'last_name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.json({ success: true, visits });

    } catch (err) {
        console.error('Get visits error:', err);
        return res.status(500).json({ error: err.message });
    }
};
