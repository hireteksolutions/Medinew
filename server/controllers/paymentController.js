import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import PaymentGatewayFactory from '../services/paymentGatewayService.js';
import {
  USER_ROLES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_GATEWAYS,
  PAYMENT_TYPES,
} from '../constants/index.js';
import { PAYMENT_MESSAGES, APPOINTMENT_MESSAGES, AUTHZ_MESSAGES } from '../constants/messages.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

/**
 * @desc    Create payment for an appointment
 * @route   POST /api/payments
 * @access  Private (Patient)
 */
export const createPayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod, paymentGateway, metadata } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: PAYMENT_MESSAGES.APPOINTMENT_ID_REQUIRED });
    }

    // Validate payment method
    if (!paymentMethod || !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      return res.status(400).json({ message: PAYMENT_MESSAGES.INVALID_PAYMENT_METHOD });
    }

    // Get appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'consultationFee')
      .populate('patientId');

    if (!appointment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization - only patient who owns the appointment can create payment
    if (appointment.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Check if payment already exists for this appointment
    let existingPayment = await Payment.findOne({ appointmentId, status: { $ne: PAYMENT_STATUSES.CANCELLED } });
    
    // If payment exists and is already completed, don't allow creating a new one
    if (existingPayment && existingPayment.status === PAYMENT_STATUSES.COMPLETED) {
      return res.status(400).json({
        message: 'Payment already exists and is completed for this appointment',
        payment: existingPayment,
      });
    }

    // Get payment amount from appointment
    const amount = appointment.consultationFee || 0;

    // Determine payment gateway
    let gateway = paymentGateway;
    if (!gateway) {
      if (paymentMethod === PAYMENT_METHODS.CASH || paymentMethod === PAYMENT_METHODS.CHEQUE) {
        gateway = PAYMENT_GATEWAYS.OFFLINE;
      } else if (paymentMethod === PAYMENT_METHODS.ONLINE) {
        gateway = PAYMENT_GATEWAYS.RAZORPAY; // Default to Razorpay
      } else {
        gateway = PAYMENT_GATEWAYS.OFFLINE;
      }
    }

    // If payment exists but is PENDING or FAILED, update it instead of creating a new one
    let payment;
    if (existingPayment && (existingPayment.status === PAYMENT_STATUSES.PENDING || existingPayment.status === PAYMENT_STATUSES.FAILED)) {
      // Update existing payment with new payment method/gateway if provided
      existingPayment.paymentMethod = paymentMethod || existingPayment.paymentMethod;
      existingPayment.paymentGateway = gateway || existingPayment.paymentGateway;
      existingPayment.status = PAYMENT_STATUSES.PENDING;
      if (metadata) {
        existingPayment.metadata = { ...existingPayment.metadata, ...metadata };
      }
      payment = existingPayment;
      gateway = payment.paymentGateway; // Use the payment's gateway
      // Save the updated payment
      await payment.save();
    } else {
      // No existing payment, create a new one
      payment = await Payment.create({
        appointmentId: appointment._id,
        patientId: appointment.patientId._id,
        doctorId: appointment.doctorId._id,
        amount,
        currency: 'INR',
        paymentMethod,
        paymentType: PAYMENT_TYPES.APPOINTMENT,
        paymentGateway: gateway,
        status: PAYMENT_STATUSES.PENDING,
        metadata: metadata || {},
      });
    }

    // If online payment, create/update payment with gateway (only if not already created)
    let gatewayResponse = null;
    if (gateway !== PAYMENT_GATEWAYS.OFFLINE && !payment.gatewayOrderId) {
      try {
        const gatewayConfig = PaymentGatewayFactory.getGatewayConfig(gateway);
        const paymentGatewayInstance = PaymentGatewayFactory.createGateway(gateway, gatewayConfig);

        const gatewayData = await paymentGatewayInstance.createPayment({
          amount,
          currency: 'INR',
          receipt: `APT-${appointment.appointmentNumber}`,
          metadata: {
            appointmentId: appointment._id.toString(),
            patientId: appointment.patientId._id.toString(),
            doctorId: appointment.doctorId._id.toString(),
          },
        });

        // Update payment with gateway data
        payment.transactionId = gatewayData.transactionId;
        payment.gatewayTransactionId = gatewayData.transactionId;
        payment.gatewayOrderId = gatewayData.orderId || gatewayData.transactionId;
        payment.paymentIntentId = gatewayData.paymentIntentId || gatewayData.clientSecret;
        payment.gatewayResponse = gatewayData;
        gatewayResponse = gatewayData;
        await payment.save();
      } catch (error) {
        console.error('Payment gateway error:', error);
        payment.gatewayError = {
          code: error.code || 'GATEWAY_ERROR',
          message: error.message,
          details: error,
        };
        await payment.save();
      }
    } else if (gateway !== PAYMENT_GATEWAYS.OFFLINE && payment.gatewayOrderId) {
      // If gateway order already exists, return existing gateway response
      gatewayResponse = payment.gatewayResponse;
    }

    // Populate payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName specialization');

    res.status(201).json({
      message: PAYMENT_MESSAGES.PAYMENT_CREATED_SUCCESSFULLY,
      payment: populatedPayment,
      gatewayResponse, // Include gateway response for client-side payment processing
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName specialization');

    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    // Check authorization
    const isPatient = req.user.role === USER_ROLES.PATIENT && payment.patientId._id.toString() === req.user._id.toString();
    const isDoctor = req.user.role === USER_ROLES.DOCTOR && payment.doctorId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: PAYMENT_MESSAGES.NOT_AUTHORIZED_TO_VIEW_PAYMENT });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get payments for current user
 * @route   GET /api/payments
 * @access  Private
 */
export const getPayments = async (req, res) => {
  try {
    const { status, paymentMethod } = req.query;
    
    // Get pagination parameters
    const { limit, offset } = getPaginationParams(req);
    
    const query = {};

    // Filter based on user role
    if (req.user.role === USER_ROLES.PATIENT) {
      query.patientId = req.user._id;
    } else if (req.user.role === USER_ROLES.DOCTOR) {
      query.doctorId = req.user._id;
    }
    // Admin can see all payments (no filter)

    // Additional filters
    if (status) {
      query.status = status;
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Get total count before pagination
    const total = await Payment.countDocuments(query);

    const payments = await Payment.find(query)
      .populate('appointmentId', 'appointmentNumber appointmentDate timeSlot')
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    // Build pagination metadata
    const pagination = buildPaginationMeta(total, limit, offset);

    res.json({
      payments,
      pagination
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get payment by appointment ID
 * @route   GET /api/payments/appointment/:appointmentId
 * @access  Private
 */
export const getPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.APPOINTMENT_NOT_FOUND });
    }

    // Check authorization
    const isPatient = req.user.role === USER_ROLES.PATIENT && appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = req.user.role === USER_ROLES.DOCTOR && appointment.doctorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    const payment = await Payment.findOne({ appointmentId })
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ createdAt: -1 });

    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update payment status (for manual updates or webhook processing)
 * @route   PUT /api/payments/:id/status
 * @access  Private (Admin, Doctor - for offline payments)
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId, gatewayResponse } = req.body;

    if (!status || !Object.values(PAYMENT_STATUSES).includes(status)) {
      return res.status(400).json({ message: PAYMENT_MESSAGES.INVALID_PAYMENT_STATUS });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    // Authorization checks
    const isAdmin = req.user.role === USER_ROLES.ADMIN;
    const isDoctor = req.user.role === USER_ROLES.DOCTOR && payment.doctorId.toString() === req.user._id.toString();

    // Only allow manual status updates for offline payments (admin/doctor)
    // Online payments should be updated via webhooks
    if (payment.paymentGateway !== PAYMENT_GATEWAYS.OFFLINE && !isAdmin) {
      return res.status(403).json({
        message: 'Online payment status can only be updated via webhooks or by admin',
      });
    }

    if (!isAdmin && !isDoctor) {
      return res.status(403).json({ message: PAYMENT_MESSAGES.NOT_AUTHORIZED_TO_UPDATE_PAYMENT });
    }

    // Update payment
    payment.status = status;
    if (transactionId) payment.transactionId = transactionId;
    if (gatewayResponse) payment.gatewayResponse = gatewayResponse;

    await payment.save();

    // Update appointment payment status if payment is completed
    if (status === PAYMENT_STATUSES.COMPLETED) {
      await Appointment.findByIdAndUpdate(payment.appointmentId, {
        paymentStatus: PAYMENT_STATUSES.COMPLETED,
      });
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName specialization');

    res.json({
      message: PAYMENT_MESSAGES.PAYMENT_UPDATED_SUCCESSFULLY,
      payment: updatedPayment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Verify payment with gateway
 * @route   POST /api/payments/:id/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    // Check authorization
    if (req.user.role === USER_ROLES.PATIENT && payment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Skip verification for offline payments
    if (payment.paymentGateway === PAYMENT_GATEWAYS.OFFLINE) {
      return res.json({
        message: 'Offline payments cannot be verified automatically',
        payment,
      });
    }

    // Verify with gateway
    try {
      const gatewayConfig = PaymentGatewayFactory.getGatewayConfig(payment.paymentGateway);
      const paymentGatewayInstance = PaymentGatewayFactory.createGateway(payment.paymentGateway, gatewayConfig);

      const verificationResult = await paymentGatewayInstance.verifyPayment(payment.transactionId || payment.gatewayTransactionId);

      // Update payment status based on verification
      if (verificationResult.status === PAYMENT_STATUSES.COMPLETED) {
        payment.status = PAYMENT_STATUSES.COMPLETED;
        payment.gatewayResponse = verificationResult;
        await payment.save();

        // Update appointment payment status
        await Appointment.findByIdAndUpdate(payment.appointmentId, {
          paymentStatus: PAYMENT_STATUSES.COMPLETED,
        });
      }

      const updatedPayment = await Payment.findById(payment._id)
        .populate('appointmentId')
        .populate('patientId', 'firstName lastName email')
        .populate('doctorId', 'firstName lastName specialization');

      res.json({
        message: 'Payment verified successfully',
        payment: updatedPayment,
        verification: verificationResult,
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      payment.gatewayError = {
        code: error.code || 'VERIFICATION_ERROR',
        message: error.message,
        details: error,
      };
      await payment.save();

      res.status(400).json({
        message: 'Payment verification failed',
        error: error.message,
        payment,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/payments/:id/refund
 * @access  Private (Admin, Doctor)
 */
export const processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    // Check authorization (admin or doctor who received payment)
    const isAdmin = req.user.role === USER_ROLES.ADMIN;
    const isDoctor = req.user.role === USER_ROLES.DOCTOR && payment.doctorId.toString() === req.user._id.toString();

    if (!isAdmin && !isDoctor) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Check if refund is possible
    const refundCheck = payment.canRefund(amount);
    if (!refundCheck.canRefund) {
      return res.status(400).json({ message: refundCheck.reason });
    }

    const refundAmount = amount || payment.refundAmountRemaining;

    // Process refund with gateway if online payment
    let refundResponse = null;
    if (payment.paymentGateway !== PAYMENT_GATEWAYS.OFFLINE && payment.transactionId) {
      try {
        const gatewayConfig = PaymentGatewayFactory.getGatewayConfig(payment.paymentGateway);
        const paymentGatewayInstance = PaymentGatewayFactory.createGateway(payment.paymentGateway, gatewayConfig);

        refundResponse = await paymentGatewayInstance.processRefund(
          payment.transactionId,
          refundAmount,
          reason
        );

        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          refund: refundResponse,
        };
      } catch (error) {
        console.error('Refund processing error:', error);
        // Still proceed with refund record even if gateway fails (manual processing)
        payment.gatewayError = {
          ...payment.gatewayError,
          refund: {
            code: error.code || 'REFUND_ERROR',
            message: error.message,
          },
        };
      }
    }

    // Update payment with refund
    payment.initiateRefund(refundAmount, reason);
    await payment.save();

    // Update appointment payment status if fully refunded
    if (payment.status === PAYMENT_STATUSES.REFUNDED) {
      await Appointment.findByIdAndUpdate(payment.appointmentId, {
        paymentStatus: PAYMENT_STATUSES.REFUNDED,
      });
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName specialization');

    res.json({
      message: payment.status === PAYMENT_STATUSES.REFUNDED
        ? PAYMENT_MESSAGES.REFUND_COMPLETED_SUCCESSFULLY
        : PAYMENT_MESSAGES.REFUND_INITIATED_SUCCESSFULLY,
      payment: updatedPayment,
      refundResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Handle payment webhook
 * @route   POST /api/payments/webhook/:gateway
 * @access  Public (webhook)
 */
export const handleWebhook = async (req, res) => {
  try {
    const { gateway } = req.params;
    const signature = req.headers['x-signature'] || req.headers['stripe-signature'] || req.headers['razorpay-signature'];

    if (!Object.values(PAYMENT_GATEWAYS).includes(gateway)) {
      return res.status(400).json({ message: PAYMENT_MESSAGES.INVALID_PAYMENT_GATEWAY });
    }

    // Verify webhook signature
    try {
      const gatewayConfig = PaymentGatewayFactory.getGatewayConfig(gateway);
      const paymentGatewayInstance = PaymentGatewayFactory.createGateway(gateway, gatewayConfig);

      const verifiedPayload = await paymentGatewayInstance.verifyWebhook(req.body, signature);

      if (!verifiedPayload || !verifiedPayload.verified) {
        return res.status(400).json({ message: PAYMENT_MESSAGES.WEBHOOK_VERIFICATION_FAILED });
      }

      // Process webhook based on gateway and event type
      // This is a simplified version - actual implementation would handle different event types
      const eventData = verifiedPayload.data || verifiedPayload;
      const transactionId = eventData.transactionId || eventData.id || eventData.payment_id;

      if (transactionId) {
        const payment = await Payment.findOne({
          $or: [
            { transactionId },
            { gatewayTransactionId: transactionId },
            { gatewayOrderId: transactionId },
          ],
        });

        if (payment) {
          // Update payment status based on webhook event
          if (eventData.status === 'succeeded' || eventData.status === 'captured' || eventData.status === 'paid') {
            payment.status = PAYMENT_STATUSES.COMPLETED;
            await payment.save();

            // Update appointment payment status
            await Appointment.findByIdAndUpdate(payment.appointmentId, {
              paymentStatus: PAYMENT_STATUSES.COMPLETED,
            });
          } else if (eventData.status === 'failed') {
            payment.status = PAYMENT_STATUSES.FAILED;
            await payment.save();
          }

          payment.gatewayResponse = {
            ...payment.gatewayResponse,
            webhook: eventData,
          };
          await payment.save();
        }
      }

      res.json({ message: PAYMENT_MESSAGES.WEBHOOK_PROCESSED_SUCCESSFULLY });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(400).json({
        message: PAYMENT_MESSAGES.WEBHOOK_VERIFICATION_FAILED,
        error: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Cancel payment
 * @route   PUT /api/payments/:id/cancel
 * @access  Private
 */
export const cancelPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: PAYMENT_MESSAGES.PAYMENT_NOT_FOUND });
    }

    // Check authorization
    if (req.user.role === USER_ROLES.PATIENT && payment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: AUTHZ_MESSAGES.NOT_AUTHORIZED });
    }

    // Only allow cancellation of pending payments
    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      return res.status(400).json({
        message: `Cannot cancel payment with status: ${payment.status}`,
      });
    }

    payment.status = PAYMENT_STATUSES.CANCELLED;
    await payment.save();

    const updatedPayment = await Payment.findById(payment._id)
      .populate('appointmentId')
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName specialization');

    res.json({
      message: PAYMENT_MESSAGES.PAYMENT_CANCELLED_SUCCESSFULLY,
      payment: updatedPayment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

