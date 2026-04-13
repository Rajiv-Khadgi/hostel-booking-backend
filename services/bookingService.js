import { Booking, Room, Hostel, User, Payment } from '../config/database.js';
import { Op } from 'sequelize';
import { sendEmail } from './emailService.js';
import NotificationService from './notificationService.js';

class BookingService {

    _overlapCondition(start_date, end_date) {
        return {
            [Op.or]: [
                { start_date: { [Op.between]: [start_date, end_date] } },
                { end_date: { [Op.between]: [start_date, end_date] } },
                {
                    [Op.and]: [
                        { start_date: { [Op.lte]: start_date } },
                        { end_date: { [Op.gte]: end_date } }
                    ]
                }
            ]
        };
    }

    async create(data, userId) {
        const student = await User.findByPk(userId, {
            attributes: ['user_id', 'first_name', 'last_name']
        });

        if (!student) throw new Error('Student not found');

        const room = await Room.findByPk(data.room_id, {
            include: {
                model: Hostel,
                as: 'hostel',
                include: { model: User, as: 'owner' }
            }
        });

        if (!room) throw new Error('Room not found');

        const existingConfirmedBooking = await Booking.findOne({
            where: {
                user_id: userId,
                status: 'CONFIRMED'
            },
            attributes: ['booking_id']
        });

        if (existingConfirmedBooking) {
            throw new Error('Cannot create new booking request while you have an active confirmed booking.');
        }

        const existingBookingInHostel = await Booking.findOne({
            where: { user_id: userId, status: 'REQUESTED' },
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: room.hostel_id }
            }
        });

        if (existingBookingInHostel) throw new Error('You already have a pending booking request in this hostel.');

        const existingStudentBooking = await Booking.findOne({
            where: {
                user_id: userId,
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...this._overlapCondition(data.start_date, data.end_date)
            }
        });

        if (existingStudentBooking) throw new Error('You already have a booking request for this room');

        const activeBookingsCount = await Booking.count({
            where: {
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...this._overlapCondition(data.start_date, data.end_date)
            }
        });

        if (activeBookingsCount >= room.total_beds) throw new Error('Room is fully booked');

        const booking = await Booking.create({
            user_id: userId,
            room_id: data.room_id,
            start_date: data.start_date,
            end_date: data.end_date,
            months: data.months,
            status: 'REQUESTED'
        });

        // Send Email & Notification
        const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || 'A student';

        await NotificationService.createNotification({
            recipient_id: room.hostel.user_id,
            sender_id: userId,
            type: 'booking_request',
            title: 'New Booking Request',
            message: `${studentName} requested to book room ${room.room_number || room.room_id} in ${room.hostel.name}`,
            related_id: booking.booking_id,
            shouldEmail: true
        });

        return booking;
    }

    async updateStatus(bookingId, status, userId, userRole) {
        if (!['APPROVED', 'REJECTED'].includes(status)) throw new Error('Invalid status');

        const booking = await Booking.findByPk(bookingId, {
            include: {
                model: Room,
                as: 'room',
                include: {
                    model: Hostel,
                    as: 'hostel',
                    include: { model: User, as: 'owner' }
                }
            }
        });

        if (!booking) throw new Error('Booking not found');

        if (userRole !== 'admin' && booking.room.hostel.user_id !== userId) throw new Error('Unauthorized');
        if (booking.status !== 'REQUESTED') throw new Error(`Booking already ${booking.status}`);

        if (status === 'APPROVED') {
            if (booking.room.available_beds <= 0) throw new Error('No available beds');
            booking.room.available_beds -= 1;
            if (booking.room.available_beds === 0) booking.room.status = 'FULL';
            await booking.room.save();
        }

        booking.status = status;
        await booking.save();

        // Send Email & Notification
        await NotificationService.createNotification({
            recipient_id: booking.user_id,
            sender_id: userId,
            type: `booking_${status.toLowerCase()}`,
            title: `Booking ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
            message: `Your booking for room ${booking.room.room_number || booking.room.room_id} in ${booking.room.hostel.name} has been ${status.toLowerCase()}.`,
            related_id: booking.booking_id,
            shouldEmail: true
        });

        return booking;
    }

    async findAll(userId, userRole) {
        let whereClause = {};
        if (userRole === 'student') {
            whereClause.user_id = userId;
        } else if (userRole === 'owner') {
            const hostels = await Hostel.findAll({ where: { user_id: userId } });
            const hostelIds = hostels.map(h => h.hostel_id);
            const rooms = await Room.findAll({ where: { hostel_id: hostelIds } });
            whereClause.room_id = rooms.map(r => r.room_id);
        }

        return await Booking.findAll({
            where: whereClause,
            include: [
                {
                    model: Room,
                    as: 'room',
                    include: [{ model: Hostel, as: 'hostel' }]
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['user_id', 'first_name', 'last_name', 'email']
                },
                {
                    model: Payment,
                    as: 'payments'
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }
}

export default new BookingService();
