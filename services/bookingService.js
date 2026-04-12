import { Booking, Room, Hostel, User, Payment } from '../config/database.js';
import { Op } from 'sequelize';
import { sendEmail } from './emailService.js';

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

        const student = await User.findByPk(userId);
        await sendEmail(
            room.hostel.owner.email,
            'New Booking Request',
            `
                <h3>New Booking Request</h3>
                <p><b>Hostel:</b> ${room.hostel.name}</p>
                <p><b>Room Number:</b> ${room.room_number || room.room_id}</p>
                <p><b>Student:</b> ${student.first_name} ${student.last_name}</p>
                <p><b>Duration:</b> ${data.start_date} → ${data.end_date}</p>
            `
        );

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

        const student = await User.findByPk(booking.user_id);
        await sendEmail(
            student.email,
            `Booking ${status}`,
            `
                <p>Your booking for room <b>${booking.room.room_number || booking.room.room_id}</b> 
                in hostel <b>${booking.room.hostel.name}</b> has been 
                <b>${status.toLowerCase()}</b>.</p>
            `
        );

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
