import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
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
router.post('/initiate', authenticate, authorize('student'), initiateKhaltiPayment);

// Verify Payment (Callback from Khalti)
// Note: Khalti redirects to the frontend, which then calls this backend endpoint
router.get('/verify', authenticate, authorize('student'), verifyKhaltiPayment);

// Get Status by PIDX
router.get('/status/:pidx', authenticate, getPaymentStatus);

// History Routes
router.get('/history/student', authenticate, authorize('student'), getStudentPayments);
router.get('/history/owner', authenticate, authorize('owner'), getOwnerPayments);
router.get('/history/admin', authenticate, authorize('admin'), getAllPayments);

export default router;
