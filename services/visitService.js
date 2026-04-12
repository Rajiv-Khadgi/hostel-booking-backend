import { Visit, Hostel, User, sequelize } from '../config/database.js';
import { Op, Transaction } from 'sequelize';
import { sendEmail } from './emailService.js';

class VisitService {

    // Schedule a new visit

    async schedule(data, userId, userRole) {
        if (userRole !== 'student') {
            throw new Error('Unauthorized: Only students can schedule visits');
        }

        const visitDate = new Date(data.visit_date);
        visitDate.setHours(0, 0, 0, 0);
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (visitDate < tomorrow) {
            throw new Error('Visit date must be at least tomorrow');
        }

        const { hostel, visit, student } = await sequelize.transaction(
            { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
            async (tx) => {
                const hostel = await Hostel.findByPk(data.hostel_id, {
                    include: { model: User, as: 'owner' },
                    transaction: tx,
                    lock: tx.LOCK.UPDATE
                });

                if (!hostel) {
                    throw new Error('Hostel not found');
                }

                if (userId === hostel.user_id) {
                    throw new Error('Owners cannot schedule visits to their own hostels');
                }

                const activeVisit = await Visit.findOne({
                    where: {
                        user_id: userId,
                        hostel_id: data.hostel_id,
                        status: { [Op.in]: ['REQUESTED', 'APPROVED'] }
                    },
                    transaction: tx,
                    lock: tx.LOCK.UPDATE
                });

                if (activeVisit) {
                    throw new Error('You already have an active visit request for this hostel');
                }

                const student = await User.findByPk(userId, {
                    attributes: ['first_name', 'last_name', 'email'],
                    transaction: tx
                });

                const visit = await Visit.create({
                    user_id: userId,
                    hostel_id: data.hostel_id,
                    visit_date: data.visit_date,
                    status: 'REQUESTED'
                }, { transaction: tx });

                return { hostel, visit, student };
            }
        );

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

        if (visit.status !== 'REQUESTED') {
            throw new Error(`Invalid status transition: ${visit.status} cannot change to ${status}`);
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
        } else if (userRole === 'owner') {
            whereClause['$hostel.user_id$'] = userId;
        } else if (userRole === 'admin') {
            whereClause = {};
        } else {
            throw new Error('Unauthorized role');
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

    async cancelVisit(visitId, userId) {
        const visit = await Visit.findByPk(visitId, {
            include: [
                { model: Hostel, as: 'hostel' },
                { model: User, as: 'student' }
            ]
        });

        if (!visit) {
            throw new Error('Visit not found');
        }

        if (visit.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (visit.status !== 'REQUESTED') {
            throw new Error(`Cannot cancel visit with status ${visit.status}`);
        }

        await visit.destroy();

        const owner = await User.findByPk(visit.hostel.user_id, {
            attributes: ['email']
        });

        if (owner?.email) {
            await sendEmail(
                owner.email,
                'Visit Request Cancelled',
                `
                    <p>The visit request for hostel <b>${visit.hostel.name}</b>
                    on <b>${visit.visit_date}</b> has been cancelled by the student.</p>
                `
            );
        }

        return {
            visit_id: visitId,
            status: 'CANCELLED'
        };
    }
}

export default new VisitService();
