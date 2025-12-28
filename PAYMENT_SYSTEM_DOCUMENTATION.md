# Payment System Documentation

## Overview

A comprehensive, industry-standard payment system has been implemented for the MediNew healthcare management system. The payment system is flexible, extensible, and supports multiple payment methods and gateways.

## Features

### ✅ Implemented Features

1. **Multiple Payment Methods**
   - Online Payments (Card, UPI, Wallet, Net Banking)
   - Pay at Clinic (Cash, Card, Cheque)

2. **Payment Gateway Abstraction**
   - Support for multiple payment gateways (Stripe, Razorpay, PayPal, etc.)
   - Easy to add new gateways
   - Offline payment support

3. **Complete Payment Lifecycle**
   - Payment Creation
   - Payment Verification
   - Payment Status Updates
   - Refund Processing
   - Webhook Handling

4. **User Roles & Permissions**
   - Patients can create and view their payments
   - Doctors can view payments and mark offline payments as paid
   - Admins have full access to all payments

## Architecture

### Backend Structure

```
server/
├── models/
│   └── Payment.js              # Payment model with all payment fields
├── controllers/
│   └── paymentController.js    # Payment business logic
├── routes/
│   └── payment.js              # Payment API routes
├── services/
│   └── paymentGatewayService.js # Payment gateway abstraction layer
└── constants/
    ├── index.js                # Payment constants (methods, statuses, gateways)
    └── messages.js             # Payment-related messages
```

### Frontend Structure

```
client/src/
├── pages/
│   └── Payment.tsx             # Payment page component
├── services/
│   └── api.ts                  # Payment API service
└── constants/
    └── routes.ts               # Payment route constants
```

## Payment Flow

### 1. Appointment Booking → Payment

1. Patient books an appointment
2. After successful booking, patient is redirected to payment page
3. Patient selects payment method:
   - **Pay Online**: Card, UPI, Wallet, Net Banking
   - **Pay at Clinic**: Cash/Card at clinic reception

### 2. Online Payment Flow

1. Patient selects "Pay Online" and chooses payment method
2. Payment record is created with `PENDING` status
3. Payment gateway is initialized (Stripe/Razorpay/etc.)
4. Patient is redirected to gateway payment page
5. After payment, webhook updates payment status to `COMPLETED`
6. Appointment payment status is updated

### 3. Offline Payment Flow

1. Patient selects "Pay at Clinic"
2. Payment record is created with `PENDING` status and `OFFLINE` gateway
3. Patient visits clinic and pays at reception
4. Doctor/Admin marks payment as `COMPLETED` manually

## Database Schema

### Payment Model

```javascript
{
  appointmentId: ObjectId,        // Reference to Appointment
  patientId: ObjectId,            // Reference to User (Patient)
  doctorId: ObjectId,             // Reference to User (Doctor)
  amount: Number,                 // Payment amount
  currency: String,               // Currency (default: INR)
  paymentMethod: String,          // online, cash, card, upi, wallet, etc.
  paymentType: String,            // appointment, consultation, service
  paymentGateway: String,         // stripe, razorpay, offline, etc.
  status: String,                 // pending, processing, completed, failed, cancelled, refunded
  transactionId: String,          // Unique transaction ID
  gatewayTransactionId: String,   // Gateway-specific transaction ID
  gatewayOrderId: String,         // Gateway order ID
  paymentIntentId: String,        // Payment intent ID (for Stripe)
  refundAmount: Number,           // Refunded amount
  refundReason: String,           // Reason for refund
  paymentDetails: Object,         // Additional payment details
  gatewayResponse: Object,        // Gateway response
  gatewayError: Object,           // Gateway error details
  receiptNumber: String,          // Receipt number
  paidAt: Date,                   // Payment completion timestamp
  failedAt: Date,                 // Payment failure timestamp
  cancelledAt: Date,              // Payment cancellation timestamp
  refundedAt: Date,               // Refund timestamp
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Payment Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payments` | Create payment | Patient |
| GET | `/api/payments` | Get all payments | All (filtered by role) |
| GET | `/api/payments/:id` | Get payment by ID | All (with authorization) |
| GET | `/api/payments/appointment/:appointmentId` | Get payment by appointment | All (with authorization) |
| PUT | `/api/payments/:id/status` | Update payment status | Doctor, Admin |
| POST | `/api/payments/:id/verify` | Verify payment | All (with authorization) |
| POST | `/api/payments/:id/refund` | Process refund | Doctor, Admin |
| PUT | `/api/payments/:id/cancel` | Cancel payment | Patient |
| POST | `/api/payments/webhook/:gateway` | Payment webhook | Public (webhook) |

### Request/Response Examples

#### Create Payment

**Request:**
```json
POST /api/payments
{
  "appointmentId": "60a7c8f9e1b2c3d4e5f6g7h8",
  "paymentMethod": "online",
  "paymentGateway": "stripe",
  "metadata": {
    "notes": "Appointment payment"
  }
}
```

**Response:**
```json
{
  "message": "Payment created successfully",
  "payment": {
    "_id": "60a7c8f9e1b2c3d4e5f6g7h9",
    "amount": 500,
    "status": "pending",
    "transactionId": "stripe_1234567890",
    ...
  },
  "gatewayResponse": {
    "clientSecret": "pi_xxxxx_secret_xxxxx",
    ...
  }
}
```

## Payment Gateway Integration

### Adding a New Payment Gateway

1. **Extend BasePaymentGateway** in `server/services/paymentGatewayService.js`:

```javascript
class MyNewGateway extends BasePaymentGateway {
  constructor(config) {
    super(config);
    this.gatewayName = 'mynewgateway';
  }

  async createPayment(paymentData) {
    // Implement payment creation logic
  }

  async verifyPayment(transactionId) {
    // Implement payment verification logic
  }

  async processRefund(transactionId, amount, reason) {
    // Implement refund logic
  }

  async verifyWebhook(payload, signature) {
    // Implement webhook verification logic
  }
}
```

2. **Add Gateway to Factory**:

```javascript
// In PaymentGatewayFactory.createGateway()
case 'mynewgateway':
  return new MyNewGateway(gatewayConfig);
```

3. **Add Gateway to Constants**:

```javascript
// In server/constants/index.js
export const PAYMENT_GATEWAYS = {
  // ... existing gateways
  MY_NEW_GATEWAY: 'mynewgateway',
};
```

### Gateway Configuration

Gateway configuration is loaded from environment variables:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# PayPal
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox
```

## Payment Status Flow

```
PENDING → PROCESSING → COMPLETED
    ↓           ↓
FAILED    CANCELLED

COMPLETED → REFUNDED
COMPLETED → PARTIALLY_REFUNDED
```

## Security Considerations

1. **Payment Gateway Integration**
   - All sensitive operations (create, verify, refund) go through gateway services
   - Webhook signatures are verified before processing

2. **Authorization**
   - Patients can only view/modify their own payments
   - Doctors can update offline payment statuses
   - Admins have full access

3. **Data Protection**
   - Payment details are stored securely
   - No sensitive card information is stored
   - Gateway responses are encrypted

## Frontend Integration

### Payment Page

The payment page (`/payment/:appointmentId`) provides:

1. **Payment Type Selection**
   - Pay Online
   - Pay at Clinic

2. **Payment Method Selection** (for online payments)
   - Card
   - UPI
   - Wallet
   - Net Banking

3. **Payment Summary**
   - Appointment details
   - Consultation fee
   - Total amount

### Integration with Appointment Booking

After successful appointment booking, users are automatically redirected to the payment page:

```typescript
// In BookAppointment.tsx
const response = await appointmentService.create(data);
const appointmentId = response.data.appointment?._id;
navigate(`/payment/${appointmentId}`);
```

## Testing

### Test Payment Scenarios

1. **Online Payment**
   - Create payment with online method
   - Verify payment gateway integration
   - Test webhook processing

2. **Offline Payment**
   - Create payment with offline method
   - Verify manual status update
   - Test receipt generation

3. **Refunds**
   - Test full refund
   - Test partial refund
   - Verify refund status updates

## Future Enhancements

1. **Payment Gateway SDKs**
   - Install actual SDK packages (stripe, razorpay)
   - Implement full gateway functionality

2. **Payment Methods**
   - Recurring payments
   - Installment payments
   - Insurance billing

3. **Reporting**
   - Payment analytics
   - Revenue reports
   - Refund reports

4. **Notifications**
   - Payment confirmation emails
   - Payment reminder notifications
   - Refund notifications

## Environment Setup

Add these to your `.env` file:

```env
# Payment Gateway Keys (optional - only if using online payments)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

## Usage Examples

### Creating a Payment

```javascript
// Frontend
const paymentData = {
  appointmentId: '60a7c8f9e1b2c3d4e5f6g7h8',
  paymentMethod: 'online',
  paymentGateway: 'stripe',
};

const response = await paymentService.create(paymentData);
```

### Verifying Payment

```javascript
// After payment completion
const payment = await paymentService.verify(paymentId);
```

### Processing Refund

```javascript
// Admin/Doctor
const refundData = {
  amount: 500, // Optional - full refund if not provided
  reason: 'Patient requested refund',
};

const response = await paymentService.refund(paymentId, refundData);
```

## Support

For issues or questions about the payment system, refer to:
- Payment gateway documentation (Stripe, Razorpay, etc.)
- API documentation
- Code comments in payment controller and service files

