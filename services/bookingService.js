import { Booking, Room, Hostel, User } from '../config/database.js';
import { Op } from 'sequelize';
import { sendEmail } from './emailService.js';

class BookingService {

    /**
     * Date overlap condition (reusable)
     */
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

    /**
     * Create a new booking request
     */
    async create(data, userId) {
        // Fetch room & hostel & owner
        const room = await Room.findByPk(data.room_id, {
            include: {
                model: Hostel,
                as: 'hostel',
                include: { model: User, as: 'owner' }
            }
        });

        if (!room) {
            throw new Error('Room not found');
        }

        // Prevent multiple bookings in the same hostel
        const existingBookingInHostel = await Booking.findOne({
            where: {
                user_id: userId,
                status: 'REQUESTED', // Only pending bookings
            },
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: room.hostel_id } // same hostel
            }
        });

        if (existingBookingInHostel) {
            throw new Error('You already have a pending booking request in this hostel.');
        };


        // Block duplicate booking by same student (overlapping)
        const existingStudentBooking = await Booking.findOne({
            where: {
                user_id: userId,
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...this._overlapCondition(data.start_date, data.end_date)
            }
        });

        if (existingStudentBooking) {
            throw new Error('You already have a booking request for this room');
        }

        // Count active bookings for this room (capacity check)
        const activeBookingsCount = await Booking.count({
            where: {
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...this._overlapCondition(data.start_date, data.end_date)
            }
        });

        if (activeBookingsCount >= room.total_beds) {
            throw new Error('Room is fully booked for the selected duration');
        }

        // Create booking
        const booking = await Booking.create({
            user_id: userId,
            room_id: data.room_id,
            start_date: data.start_date,
            end_date: data.end_date,
            months: data.months,
            status: 'REQUESTED'
        });

        // Notify hostel owner
        await sendEmail(
            room.hostel.owner.email,
            'New Booking Request',
            `
                <h3>New Booking Request</h3>
                <p><b>Hostel:</b> ${room.hostel.name}</p>
                <p><b>Room ID:</b> ${room.room_id}</p>
                <p><b>Student ID:</b> ${userId}</p>
                <p><b>Duration:</b> ${data.start_date} → ${data.end_date}</p>
            `
        );

        return booking;
    }

    /**
     * Update booking status (Approve/Reject)
     */
    async updateStatus(bookingId, status, userId, userRole) {
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            throw new Error('Invalid status');
        }

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

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Authorization
        if (
            userRole !== 'admin' &&
            booking.room.hostel.user_id !== userId
        ) {
            throw new Error('Unauthorized');
        }

        if (booking.status !== 'REQUESTED') {
            throw new Error(`Booking already ${booking.status}`);
        }

        // APPROVE
        if (status === 'APPROVED') {
            if (booking.room.available_beds <= 0) {
                throw new Error('No available beds'); // Context: room capacity check might be strictly on room model in future
            }

            // Note: The original controller logic modified room.available_beds directly.
            // A better approach would be to calculate availability dynamically, but following original logic for now:
            booking.room.available_beds -= 1;

            if (booking.room.available_beds === 0) {
                booking.room.status = 'FULL';
            }

            await booking.room.save();
        }

        booking.status = status;
        await booking.save();

        // Notify student
        const student = await User.findByPk(booking.user_id);

        await sendEmail(
            student.email,
            `Booking ${status}`,
            `
                <p>Your booking for room <b>${booking.room.room_id}</b> 
                in hostel <b>${booking.room.hostel.name}</b> has been 
                <b>${status.toLowerCase()}</b>.</p>
            `
        );

        return booking;
    }

    /**
     * Get bookings based on user role
     */
    async findAll(userId, userRole) {
        let whereClause = {};

        if (userRole === 'student') {
            whereClause.user_id = userId;
        }

        if (userRole === 'owner') {
            const hostels = await Hostel.findAll({
                where: { user_id: userId }
            });

            const hostelIds = hostels.map(h => h.hostel_id);

            const rooms = await Room.findAll({
                where: { hostel_id: hostelIds }
            });

            whereClause.room_id = rooms.map(r => r.room_id);
        }

        const bookings = await Booking.findAll({
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
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return bookings;
    }
}

export default new BookingService();
