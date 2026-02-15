// controllers/bookingController.js

import BookingService from '../services/bookingService.js';
import { CreateBookingDTO } from '../dto/CreateBookingDTO.js';

//  Create Booking (Student) 
export const createBooking = async (req, res) => {
    try {
        const dto = new CreateBookingDTO(req.body);
        const data = await dto.validate();

        const booking = await BookingService.create(data, req.user.id);

        return res.status(201).json({
            success: true,
            message: 'Booking request sent successfully',
            booking
        });

    } catch (err) {
        // Handle specific error types if needed, or generic
        if (err.message === 'Room not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('already')) return res.status(409).json({ error: err.message });
        if (err.message.includes('fully booked')) return res.status(409).json({ error: err.message });

        console.error('Create booking error:', err);
        return res.status(400).json({ error: err.message });
    }
};

//  Owner: Approve / Reject Booking 
export const updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        const booking = await BookingService.updateStatus(bookingId, status, req.user.id, req.user.role);

        return res.json({
            success: true,
            message: `Booking ${status.toLowerCase()} successfully`,
            booking
        });

    } catch (err) {
        if (err.message === 'Booking not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Unauthorized') return res.status(403).json({ error: err.message });
        if (err.message === 'Invalid status' || err.message.includes('already')) return res.status(400).json({ error: err.message });
        if (err.message === 'No available beds') return res.status(409).json({ error: err.message });

        console.error('Update booking status error:', err);
        return res.status(500).json({ error: err.message });
    }
};

//  Get Bookings 
export const getBookings = async (req, res) => {
    try {
        const bookings = await BookingService.findAll(req.user.id, req.user.role);
        return res.json({ success: true, bookings });

    } catch (err) {
        console.error('Get bookings error:', err);
        return res.status(500).json({ error: err.message });
    }
};
