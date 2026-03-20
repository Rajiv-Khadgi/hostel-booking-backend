import axios from 'axios';
import { Booking, Payment, Room, Hostel, User } from '../config/database.js';
import { Op } from 'sequelize';

class PaymentService {
    constructor() {
        this.secretKey = process.env.KHALTI_SECRET_KEY;
        this.initUrl = process.env.KHALTI_INIT_URL;
        this.verifyUrl = process.env.KHALTI_VERIFY_URL;
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        this.DEPOSIT_AMOUNT = process.env.BOOKING_DEPOSIT_AMOUNT ? parseInt(process.env.BOOKING_DEPOSIT_AMOUNT) : 1000;
    }

    async initiatePayment(bookingId, paymentType) {
        // 1. Fetch Booking and amount
        const booking = await Booking.findByPk(bookingId, {
            include: [
                { model: Room, as: 'room' },
                { model: User, as: 'student' }
            ]
        });

        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'APPROVED') throw new Error('Booking must be approved before payment');
        if (booking.payment_status === 'PAID') throw new Error('Booking is already fully paid');

        // Edge Case: Prevent initiates if user already has a CONFIRMED booking
        const existingConfirmedBooking = await Booking.findOne({
            where: {
                user_id: booking.user_id,
                status: 'CONFIRMED'
            }
        });
        
        if (existingConfirmedBooking) {
            throw new Error('You already have a confirmed booking. Please cancel it before paying for a new one.');
        }

        // Edge Case: Prevent duplicate initiation (Idempotency)
        const pendingPayment = await Payment.findOne({
            where: {
                booking_id: bookingId,
                status: 'PENDING'
            }
        });

        // If a pending payment exists, and it's less than 15 minutes old, return the existing URL
        // Khalti transactions often expire after some time.
        if (pendingPayment) {
            const timeDiff = new Date() - new Date(pendingPayment.createdAt);
            if (timeDiff < 15 * 60 * 1000) { 
                return { payment_url: `https://test-pay.khalti.com/?pidx=${pendingPayment.pidx}`, pidx: pendingPayment.pidx, message: "Resuming existing payment session" };
            } else {
                // If old, mark as FAILED to allow a new attempt
                await pendingPayment.update({ status: 'FAILED', metadata: { error: 'Session expired before completion' } });
            }
        }

        let amountNRS = 0;
        if (paymentType === 'FULL') {
            amountNRS = booking.months * booking.room.price;
        } else if (paymentType === 'DEPOSIT') {
            amountNRS = this.DEPOSIT_AMOUNT; // Flexible deposit amount
        } else {
            throw new Error('Invalid payment type');
        }

        const amountPaisa = amountNRS * 100;

        // 2. Prepare Khalti Request
        const payload = {
            return_url: `${this.frontendUrl}/payment/callback`,
            website_url: this.frontendUrl,
            amount: amountPaisa,
            purchase_order_id: booking.booking_id.toString(),
            purchase_order_name: `Booking for ${booking.room.room_number}`,
            customer_info: {
                name: `${booking.student.first_name} ${booking.student.last_name}`,
                email: booking.student.email,
                phone: booking.student.phone || "9800000000"
            }
        };

        const config = {
            headers: {
                Authorization: `Key ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await axios.post(this.initUrl, payload, config);
            const { pidx, payment_url } = response.data;

            // 3. Create Pending Payment Record
            await Payment.create({
                booking_id: bookingId,
                amount: amountNRS,
                payment_type: paymentType,
                pidx: pidx,
                status: 'PENDING'
            });

            return { payment_url, pidx };
        } catch (error) {
            console.error('Khalti Initiation Error:', error.response?.data || error.message);
            throw new Error('Failed to initiate payment with Khalti');
        }
    }

    async verifyPayment(pidx) {
        const config = {
            headers: {
                Authorization: `Key ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            // 1. Find local payment record
            const payment = await Payment.findOne({ where: { pidx } });
            if (!payment) throw new Error('Payment record not found');
            
            // If already completed, don't re-process
            if (payment.status === 'COMPLETED') {
                return { success: true, message: 'Payment already verified' };
            }
            if (payment.status === 'FAILED') {
                throw new Error('This payment has already failed. Please initiate a new one.');
            }

            // 2. Lookup payment in Khalti
            const response = await axios.post(this.verifyUrl, { pidx }, config);
            const khaltiData = response.data;

            if (khaltiData.status === 'Completed') {
                // 3. Amount Validation (Khalti amount is in paisa)
                const expectedAmountPaisa = payment.amount * 100;
                if (parseInt(khaltiData.total_amount) !== parseInt(expectedAmountPaisa)) {
                    await payment.update({ status: 'FAILED', metadata: { ...khaltiData, error: 'Amount mismatch' } });
                    return { success: false, message: 'Payment amount mismatch' };
                }

                // 4. Update Payment record
                await payment.update({
                    status: 'COMPLETED',
                    transaction_id: khaltiData.transaction_id,
                    metadata: khaltiData
                });

                // 5. Update Booking record
                const booking = await Booking.findByPk(payment.booking_id);
                const newPaymentStatus = payment.payment_type === 'FULL' ? 'PAID' : 'PARTIAL';
                
                await booking.update({
                    status: 'CONFIRMED',
                    payment_status: newPaymentStatus
                });

                // 6. Edge Case Handling: Cancel other REQUESTED/APPROVED bookings for this user
                // and restore bed capacity for APPROVED ones
                const competingBookings = await Booking.findAll({
                    where: {
                        user_id: booking.user_id,
                        booking_id: { [Op.ne]: booking.booking_id },
                        status: { [Op.in]: ['REQUESTED', 'APPROVED'] }
                    },
                    include: [{ model: Room, as: 'room' }]
                });

                for (let compBooking of competingBookings) {
                    // If it was APPROVED, it was holding a bed. We must return it.
                    if (compBooking.status === 'APPROVED') {
                        compBooking.room.available_beds += 1;
                        if (compBooking.room.status === 'FULL') {
                            compBooking.room.status = 'AVAILABLE';
                        }
                        await compBooking.room.save();
                    }
                    compBooking.status = 'CANCELLED';
                    await compBooking.save();
                }


                return { success: true, message: 'Payment verified and booking confirmed' };
            } else {
                await payment.update({ status: 'FAILED', metadata: khaltiData });
                return { success: false, message: `Payment status: ${khaltiData.status}` };
            }
        } catch (error) {
            console.error('Khalti Verification Error:', error.response?.data || error.message);
            throw new Error('Failed to verify payment with Khalti');
        }
    }
}

export default new PaymentService();
