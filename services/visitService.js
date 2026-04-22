import { Visit, Hostel, User, Image, sequelize } from '../config/database.js';
import { Op, Transaction } from 'sequelize';
import { sendEmail } from './emailService.js';
import NotificationService from './notificationService.js';

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
                    transaction: tx,
                    lock: tx.LOCK.UPDATE,
                    attributes: ['hostel_id', 'user_id', 'name']
                });

                if (hostel) {
                    // Populate owner for email later
                    hostel.owner = await User.findByPk(hostel.user_id, { 
                        transaction: tx,
                        attributes: ['user_id', 'first_name', 'last_name', 'email']
                    });
                }

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
                    transaction: tx,
                    attributes: ['user_id', 'first_name', 'last_name']
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

        // Send Email & Notification
        await NotificationService.createNotification({
            recipient_id: hostel.user_id,
            sender_id: userId,
            type: 'visit_request',
            title: 'New Visit Request',
            message: `${student.first_name} ${student.last_name} requested a visit to ${hostel.name} on ${data.visit_date}`,
            related_id: visit.visit_id,
            shouldEmail: true
        });

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
                    as: 'hostel',
                    attributes: ['hostel_id', 'user_id', 'name'],
                    include: [{ 
                        model: Image, 
                        as: 'images', 
                        where: { entity_type: 'HOSTEL', is_cover: true }, 
                        attributes: ['image_url'],
                        required: false 
                    }]
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['user_id', 'first_name', 'last_name', 'email']
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

        // Send Email & Notification
        await NotificationService.createNotification({
            recipient_id: visit.user_id,
            sender_id: userId,
            type: `visit_${status.toLowerCase()}`,
            title: `Visit ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
            message: `Your visit request for ${visit.hostel.name} on ${visit.visit_date} has been ${status.toLowerCase()}.`,
            related_id: visit.visit_id,
            shouldEmail: true
        });

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
                    as: 'hostel',
                    attributes: ['hostel_id', 'user_id', 'name', 'city', 'area'],
                    include: [{ 
                        model: Image, 
                        as: 'images', 
                        where: { entity_type: 'HOSTEL', is_cover: true }, 
                        attributes: ['image_url'],
                        required: false 
                    }]
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['user_id', 'first_name', 'last_name', 'profile_image']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return visits;
    }

    async cancelVisit(visitId, userId) {
        const visit = await Visit.findByPk(visitId, {
            include: [
                { model: Hostel, as: 'hostel', attributes: ['hostel_id', 'user_id', 'name'] },
                { model: User, as: 'student', attributes: ['user_id', 'first_name', 'last_name'] }
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

        // Notify Owner
        await NotificationService.createNotification({
            recipient_id: visit.hostel.user_id,
            sender_id: userId,
            type: 'visit_cancelled',
            title: 'Visit Request Cancelled',
            message: `The visit request for ${visit.hostel.name} on ${visit.visit_date} has been cancelled by the student.`,
            related_id: visitId,
            shouldEmail: false // Typically don't email for cancellation unless it's very close to the time
        });

        return {
            visit_id: visitId,
            status: 'CANCELLED'
        };
    }
}

export default new VisitService();
