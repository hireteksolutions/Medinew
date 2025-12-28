import mongoose from 'mongoose';
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_TYPES,
  PAYMENT_TYPE_VALUES,
  PAYMENT_GATEWAYS,
  PAYMENT_GATEWAY_VALUES,
  DEFAULT_PAYMENT_STATUS,
  DEFAULT_PAYMENT_METHOD,
} from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD_VALUES,
      required: true,
      default: DEFAULT_PAYMENT_METHOD,
    },
    paymentType: {
      type: String,
      enum: PAYMENT_TYPE_VALUES,
      required: true,
      default: PAYMENT_TYPES.APPOINTMENT,
    },
    paymentGateway: {
      type: String,
      enum: PAYMENT_GATEWAY_VALUES,
      default: PAYMENT_GATEWAYS.OFFLINE,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      required: true,
      default: DEFAULT_PAYMENT_STATUS,
      index: true,
    },
    // Payment gateway specific fields
    transactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      sparse: true,
    },
    gatewayOrderId: {
      type: String,
      sparse: true,
    },
    paymentIntentId: {
      type: String,
      sparse: true,
    },
    // Refund information
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
      trim: true,
    },
    refundedAt: {
      type: Date,
    },
    // Payment details/metadata
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Gateway response/error information
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    gatewayError: {
      code: String,
      message: String,
      details: mongoose.Schema.Types.Mixed,
    },
    // Payment metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Timestamps for payment flow
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    // Payment receipt/invoice
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate receipt number before saving if payment is completed
paymentSchema.pre('save', async function (next) {
  if (this.isNew && this.status === PAYMENT_STATUSES.COMPLETED && !this.receiptNumber) {
    const count = await mongoose.model('Payment').countDocuments({
      status: PAYMENT_STATUSES.COMPLETED,
    });
    this.receiptNumber = `RCP-${Date.now()}-${count + 1}`;
  }

  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === PAYMENT_STATUSES.COMPLETED && !this.paidAt) {
      this.paidAt = now;
    } else if (this.status === PAYMENT_STATUSES.FAILED && !this.failedAt) {
      this.failedAt = now;
    } else if (this.status === PAYMENT_STATUSES.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = now;
    } else if (this.status === PAYMENT_STATUSES.REFUNDED && !this.refundedAt) {
      this.refundedAt = now;
    }
  }

  next();
});

// Indexes for better query performance
paymentSchema.index({ appointmentId: 1, status: 1 });
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ doctorId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ gatewayOrderId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paymentMethod: 1, status: 1 });
paymentSchema.index({ paymentGateway: 1, status: 1 });

// Virtual for isRefundable
paymentSchema.virtual('isRefundable').get(function () {
  return this.status === PAYMENT_STATUSES.COMPLETED;
});

// Virtual for refundAmountRemaining
paymentSchema.virtual('refundAmountRemaining').get(function () {
  return Math.max(0, this.amount - this.refundAmount);
});

// Instance method to check if payment can be refunded
paymentSchema.methods.canRefund = function (amount = null) {
  if (this.status !== PAYMENT_STATUSES.COMPLETED) {
    return { canRefund: false, reason: 'Payment is not completed' };
  }
  if (this.status === PAYMENT_STATUSES.REFUNDED) {
    return { canRefund: false, reason: 'Payment has already been fully refunded' };
  }
  if (amount && amount > this.refundAmountRemaining) {
    return {
      canRefund: false,
      reason: 'Refund amount exceeds remaining refundable amount',
    };
  }
  return { canRefund: true };
};

// Instance method to initiate refund
paymentSchema.methods.initiateRefund = function (amount, reason = null) {
  const refundCheck = this.canRefund(amount);
  if (!refundCheck.canRefund) {
    throw new Error(refundCheck.reason);
  }

  const refundAmount = amount || this.refundAmountRemaining;
  this.refundAmount = (this.refundAmount || 0) + refundAmount;
  this.refundReason = reason || this.refundReason;

  if (this.refundAmount >= this.amount) {
    this.status = PAYMENT_STATUSES.REFUNDED;
    this.refundedAt = new Date();
  } else {
    this.status = PAYMENT_STATUSES.PARTIALLY_REFUNDED;
  }

  return this;
};

export default mongoose.model('Payment', paymentSchema);

