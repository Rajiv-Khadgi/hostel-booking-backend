import { Visit, Hostel, User } from '../config/database.js';
import { sendEmail } from './emailService.js';

class VisitService {

    // Schedule a new visit

    async schedule(data, userId) {
        const hostel = await Hostel.findByPk(data.hostel_id, {
            include: { model: User, as: 'owner' }
        });

        if (!hostel) {
            throw new Error('Hostel not found');
        }

        // Only students can schedule visits
        if (userId === hostel.user_id) {
            throw new Error('Owners cannot schedule visits to their own hostels');
        }

        // Prevent duplicate active visit (PENDING or APPROVED)
        const activeVisit = await Visit.findOne({
            where: {
                user_id: userId,
                hostel_id: data.hostel_id,
                status: ['REQUESTED', 'APPROVED']
            }
        });

        if (activeVisit) {
            throw new Error('You already have an active visit request for this hostel');
        }

        const student = await User.findByPk(userId, {
            attributes: ['first_name', 'last_name', 'email']
        });


        const visit = await Visit.create({
            user_id: userId,
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

        return visit;
    }

    // Update visit status (Approve/Reject)

    async updateStatus(visitId, status, userId) {
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            throw new Error('Invalid status');
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
            throw new Error('Visit not found');
        }

        if (visit.hostel.user_id !== userId) {
            throw new Error('Unauthorized');
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

        return visit;
    }

    // Get visits based on user role

    async findAll(userId, userRole) {
        let whereClause = {};

        if (userRole === 'student') {
            whereClause.user_id = userId;
        }

        if (userRole === 'owner') {
            whereClause['$hostel.user_id$'] = userId;
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

        return visits;
    }
}

export default new VisitService();
