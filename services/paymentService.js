import axios from 'axios';
import { Booking, Payment, Room, Hostel, User, sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import NotificationService from './notificationService.js';

const PAYMENT_SESSION_TTL_MS = 15 * 60 * 1000;
const PAYMENT_TYPES = new Set(['FULL', 'DEPOSIT', 'MONTHLY', 'BALANCE']);
const KHALTI_COMPLETED_STATUS = 'Completed';

class PaymentService {
    constructor() {
        this.secretKey = process.env.KHALTI_SECRET_KEY;
        this.initUrl = process.env.KHALTI_INIT_URL;
        this.verifyUrl = process.env.KHALTI_VERIFY_URL;
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        this.DEPOSIT_AMOUNT = process.env.BOOKING_DEPOSIT_AMOUNT ? parseInt(process.env.BOOKING_DEPOSIT_AMOUNT) : 1000;
    }

    ensureBookingPayable(booking) {
        if (!['APPROVED', 'CONFIRMED'].includes(booking.status)) {
            throw new Error(`Payment not allowed for status: ${booking.status}`);
        }
    }

    ensureBookingOwnership(booking, userId, message) {
        if (booking.user_id !== userId) {
            throw new Error(message);
        }
    }

    normalizePaymentType(paymentType) {
        const type = (paymentType || '').toUpperCase();
        if (!PAYMENT_TYPES.has(type)) {
            throw new Error('Invalid payment type');
        }
        return type;
    }

    async getBookingForPayment(bookingId) {
        return await Booking.findByPk(bookingId, {
            include: [{ model: Room, as: 'room' }, { model: User, as: 'student' }]
        });
    }

    async getPaidAmount(bookingId, transaction = null) {
        return (await Payment.sum('amount', {
            where: { booking_id: bookingId, status: 'COMPLETED' },
            transaction
        })) || 0;
    }

    computePayableAmount({ type, amount, months, totalCost, totalPaid, roomPrice }) {
        const balance = Math.max(0, totalCost - totalPaid);
        if (balance <= 0) {
            throw new Error('Booking already fully paid');
        }

        let amountNRS = 0;
        if (type === 'FULL' || type === 'BALANCE') {
            amountNRS = balance;
        } else if (type === 'DEPOSIT') {
            if (totalPaid > 0) throw new Error('Deposit can only be paid first');
            amountNRS = amount ? parseFloat(amount) : this.DEPOSIT_AMOUNT;
            const min = Math.floor(totalCost * 0.1);
            if (amountNRS < min) throw new Error(`Minimum deposit is Rs. ${min}`);
        } else if (type === 'MONTHLY') {
            const calculated = (months ? parseInt(months, 10) : 1) * roomPrice;
            amountNRS = Math.min(calculated, balance);
        }

        if (amountNRS > balance + 0.01) {
            throw new Error(`Amount (Rs. ${amountNRS}) exceeds remaining balance (Rs. ${balance})`);
        }

        return Math.min(amountNRS, balance);
    }

    async invalidateOrReusePendingPayment(bookingId, type, amountNRS) {
        const pending = await Payment.findOne({
            where: { booking_id: bookingId, status: 'PENDING', payment_type: type }
        });

        if (!pending) {
            return null;
        }

        const age = new Date() - new Date(pending.createdAt);
        const isSameAmount = Math.abs(parseFloat(pending.amount) - amountNRS) < 0.01;

        if (age < PAYMENT_SESSION_TTL_MS && pending.payment_url && isSameAmount) {
            return { payment_url: pending.payment_url, pidx: pending.pidx, message: 'Resuming session' };
        }

        await pending.update({
            status: 'FAILED',
            metadata: { ...pending.metadata, reason: 'Amount changed or session stale' }
        });

        return null;
    }

    buildKhaltiPayload(booking, amountPaisa) {
        return {
            return_url: `${this.frontendUrl}/payment/callback`,
            website_url: this.frontendUrl,
            amount: amountPaisa,
            purchase_order_id: booking.booking_id.toString(),
            purchase_order_name: `Room ${booking.room.room_number}`,
            customer_info: {
                name: `${booking.student.first_name} ${booking.student.last_name}`,
                email: booking.student.email,
                phone: booking.student.phone || '9800000000'
            }
        };
    }

    async fetchPaymentContextByPidx(pidx) {
        return await Payment.findOne({
            where: { pidx },
            include: [{ model: Booking, as: 'booking', include: [{ model: Room, as: 'room' }] }]
        });
    }

    async loadLockedPaymentAndBooking(pidx, tx) {
        const lockedPayment = await Payment.findOne({
            where: { pidx },
            transaction: tx,
            lock: tx.LOCK.UPDATE
        });

        if (!lockedPayment) {
            throw new Error('Payment/Booking record not found');
        }

        const lockedBooking = await Booking.findByPk(lockedPayment.booking_id, {
            include: [
                {
                    model: Room,
                    as: 'room',
                    required: true,
                    include: [{ model: Hostel, as: 'hostel', required: true }]
                },
                { model: User, as: 'student', required: true }
            ],
            transaction: tx,
            lock: tx.LOCK.UPDATE
        });

        if (!lockedBooking) {
            throw new Error('Payment/Booking record not found');
        }

        return { lockedPayment, lockedBooking };
    }

    async markPaymentFailed(payment, payload, tx, error = null) {
        await payment.update(
            { status: 'FAILED', metadata: error ? { ...payload, error } : payload },
            { transaction: tx }
        );

        // Notify Student
        const booking = await Booking.findByPk(payment.booking_id, {
            include: [{ model: Room, as: 'room', include: [{ model: Hostel, as: 'hostel' }] }]
        });

        if (booking) {
            await NotificationService.createNotification({
                recipient_id: booking.user_id,
                type: 'payment_failed',
                title: 'Payment Failed',
                message: `Your payment of Rs. ${payment.amount} for ${booking.room.hostel.name} has failed.`,
                related_id: booking.booking_id,
                shouldEmail: false // Typically don't email for every failure unless it's critical
            });
        }
    }

    async cancelCompetingBookings(booking, tx) {
        const competing = await Booking.findAll({
            where: {
                user_id: booking.user_id,
                booking_id: { [Op.ne]: booking.booking_id },
                status: { [Op.in]: ['REQUESTED', 'APPROVED'] }
            },
            transaction: tx,
            lock: tx.LOCK.UPDATE
        });

        for (const comp of competing) {
            if (comp.status === 'APPROVED') {
                const compRoom = await Room.findByPk(comp.room_id, {
                    transaction: tx,
                    lock: tx.LOCK.UPDATE
                });

                if (compRoom) {
                    compRoom.available_beds += 1;
                    if (compRoom.status === 'FULL') compRoom.status = 'AVAILABLE';
                    await compRoom.save({ transaction: tx });
                }
            }

            await comp.update({ status: 'CANCELLED' }, { transaction: tx });
        }
    }

    async applySuccessfulPayment(lockedPayment, lockedBooking, verificationData, tx) {
        await lockedPayment.update(
            {
                status: 'COMPLETED',
                transaction_id: verificationData.transaction_id,
                metadata: verificationData
            },
            { transaction: tx }
        );

        const total = lockedBooking.months * lockedBooking.room.price;
        const paid = await this.getPaidAmount(lockedBooking.booking_id, tx);

        await lockedBooking.update(
            {
                status: 'CONFIRMED',
                payment_status: paid >= total ? 'PAID' : 'PARTIAL'
            },
            { transaction: tx }
        );

        await this.cancelCompetingBookings(lockedBooking, tx);

        // Prepare notification context for post-commit dispatch.
        const student = lockedBooking.student || await User.findByPk(lockedBooking.user_id);
        const hostel = lockedBooking.room?.hostel || await Hostel.findByPk(lockedBooking.room.hostel_id);
        const hostelName = hostel?.name || 'your hostel';
        const studentName = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() || 'A student';
        const roomLabel = lockedBooking.room.room_number || lockedBooking.room.room_id;

        return {
            bookingId: lockedBooking.booking_id,
            studentRecipientId: lockedBooking.user_id,
            ownerRecipientId: hostel?.user_id || null,
            hostelName,
            studentName,
            roomLabel,
            amount: lockedPayment.amount
        };
    }

    async dispatchSuccessfulPaymentNotifications(context) {
        const tasks = [
            NotificationService.createNotification({
                recipient_id: context.studentRecipientId,
                type: 'payment_success',
                title: 'Payment Successful',
                message: `Your payment of Rs. ${context.amount} for ${context.hostelName} was successful. Your booking is now CONFIRMED.`,
                related_id: context.bookingId,
                shouldEmail: true
            })
        ];

        if (context.ownerRecipientId) {
            tasks.push(
                NotificationService.createNotification({
                    recipient_id: context.ownerRecipientId,
                    type: 'booking_confirmed',
                    title: 'New Confirmed Booking',
                    message: `Booking for room ${context.roomLabel} in ${context.hostelName} has been confirmed by ${context.studentName}.`,
                    related_id: context.bookingId,
                    shouldEmail: true
                })
            );
        }

        await Promise.allSettled(tasks);
    }

    async initiatePayment(bookingId, paymentType, amount, months, userId) {
        const booking = await this.getBookingForPayment(bookingId);

        if (!booking) throw new Error('Booking not found');

        this.ensureBookingOwnership(booking, userId, 'Unauthorized: You can only pay for your own booking');

        this.ensureBookingPayable(booking);
        
        if (booking.payment_status === 'PAID') throw new Error('Already fully paid');

        const type = this.normalizePaymentType(paymentType);
        const totalCost = booking.months * booking.room.price;
        const totalPaid = await this.getPaidAmount(bookingId);
        const amountNRS = this.computePayableAmount({
            type,
            amount,
            months,
            totalCost,
            totalPaid,
            roomPrice: booking.room.price
        });
        
        const amountPaisa = Math.round(amountNRS * 100);

        const reusableSession = await this.invalidateOrReusePendingPayment(bookingId, type, amountNRS);
        if (reusableSession) {
            return reusableSession;
        }

        const payload = this.buildKhaltiPayload(booking, amountPaisa);

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

    async verifyPayment(pidx, userId) {
        try {
            const payment = await this.fetchPaymentContextByPidx(pidx);
            if (!payment || !payment.booking) throw new Error('Payment/Booking record not found');

            this.ensureBookingOwnership(payment.booking, userId, 'Unauthorized: You can only verify your own booking payment');

            if (payment.status === 'COMPLETED') return { success: true, message: 'Already verified' };
            if (payment.status === 'FAILED') throw new Error('Payment already failed');

            const response = await axios.post(this.verifyUrl, { pidx }, {
                headers: { Authorization: `Key ${this.secretKey}`, 'Content-Type': 'application/json' }
            });

            const tx = await sequelize.transaction();
            try {
                const { lockedPayment, lockedBooking } = await this.loadLockedPaymentAndBooking(pidx, tx);

                this.ensureBookingOwnership(lockedBooking, userId, 'Unauthorized: You can only verify your own booking payment');

                if (lockedPayment.status === 'COMPLETED') {
                    await tx.commit();
                    return { success: true, message: 'Already verified' };
                }

                if (lockedPayment.status === 'FAILED') {
                    throw new Error('Payment already failed');
                }

                this.ensureBookingPayable(lockedBooking);

                if (response.data.status !== KHALTI_COMPLETED_STATUS) {
                    await this.markPaymentFailed(lockedPayment, response.data, tx);
                    await tx.commit();
                    return { success: false, message: 'Khalti payment not completed' };
                }

                if (parseInt(response.data.total_amount) !== Math.round(lockedPayment.amount * 100)) {
                    await this.markPaymentFailed(lockedPayment, response.data, tx, 'Amount mismatch');
                    await tx.commit();
                    return { success: false, message: 'Amount mismatch' };
                }

                const notificationContext = await this.applySuccessfulPayment(lockedPayment, lockedBooking, response.data, tx);

                await tx.commit();

                setImmediate(() => {
                    this.dispatchSuccessfulPaymentNotifications(notificationContext)
                        .catch((notifyErr) => console.error('Post-payment notification error:', notifyErr?.message || notifyErr));
                });

                return { success: true, message: 'Verified and Confirmed' };
            } catch (txErr) {
                await tx.rollback();
                throw txErr;
            }
        } catch (error) {
            console.error('Verification Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getPaymentStatus(pidx, userId) {
        const payment = await Payment.findOne({
            where: { pidx },
            include: [{
                model: Booking,
                as: 'booking',
                include: [{ model: Room, as: 'room', include: [{ model: Hostel, as: 'hostel' }] }]
            }]
        });

        if (!payment || !payment.booking) throw new Error('Payment/Booking record not found');

        if (payment.booking.user_id !== userId) {
            throw new Error('Unauthorized: You can only view your own booking payment status');
        }

        return {
            success: true,
            status: payment.status,
            payment_status: payment.booking.payment_status,
            booking_status: payment.booking.status,
            pidx: payment.pidx,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            payment_type: payment.payment_type,
            updated_at: payment.updatedAt
        };
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
                await booking.update({ status: 'CANCELLED' });
            }
        }

        return expired.length;
    }

    async expirePendingBookings() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const expiredPending = await Booking.update(
            { status: 'CANCELLED' },
            {
                where: {
                    status: 'REQUESTED',
                    createdAt: { [Op.lt]: sevenDaysAgo }
                }
            }
        );

        return expiredPending[0] || 0;
    }

    async runBookingExpiryJobs() {
        const expiredPendingCount = await this.expirePendingBookings();
        const expiredApprovedCount = await this.expireOldBookings();

        return {
            expiredPendingCount,
            expiredApprovedCount
        };
    }

    async getStudentPayments(userId) {
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
