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

    async initiatePayment(bookingId, paymentType, amount, months) {
        const booking = await Booking.findByPk(bookingId, {
            include: [{ model: Room, as: 'room' }, { model: User, as: 'student' }]
        });

        if (!booking) throw new Error('Booking not found');
        
        if (!['APPROVED', 'CONFIRMED'].includes(booking.status)) {
            throw new Error(`Payment not allowed for status: ${booking.status}`);
        }
        
        if (booking.payment_status === 'PAID') throw new Error('Already fully paid');

        const type = paymentType.toUpperCase();
        const totalCost = booking.months * booking.room.price;
        const totalPaid = (await Payment.sum('amount', { where: { booking_id: bookingId, status: 'COMPLETED' } })) || 0;
        const balance = Math.max(0, totalCost - totalPaid);

        if (balance <= 0) throw new Error('Booking already fully paid');

        let amountNRS = 0;
        if (type === 'FULL' || type === 'BALANCE') {
            amountNRS = balance;
        } else if (type === 'DEPOSIT') {
            if (totalPaid > 0) throw new Error('Deposit can only be paid first');
            amountNRS = amount ? parseFloat(amount) : this.DEPOSIT_AMOUNT;
            const min = Math.floor(totalCost * 0.1);
            if (amountNRS < min) throw new Error(`Minimum deposit is Rs. ${min}`);
        } else if (type === 'MONTHLY') {
            const calculated = (months ? parseInt(months) : 1) * booking.room.price;
            amountNRS = Math.min(calculated, balance);
        } else {
            throw new Error('Invalid payment type');
        }

        // Final cap: Never exceed balance
        if (amountNRS > balance + 0.01) {
             throw new Error(`Amount (Rs. ${amountNRS}) exceeds remaining balance (Rs. ${balance})`);
        }
        amountNRS = Math.min(amountNRS, balance);
        
        const amountPaisa = Math.round(amountNRS * 100);

        // Idempotency: Resume ONLY if amount matches
        const pending = await Payment.findOne({
            where: { booking_id: bookingId, status: 'PENDING', payment_type: type }
        });

        if (pending) {
            const age = new Date() - new Date(pending.createdAt);
            const isSameAmount = Math.abs(parseFloat(pending.amount) - amountNRS) < 0.01;
            
            if (age < 15 * 60 * 1000 && pending.payment_url && isSameAmount) {
                return { payment_url: pending.payment_url, pidx: pending.pidx, message: "Resuming session" };
            }
            await pending.update({ status: 'FAILED', metadata: { ...pending.metadata, reason: 'Amount changed or session stale' } });
        }

        const payload = {
            return_url: `${this.frontendUrl}/payment/callback`,
            website_url: this.frontendUrl,
            amount: amountPaisa,
            purchase_order_id: booking.booking_id.toString(),
            purchase_order_name: `Room ${booking.room.room_number}`,
            customer_info: {
                name: `${booking.student.first_name} ${booking.student.last_name}`,
                email: booking.student.email,
                phone: booking.student.phone || "9800000000"
            }
        };

        try {
            const res = await axios.post(this.initUrl, payload, { 
                headers: { Authorization: `Key ${this.secretKey}`, 'Content-Type': 'application/json' } 
            });
            await Payment.create({
                booking_id: bookingId, amount: amountNRS, payment_type: type,
                pidx: res.data.pidx, payment_url: res.data.payment_url, status: 'PENDING',
                metadata: { requested_months: months, requested_at: new Date() }
            });
            return { payment_url: res.data.payment_url, pidx: res.data.pidx };
        } catch (err) {
            console.error('Khalti Init Error:', err.response?.data || err.message);
            throw new Error('Failed to initiate payment');
        }
    }

    async verifyPayment(pidx) {
        try {
            const payment = await Payment.findOne({ 
                where: { pidx },
                include: [{ model: Booking, as: 'booking', include: [{ model: Room, as: 'room' }] }]
            });
            if (!payment || !payment.booking) throw new Error('Payment/Booking record not found');

            if (payment.status === 'COMPLETED') return { success: true, message: 'Already verified' };
            if (payment.status === 'FAILED') throw new Error('Payment already failed');

            const response = await axios.post(this.verifyUrl, { pidx }, {
                headers: { Authorization: `Key ${this.secretKey}`, 'Content-Type': 'application/json' }
            });

            if (response.data.status === 'Completed') {
                if (parseInt(response.data.total_amount) !== Math.round(payment.amount * 100)) {
                    await payment.update({ status: 'FAILED', metadata: { ...response.data, error: 'Amount mismatch' } });
                    return { success: false, message: 'Amount mismatch' };
                }

                await payment.update({ status: 'COMPLETED', transaction_id: response.data.transaction_id, metadata: response.data });

                const booking = payment.booking;
                const total = booking.months * booking.room.price;
                const paid = await Payment.sum('amount', { where: { booking_id: booking.booking_id, status: 'COMPLETED' } }) || 0;

                await booking.update({
                    status: 'CONFIRMED',
                    payment_status: paid >= total ? 'PAID' : 'PARTIAL'
                });

                const competing = await Booking.findAll({
                    where: { user_id: booking.user_id, booking_id: { [Op.ne]: booking.booking_id }, status: { [Op.in]: ['REQUESTED', 'APPROVED'] } },
                    include: [{ model: Room, as: 'room' }]
                });

                for (let comp of competing) {
                    if (comp.status === 'APPROVED') {
                        comp.room.available_beds += 1;
                        if (comp.room.status === 'FULL') comp.room.status = 'AVAILABLE';
                        await comp.room.save();
                    }
                    await comp.update({ status: 'CANCELLED' });
                }
                return { success: true, message: 'Verified and Confirmed' };
            }
            
            await payment.update({ status: 'FAILED', metadata: response.data });
            return { success: false, message: 'Khalti payment not completed' };
        } catch (error) {
            console.error('Verification Error:', error.response?.data || error.message);
            throw new Error('Verification failed');
        }
    }

    async expireOldBookings() {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const expired = await Booking.findAll({
            where: {
                status: 'APPROVED',
                updatedAt: { [Op.lt]: twentyFourHoursAgo }
            },
            include: [{ model: Room, as: 'room' }]
        });

        for (let booking of expired) {
            const payments = await Payment.count({ where: { booking_id: booking.booking_id, status: 'COMPLETED' } });
            if (payments === 0) {
                booking.room.available_beds += 1;
                if (booking.room.status === 'FULL') booking.room.status = 'AVAILABLE';
                await booking.room.save();
                await booking.update({ status: 'CANCELLED', metadata: { ...booking.metadata, reason: 'Auto-expired: Deposit not paid within 24h' } });
            }
        }
    }

    async getStudentPayments(userId) {
        await this.expireOldBookings();
        return await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                where: { user_id: userId },
                include: [{ model: Room, as: 'room', include: [{ model: Hostel, as: 'hostel' }] }]
            }],
            order: [['createdAt', 'DESC']]
        });
    }

    async getOwnerPayments(ownerId) {
        await this.expireOldBookings();
        return await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                include: [{
                    model: Room,
                    as: 'room',
                    include: [{
                        model: Hostel,
                        as: 'hostel',
                        where: { user_id: ownerId }
                    }]
                }, {
                    model: User,
                    as: 'student'
                }]
            }],
            order: [['createdAt', 'DESC']]
        });
    }

    async getAllPayments() {
        await this.expireOldBookings();
        return await Payment.findAll({
            include: [{
                model: Booking,
                as: 'booking',
                include: [{
                    model: Room,
                    as: 'room',
                    include: [{ model: Hostel, as: 'hostel' }]
                }, {
                    model: User,
                    as: 'student'
                }]
            }],
            order: [['createdAt', 'DESC']]
        });
    }
}

export default new PaymentService();
