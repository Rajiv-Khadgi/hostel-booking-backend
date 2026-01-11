// controllers/bookingController.js

import { Booking, Room, Hostel, User } from '../config/database.js';
import { CreateBookingDTO } from '../dto/CreateBookingDTO.js';
import { Op } from 'sequelize';
import { sendEmail } from '../services/emailService.js';

/**
 * Date overlap condition (reusable)
 */
const overlapCondition = (start_date, end_date) => ({
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
});

//  Create Booking (Student) 
export const createBooking = async (req, res) => {
    try {
        const dto = new CreateBookingDTO(req.body);
        const data = await dto.validate();

                // Fetch room & hostel & owner
        const room = await Room.findByPk(data.room_id, {
            include: {
                model: Hostel,
                as: 'hostel',
                include: { model: User, as: 'owner' }
            }
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Prevent multiple bookings in the same hostel
        const existingBookingInHostel = await Booking.findOne({
            where: {
                user_id: req.user.id,
                status: 'REQUESTED', // Only pending bookings
            },
            include: {
                model: Room,
                as: 'room',
                where: { hostel_id: room.hostel_id } // same hostel
            }
        });

        if (existingBookingInHostel) {
            return res.status(409).json({
                error: 'You already have a pending booking request in this hostel.'
            });
        };


        //  Block duplicate booking by same student (overlapping)
        const existingStudentBooking = await Booking.findOne({
            where: {
                user_id: req.user.id,
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...overlapCondition(data.start_date, data.end_date)
            }
        });

        if (existingStudentBooking) {
            return res.status(409).json({
                error: 'You already have a booking request for this room'
            });
        }

        //  Count active bookings for this room (capacity check)
        const activeBookingsCount = await Booking.count({
            where: {
                room_id: data.room_id,
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] },
                ...overlapCondition(data.start_date, data.end_date)
            }
        });

        if (activeBookingsCount >= room.total_beds) {
            return res.status(409).json({
                error: 'Room is fully booked for the selected duration'
            });
        }

        //  Create booking
        const booking = await Booking.create({
            user_id: req.user.id,
            room_id: data.room_id,
            start_date: data.start_date,
            end_date: data.end_date,
            months: data.months,
            status: 'REQUESTED'
        });

        //  Notify hostel owner
        await sendEmail(
            room.hostel.owner.email,
            'New Booking Request',
            `
                <h3>New Booking Request</h3>
                <p><b>Hostel:</b> ${room.hostel.name}</p>
                <p><b>Room ID:</b> ${room.room_id}</p>
                <p><b>Student ID:</b> ${req.user.id}</p>
                <p><b>Duration:</b> ${data.start_date} → ${data.end_date}</p>
            `
        );

        return res.status(201).json({
            success: true,
            message: 'Booking request sent successfully',
            booking
        });

    } catch (err) {
        console.error('Create booking error:', err);
        return res.status(400).json({ error: err.message });
    }
};

//  Owner: Approve / Reject Booking 
export const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
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
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Authorization
        if (
            req.user.role !== 'admin' &&
            booking.room.hostel.user_id !== req.user.id
        ) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (booking.status !== 'REQUESTED') {
            return res.status(400).json({
                error: `Booking already ${booking.status}`
            });
        }

        // APPROVE
        if (status === 'APPROVED') {
            if (booking.room.available_beds <= 0) {
                return res.status(409).json({ error: 'No available beds' });
            }

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

        return res.json({
            success: true,
            message: `Booking ${status.toLowerCase()} successfully`,
            booking
        });

    } catch (err) {
        console.error('Update booking status error:', err);
        return res.status(500).json({ error: err.message });
    }
};

//  Get Bookings 
export const getBookings = async (req, res) => {
    try {
        let whereClause = {};

        if (req.user.role === 'student') {
            whereClause.user_id = req.user.id;
        }

        if (req.user.role === 'owner') {
            const hostels = await Hostel.findAll({
                where: { user_id: req.user.id }
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

        return res.json({ success: true, bookings });

    } catch (err) {
        console.error('Get bookings error:', err);
        return res.status(500).json({ error: err.message });
    }
};
