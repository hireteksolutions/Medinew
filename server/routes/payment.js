import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createPayment,
  getPayment,
  getPayments,
  getPaymentByAppointment,
  updatePaymentStatus,
  verifyPayment,
  processRefund,
  handleWebhook,
  cancelPayment,
} from '../controllers/paymentController.js';
import { USER_ROLES } from '../constants/index.js';
import { PAYMENT_ROUTES } from '../constants/routes.js';

const router = express.Router();

// Webhook route - must be public (webhooks come from external services)
router.post(PAYMENT_ROUTES.WEBHOOK, handleWebhook);

// All other routes require authentication
router.use(protect);

// Create payment - only patients can create
router.post(PAYMENT_ROUTES.ROOT, authorize(USER_ROLES.PATIENT), createPayment);

// Get payments - all authenticated users can view their own payments
router.get(PAYMENT_ROUTES.ROOT, getPayments);

// Get payment by appointment ID
router.get(PAYMENT_ROUTES.BY_APPOINTMENT, getPaymentByAppointment);

// Get payment by ID - all authenticated users can view (with authorization check in controller)
router.get(PAYMENT_ROUTES.BY_ID, getPayment);

// Verify payment - patients can verify their own payments
router.post(PAYMENT_ROUTES.VERIFY, verifyPayment);

// Cancel payment - patients can cancel their own pending payments
router.put(PAYMENT_ROUTES.CANCEL, cancelPayment);

// Update payment status - admin and doctors (for offline payments)
router.put(PAYMENT_ROUTES.UPDATE_STATUS, authorize(USER_ROLES.DOCTOR, USER_ROLES.ADMIN), updatePaymentStatus);

// Process refund - admin and doctors
router.post(PAYMENT_ROUTES.REFUND, authorize(USER_ROLES.DOCTOR, USER_ROLES.ADMIN), processRefund);

export default router;

