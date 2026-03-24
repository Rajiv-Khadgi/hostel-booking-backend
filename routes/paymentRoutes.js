import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
    initiateKhaltiPayment, 
    verifyKhaltiPayment,
    getPaymentStatus,
    getStudentPayments,
    getOwnerPayments,
    getAllPayments
} from '../controllers/paymentController.js';

const router = express.Router();

// Initiate Payment
router.post('/initiate', authenticate, initiateKhaltiPayment);

// Verify Payment (Callback from Khalti)
// Note: Khalti redirects to the frontend, which then calls this backend endpoint
router.get('/verify', verifyKhaltiPayment);

// Get Status by PIDX
router.get('/status/:pidx', authenticate, getPaymentStatus);

// History Routes
router.get('/history/student', authenticate, getStudentPayments);
router.get('/history/owner', authenticate, getOwnerPayments);
router.get('/history/admin', authenticate, getAllPayments);

export default router;
