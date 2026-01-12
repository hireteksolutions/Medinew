// Authentication Messages
export const AUTH_MESSAGES = {
  USER_ALREADY_EXISTS: 'User already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  ACCOUNT_PENDING_APPROVAL_MESSAGE: 'Your account is pending admin approval. You will be able to log in once approved.',
  DOCTOR_PROFILE_NOT_FOUND: 'Doctor profile not found',
  USER_NOT_FOUND: 'User not found',
  PASSWORD_RESET_EMAIL_SENT: 'Password reset email sent',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  PASSWORD_RESET_SUCCESSFUL: 'Password reset successful',
  PROFILE_UPDATED_SUCCESSFULLY: 'Profile updated successfully',
  EMAIL_ALREADY_REGISTERED: 'Email is already registered',
  PHONE_ALREADY_REGISTERED: 'Phone number is already registered',
  LICENSE_NUMBER_REQUIRED: 'License number is required for doctors',
  LICENSE_NUMBER_MIN_LENGTH: 'License number must be at least 6 characters',
  LICENSE_NUMBER_MAX_LENGTH: 'License number must not exceed 20 characters',
  LICENSE_NUMBER_FORMAT: 'License number must contain both letters and numbers',
  LICENSE_NUMBER_ALREADY_REGISTERED: 'License number is already registered',
  SPECIALIZATION_REQUIRED: 'Specialization is required for doctors',
  REGISTRATION_SUCCESS_PENDING_APPROVAL: 'Registration successful! Your account is pending admin approval. You will be able to login once approved.',
  ADMIN_REGISTRATION_NOT_ALLOWED: 'Admin registration is not allowed through public registration. Please contact system administrator.',
  INVALID_PASSWORD_FORMAT: 'Invalid password format',
};

// Appointment Messages
export const APPOINTMENT_MESSAGES = {
  DATE_REQUIRED: 'Date is required',
  DOCTOR_DATE_TIME_SLOT_REQUIRED: 'Doctor, date, and time slot are required',
  TIME_SLOT_ALREADY_BOOKED: 'Time slot is already booked',
  APPOINTMENT_BOOKED_SUCCESSFULLY: 'Appointment booked successfully',
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  APPOINTMENT_ALREADY_CANCELLED: 'Appointment is already cancelled',
  CANNOT_CANCEL_COMPLETED_APPOINTMENT: 'Cannot cancel completed appointment',
  APPOINTMENT_CANCELLED_SUCCESSFULLY: 'Appointment cancelled successfully',
  CANNOT_RESCHEDULE_COMPLETED_OR_CANCELLED: 'Cannot reschedule completed or cancelled appointment',
  APPOINTMENT_RESCHEDULED_SUCCESSFULLY: 'Appointment rescheduled successfully',
  APPOINTMENT_UPDATED_SUCCESSFULLY: 'Appointment updated successfully',
  APPOINTMENT_RESCHEDULE_REQUESTED: 'Reschedule request submitted successfully. Admin has been notified.',
  DATE_BLOCKED: 'This date is blocked. Please select another date.',
  TIME_SLOT_BLOCKED: 'This time slot is blocked and not available for booking.',
  INVALID_DATE_FORMAT: 'Invalid date format',
  INVALID_TIME_FORMAT: 'Invalid time format. Use HH:MM format (e.g., 09:00, 14:30)',
  CANNOT_BLOCK_PAST_TIME_SLOT: 'Cannot block past time slots. Please select a future time slot.',
  CANNOT_BLOCK_PAST_DATE: 'Cannot block slots for past dates. Please select a current or future date.',
  TIME_SLOT_ALREADY_BLOCKED: 'This time slot is already marked as unavailable',
};

// Doctor Messages
export const DOCTOR_MESSAGES = {
  DOCTOR_NOT_FOUND: 'Doctor not found',
  DOCTOR_NOT_FOUND_OR_NOT_APPROVED: 'Doctor not found or not approved',
  DOCTOR_PROFILE_NOT_FOUND: 'Doctor profile not found',
  DOCTOR_APPROVED_SUCCESSFULLY: 'Doctor approved successfully',
  SCHEDULE_UPDATED_SUCCESSFULLY: 'Schedule updated successfully',
  PROFILE_UPDATED_SUCCESSFULLY: 'Profile updated successfully',
  LICENSE_NUMBER_ALREADY_EXISTS: 'License number already exists',
  CURRENT_AND_NEW_PASSWORD_REQUIRED: 'Current password and new password are required',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  PASSWORD_CHANGED_SUCCESSFULLY: 'Password changed successfully',
  CERTIFICATIONS_ARRAY_REQUIRED: 'Certifications array is required',
  CERTIFICATIONS_UPLOADED_SUCCESSFULLY: 'Certifications uploaded successfully',
  ONLY_PENDING_APPOINTMENTS_CAN_BE_ACCEPTED: 'Only pending appointments can be accepted',
  APPOINTMENT_ACCEPTED_SUCCESSFULLY: 'Appointment accepted successfully',
  ONLY_PENDING_APPOINTMENTS_CAN_BE_DECLINED: 'Only pending appointments can be declined',
  APPOINTMENT_DECLINED_SUCCESSFULLY: 'Appointment declined successfully',
  APPOINTMENT_ALREADY_COMPLETED: 'Appointment is already completed',
  CANNOT_COMPLETE_CANCELLED_APPOINTMENT: 'Cannot complete a cancelled appointment',
  APPOINTMENT_MARKED_AS_COMPLETED: 'Appointment marked as completed',
  CANNOT_REQUEST_RESCHEDULE_COMPLETED_OR_CANCELLED: 'Cannot request reschedule for completed or cancelled appointments',
  APPOINTMENT_RESCHEDULE_REQUESTED: 'Reschedule request submitted successfully. Admin has been notified.',
};

// File Messages
export const FILE_MESSAGES = {
  FILE_UPLOADED_SUCCESSFULLY: 'File uploaded successfully',
  FILE_DELETED_SUCCESSFULLY: 'File deleted successfully',
  FILE_NOT_FOUND: 'File not found',
  FILE_DOWNLOAD_FAILED: 'File download failed',
  FILE_SIZE_EXCEEDED: 'File size exceeds maximum allowed size',
  FILE_FORMAT_NOT_ALLOWED: 'File format is not allowed',
  VIRUS_SCAN_FAILED: 'Virus scan failed',
  FILE_INFECTED: 'File is infected and cannot be downloaded',
  ACCESS_DENIED: 'Access denied',
};

// Patient Messages
export const PATIENT_MESSAGES = {
  PATIENT_PROFILE_NOT_FOUND: 'Patient profile not found',
  PROFILE_UPDATED_SUCCESSFULLY: 'Profile updated successfully',
  MEDICAL_RECORD_UPLOADED_SUCCESSFULLY: 'Medical record uploaded successfully',
  MEDICAL_RECORD_DELETED_SUCCESSFULLY: 'Medical record deleted successfully',
  MEDICAL_RECORD_NOT_FOUND: 'Medical record not found',
  DOCTOR_ADDED_TO_FAVORITES: 'Doctor added to favorites',
  DOCTOR_REMOVED_FROM_FAVORITES: 'Doctor removed from favorites',
  CURRENT_AND_NEW_PASSWORD_REQUIRED: 'Current password and new password are required',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
  INCORRECT_CURRENT_PASSWORD: 'Current password is incorrect',
  PASSWORD_CHANGED_SUCCESSFULLY: 'Password changed successfully',
  NOT_AUTHORIZED: 'Not authorized to perform this action',
  FILE_ID_OR_URL_REQUIRED: 'File ID or file URL is required',
};

// Authorization Messages
export const AUTHZ_MESSAGES = {
  NOT_AUTHORIZED: 'Not authorized',
  NOT_AUTHORIZED_NO_TOKEN: 'Not authorized, no token',
  NOT_AUTHORIZED_TOKEN_FAILED: 'Not authorized, token failed',
  USER_NOT_FOUND: 'User not found',
  ROLE_NOT_AUTHORIZED: (role) => `User role '${role}' is not authorized to access this route`,
};

// Validation Messages
export const VALIDATION_MESSAGES = {
  PROVIDE_EMAIL: 'Please provide an email',
  PROVIDE_VALID_EMAIL: 'Please provide a valid email',
  PROVIDE_PASSWORD: 'Please provide a password',
  PROVIDE_FIRST_NAME: 'Please provide first name',
  PROVIDE_LAST_NAME: 'Please provide last name',
  PROVIDE_PHONE_NUMBER: 'Please provide phone number',
  PROVIDE_SPECIALIZATION: 'Please provide specialization',
  PROVIDE_LICENSE_NUMBER: 'Please provide license number',
  PROVIDE_CONSULTATION_FEE: 'Please provide consultation fee',
};

// Admin Messages
export const ADMIN_MESSAGES = {
  PATIENT_UPDATED_SUCCESSFULLY: 'Patient updated successfully',
  PATIENT_DELETED_SUCCESSFULLY: 'Patient deleted successfully',
  PATIENT_SUSPENDED_SUCCESSFULLY: 'Patient suspended successfully',
  PATIENT_ACTIVATED_SUCCESSFULLY: 'Patient activated successfully',
  DOCTOR_UPDATED_SUCCESSFULLY: 'Doctor updated successfully',
  DOCTOR_DELETED_SUCCESSFULLY: 'Doctor deleted successfully',
  DOCTOR_SUSPENDED_SUCCESSFULLY: 'Doctor suspended successfully',
  DOCTOR_ACTIVATED_SUCCESSFULLY: 'Doctor activated successfully',
  DOCTOR_REJECTED_SUCCESSFULLY: 'Doctor rejected successfully',
  APPOINTMENT_CANCELLED_SUCCESSFULLY: 'Appointment cancelled successfully',
  EXPORT_GENERATED_SUCCESSFULLY: 'Export generated successfully',
};

// Message Messages
export const MESSAGE_MESSAGES = {
  SUBJECT_AND_DESCRIPTION_REQUIRED: 'Subject and description are required',
  MESSAGE_CREATED_SUCCESSFULLY: 'Message created successfully',
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_UPDATED_SUCCESSFULLY: 'Message updated successfully',
  MESSAGE_DELETED_SUCCESSFULLY: 'Message deleted successfully',
  CANNOT_UPDATE_RESPONDED_MESSAGE: 'Cannot update a message that has been responded to',
  DOCTOR_NOT_FOUND_OR_NOT_APPROVED: 'Doctor not found or not approved',
  DOCTOR_PROFILE_NOT_FOUND: 'Doctor profile not found',
  RESPONSE_MESSAGE_REQUIRED: 'Response message is required',
  MESSAGE_RESPONDED_SUCCESSFULLY: 'Message responded to successfully',
  MESSAGE_IDS_ARRAY_REQUIRED: 'Message IDs array is required',
};

// Specialization Messages
export const SPECIALIZATION_MESSAGES = {
  NAME_REQUIRED: 'Specialization name is required',
  ALREADY_EXISTS: 'Specialization with this name already exists',
  SPECIALIZATION_NOT_FOUND: 'Specialization not found',
  SPECIALIZATION_CREATED_SUCCESSFULLY: 'Specialization created successfully',
  SPECIALIZATION_UPDATED_SUCCESSFULLY: 'Specialization updated successfully',
  SPECIALIZATION_DELETED_SUCCESSFULLY: 'Specialization deleted successfully',
};

// Review Messages
export const REVIEW_MESSAGES = {
  APPOINTMENT_ID_AND_RATING_REQUIRED: 'Appointment ID and rating are required',
  RATING_MUST_BE_BETWEEN_1_AND_5: 'Rating must be between 1 and 5',
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  CAN_ONLY_REVIEW_COMPLETED_APPOINTMENTS: 'Can only review completed appointments',
  REVIEW_ALREADY_EXISTS: 'Review already exists for this appointment',
  REVIEW_CREATED_SUCCESSFULLY: 'Review created successfully',
  REVIEW_NOT_FOUND: 'Review not found',
  REVIEW_UPDATED_SUCCESSFULLY: 'Review updated successfully',
  REVIEW_DELETED_SUCCESSFULLY: 'Review deleted successfully',
};

// Availability Schedule Messages
export const AVAILABILITY_SCHEDULE_MESSAGES = {
  DATE_AND_TIME_SLOTS_REQUIRED: 'Date and time slots are required',
  SCHEDULE_ALREADY_EXISTS: 'Schedule already exists for this date',
  SCHEDULE_NOT_FOUND: 'Availability schedule not found',
  SCHEDULE_CREATED_SUCCESSFULLY: 'Availability schedule created successfully',
  SCHEDULE_UPDATED_SUCCESSFULLY: 'Availability schedule updated successfully',
  SCHEDULE_DELETED_SUCCESSFULLY: 'Availability schedule deleted successfully',
  BULK_UPDATE_COMPLETED: 'Bulk update completed',
  SCHEDULES_ARRAY_REQUIRED: 'Schedules array is required',
};

// Notification Messages
export const NOTIFICATION_MESSAGES = {
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  NOTIFICATION_MARKED_AS_READ: 'Notification marked as read',
  NOTIFICATIONS_MARKED_AS_READ: 'Notifications marked as read',
  NOTIFICATION_DELETED_SUCCESSFULLY: 'Notification deleted successfully',
  NOTIFICATIONS_DELETED_SUCCESSFULLY: 'Notifications deleted successfully',
  NOTIFICATION_IDS_REQUIRED: 'Notification IDs array is required',
};

// Review Rating Messages (extending review messages)
export const REVIEW_RATING_MESSAGES = {
  RESPONSE_MESSAGE_REQUIRED: 'Response message is required',
  RESPONSE_ADDED_SUCCESSFULLY: 'Response added successfully',
};

// Audit Log Messages
export const AUDIT_LOG_MESSAGES = {
  ACTION_AND_ENTITY_TYPE_REQUIRED: 'Action and entity type are required',
  AUDIT_LOG_NOT_FOUND: 'Audit log not found',
  AUDIT_LOG_CREATED_SUCCESSFULLY: 'Audit log created successfully',
};

// Master Role Messages
export const MASTER_ROLE_MESSAGES = {
  ROLE_NAME_AND_DISPLAY_NAME_REQUIRED: 'Role name and display name are required',
  ROLE_ALREADY_EXISTS: 'Role with this name already exists',
  ROLE_NOT_FOUND: 'Role not found',
  CANNOT_DELETE_SYSTEM_ROLE: 'Cannot delete system roles',
  CANNOT_UPDATE_SYSTEM_ROLE_NAME: 'Cannot update role name for system roles',
  ROLE_IN_USE: 'Cannot delete role. It is being used by users. Please reassign users first.',
  ROLE_CREATED_SUCCESSFULLY: 'Role created successfully',
  ROLE_UPDATED_SUCCESSFULLY: 'Role updated successfully',
  ROLE_DELETED_SUCCESSFULLY: 'Role deleted successfully',
};

// Session Messages
export const SESSION_MESSAGES = {
  REFRESH_TOKEN_AND_SESSION_ID_REQUIRED: 'Refresh token and session ID are required',
  INVALID_OR_EXPIRED_SESSION: 'Invalid or expired session',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  USER_NOT_FOUND_OR_INACTIVE: 'User not found or inactive',
  SESSION_NOT_FOUND: 'Session not found',
  SESSION_REVOKED_SUCCESSFULLY: 'Session revoked successfully',
  ALL_SESSIONS_REVOKED_SUCCESSFULLY: 'All sessions revoked successfully',
};

// Payment Messages
export const PAYMENT_MESSAGES = {
  APPOINTMENT_ID_REQUIRED: 'Appointment ID is required',
  AMOUNT_REQUIRED: 'Payment amount is required',
  AMOUNT_MUST_BE_POSITIVE: 'Payment amount must be positive',
  PAYMENT_METHOD_REQUIRED: 'Payment method is required',
  PAYMENT_TYPE_REQUIRED: 'Payment type is required',
  INVALID_PAYMENT_METHOD: 'Invalid payment method',
  INVALID_PAYMENT_TYPE: 'Invalid payment type',
  INVALID_PAYMENT_STATUS: 'Invalid payment status',
  PAYMENT_NOT_FOUND: 'Payment not found',
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  PAYMENT_ALREADY_COMPLETED: 'Payment is already completed',
  CANNOT_REFUND_PENDING_PAYMENT: 'Cannot refund a payment that is not completed',
  CANNOT_REFUND_ALREADY_REFUNDED: 'Payment has already been refunded',
  REFUND_AMOUNT_EXCEEDS_PAYMENT: 'Refund amount cannot exceed payment amount',
  PAYMENT_CREATED_SUCCESSFULLY: 'Payment created successfully',
  PAYMENT_UPDATED_SUCCESSFULLY: 'Payment updated successfully',
  PAYMENT_COMPLETED_SUCCESSFULLY: 'Payment completed successfully',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_CANCELLED_SUCCESSFULLY: 'Payment cancelled successfully',
  REFUND_INITIATED_SUCCESSFULLY: 'Refund initiated successfully',
  REFUND_COMPLETED_SUCCESSFULLY: 'Refund completed successfully',
  PAYMENT_GATEWAY_NOT_CONFIGURED: 'Payment gateway is not configured',
  PAYMENT_GATEWAY_ERROR: 'Payment gateway error occurred',
  INVALID_PAYMENT_GATEWAY: 'Invalid payment gateway',
  WEBHOOK_VERIFICATION_FAILED: 'Webhook verification failed',
  WEBHOOK_PROCESSED_SUCCESSFULLY: 'Webhook processed successfully',
  NOT_AUTHORIZED_TO_VIEW_PAYMENT: 'Not authorized to view this payment',
  NOT_AUTHORIZED_TO_UPDATE_PAYMENT: 'Not authorized to update this payment',
};

// General/Common Messages
export const GENERAL_MESSAGES = {
  SERVER_ERROR: 'Server error',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  ROUTE_NOT_FOUND: 'Route not found',
  SERVER_IS_RUNNING: 'Server is running',
  VALIDATION_FAILED: 'Validation failed',
  FIELD_ALREADY_REGISTERED: (field) => `${field} is already registered`,
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_AVAILABLE: 'Email is available',
  PHONE_REQUIRED: 'Phone number is required',
  PHONE_AVAILABLE: 'Phone number is available',
  LOGGED_OUT_SUCCESSFULLY: 'Logged out successfully',
};

