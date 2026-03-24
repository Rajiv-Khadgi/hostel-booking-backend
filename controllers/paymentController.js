import PaymentService from '../services/paymentService.js';

export const initiateKhaltiPayment = async (req, res) => {
    try {
        const { bookingId, paymentType, amount, months } = req.body;
        
        if (!bookingId || !paymentType) {
            return res.status(400).json({ error: 'bookingId and paymentType are required' });
        }

        const data = await PaymentService.initiatePayment(bookingId, paymentType, amount, months);
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

export const getStudentPayments = async (req, res) => {
    try {
        const payments = await PaymentService.getStudentPayments(req.user.id);
        res.json({ success: true, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getOwnerPayments = async (req, res) => {
    try {
        const payments = await PaymentService.getOwnerPayments(req.user.id);
        res.json({ success: true, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAllPayments = async (req, res) => {
    try {
        const payments = await PaymentService.getAllPayments();
        res.json({ success: true, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
