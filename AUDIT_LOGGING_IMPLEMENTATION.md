# Audit Logging Implementation Guide

## Overview
Audit logging has been implemented to track all user actions across the application. The logging utility is located at `server/utils/auditLogger.js`.

## Current Implementation Status

### ✅ Completed
1. **Audit Logger Utility** (`server/utils/auditLogger.js`)
   - Created utility functions for logging
   - Supports success, failure, and error logging
   - Captures IP address, user agent, changes, and metadata

2. **Authentication Controller**
   - ✅ Registration (register)
   - ✅ Login (with failed attempts)
   - ✅ Logout
   - ✅ Profile Update
   - ✅ Password Reset
   - ✅ Forgot Password

3. **Patient Controller**
   - ✅ Profile Update
   - ✅ Medical Record Upload

4. **Appointment Controller**
   - ✅ Create Appointment
   - ✅ Cancel Appointment

### ⏳ Pending Implementation

#### Appointment Controller
- [ ] Reschedule Appointment
- [ ] Update Appointment Status (Complete, Confirm, etc.)
- [ ] Get Appointment (for viewing)

#### Patient Controller
- [ ] Get Appointments (viewing)
- [ ] Get Medical Records (viewing)
- [ ] Delete Medical Record (if exists)

#### Doctor Controller
- [ ] Update Profile
- [ ] Update Schedule (Weekly Availability)
- [ ] Block Dates
- [ ] Get Appointments
- [ ] Update Appointment Status (Complete, Cancel)
- [ ] Mark Payment Paid
- [ ] Get Patients
- [ ] View Patient History

#### Admin Controller
- [ ] Create Admin
- [ ] Approve Admin (First/Second Approval)
- [ ] Reject Admin
- [ ] Approve Doctor
- [ ] Reject Doctor
- [ ] Suspend Doctor
- [ ] Activate Doctor
- [ ] Delete Doctor
- [ ] Suspend Patient
- [ ] Activate Patient
- [ ] Delete Patient
- [ ] Cancel Appointment
- [ ] View Reports

#### Review Controller (if exists)
- [ ] Create Review
- [ ] Update Review
- [ ] Delete Review

#### Payment Controller
- [ ] Process Payment
- [ ] Update Payment Status
- [ ] Process Refund

## How to Add Audit Logging

### Step 1: Import the utility
```javascript
import { createAuditLog } from '../utils/auditLogger.js';
import { HTTP_STATUS } from '../constants/index.js';
```

### Step 2: Add logging after successful operations
```javascript
// Example: After creating/updating an entity
await createAuditLog({
  user: req.user,
  action: 'create_appointment', // Descriptive action name
  entityType: 'appointment', // Entity type (matches AuditLog model enum)
  entityId: appointment._id, // ID of affected entity
  method: req.method, // HTTP method
  endpoint: req.originalUrl, // API endpoint
  status: 'success', // 'success', 'failure', or 'error'
  statusCode: HTTP_STATUS.CREATED, // HTTP status code
  changes: { // Optional: before/after changes
    before: beforeData,
    after: afterData
  },
  metadata: { // Optional: additional context
    doctorId,
    appointmentDate
  },
  req // Request object for IP and user agent
});
```

### Step 3: Add logging for failures/errors
```javascript
// Example: Failed login attempt
await createAuditLog({
  user: { _id: user._id, role: user.role }, // User object or partial
  action: 'login',
  entityType: 'user',
  entityId: user._id,
  method: 'POST',
  endpoint: req.originalUrl,
  status: 'failure', // or 'error'
  statusCode: HTTP_STATUS.UNAUTHORIZED,
  errorMessage: 'Invalid password',
  metadata: { email: user.email },
  req
});
```

## Action Naming Convention

Use descriptive, lowercase action names with underscores:
- `create_appointment`
- `update_profile`
- `cancel_appointment`
- `approve_doctor`
- `suspend_user`
- `upload_medical_record`
- `login`
- `register`

## Entity Types (from AuditLog model)

Available entity types:
- `user`
- `patient`
- `doctor`
- `appointment`
- `review`
- `message`
- `schedule`
- `medical_record`
- `audit_log`
- `system`

## Notes

- Audit logging is non-blocking (uses .catch() internally)
- Logging failures won't break main operations
- All logs are stored in the `auditlogs` collection
- Use query parameters to filter logs by user, action, entity type, etc.
- Admin users can view all logs via `/api/audit-logs`
- Users can view their own logs via `/api/audit-logs/my-logs`

