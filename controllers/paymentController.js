import PaymentService from '../services/paymentService.js';

export const initiateKhaltiPayment = async (req, res) => {
    try {
        const { bookingId, paymentType } = req.body;
        
        if (!bookingId || !paymentType) {
            return res.status(400).json({ error: 'bookingId and paymentType are required' });
        }

        // Optional: Check if the user making the request belongs to the booking
        // This assumes authenticate middleware sets req.user.id
        // const booking = await Booking.findByPk(bookingId);
        // if (booking.user_id !== req.user.id) {
        //     return res.status(403).json({ error: 'Unauthorized to pay for this booking' });
        // }

        const data = await PaymentService.initiatePayment(bookingId, paymentType);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error('Initiate payment error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const verifyKhaltiPayment = async (req, res) => {
    try {
        const { pidx } = req.query; // Khalti redirects with pidx in query string
        
        if (!pidx) {
            return res.status(400).json({ error: 'pidx is required for verification' });
        }

        const result = await PaymentService.verifyPayment(pidx);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getPaymentStatus = async (req, res) => {
    try {
        const { pidx } = req.params;
        const result = await PaymentService.verifyPayment(pidx);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
