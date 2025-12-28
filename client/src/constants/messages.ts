// Client-side User Messages
// Toast notifications and user-facing messages

export const TOAST_MESSAGES = {
  // Auth Messages
  LOGIN_SUCCESS: 'Login successful!',
  LOGIN_FAILED: 'Login failed',
  REGISTRATION_SUCCESS: 'Registration successful!',
  REGISTRATION_SUCCESS_PENDING: 'Registration successful! Admin will approve your account soon.',
  REGISTRATION_FAILED: 'Registration failed',
  LOGOUT_SUCCESS: 'Logged out successfully',
  
  // Password Messages
  PASSWORD_RESET_LINK_SENT: 'Password reset link has been sent to your email!',
  PASSWORD_RESET_LINK_FAILED: 'Failed to send reset link. Please try again.',
  PASSWORD_CHANGED_SUCCESS: 'Password changed successfully!',
  PASSWORD_RESET_FAILED: 'Failed to reset password. Please try again.',
  
  // Profile Messages
  PROFILE_UPDATED_SUCCESS: 'Profile updated successfully',
  PROFILE_UPDATE_FAILED: 'Failed to update profile',
  
  // Appointment Messages
  APPOINTMENT_BOOKED_SUCCESS: 'Appointment booked successfully!',
  APPOINTMENT_BOOK_FAILED: 'Failed to book appointment',
  APPOINTMENT_CANCELLED_SUCCESS: 'Appointment cancelled successfully',
  APPOINTMENT_CANCEL_FAILED: 'Failed to cancel appointment',
  APPOINTMENT_UPDATED_SUCCESS: 'Appointment updated',
  APPOINTMENT_UPDATE_FAILED: 'Failed to update appointment',
  LOGIN_REQUIRED: 'Please login to book an appointment',
  
  // Doctor Messages
  DOCTOR_APPROVED_SUCCESS: 'Doctor approved successfully',
  DOCTOR_APPROVE_FAILED: 'Failed to approve doctor',
  DOCTOR_REJECTED_SUCCESS: 'Doctor rejected successfully',
  DOCTOR_REJECT_FAILED: 'Failed to reject doctor',
  DOCTOR_SUSPENDED_SUCCESS: 'Doctor suspended successfully',
  DOCTOR_SUSPEND_FAILED: 'Failed to suspend doctor',
  DOCTOR_ACTIVATED_SUCCESS: 'Doctor activated successfully',
  DOCTOR_ACTIVATE_FAILED: 'Failed to activate doctor',
  DOCTOR_DELETED_SUCCESS: 'Doctor deleted successfully',
  DOCTOR_DELETE_FAILED: 'Failed to delete doctor',
  
  // Patient Messages
  PATIENT_SUSPENDED_SUCCESS: 'Patient suspended successfully',
  PATIENT_SUSPEND_FAILED: 'Failed to suspend patient',
  PATIENT_ACTIVATED_SUCCESS: 'Patient activated successfully',
  PATIENT_ACTIVATE_FAILED: 'Failed to activate patient',
  PATIENT_DELETED_SUCCESS: 'Patient deleted successfully',
  PATIENT_DELETE_FAILED: 'Failed to delete patient',
  
  // Favorite Doctors
  ADDED_TO_FAVORITES: 'Added to favorites',
  ADD_TO_FAVORITES_FAILED: 'Failed to add to favorites',
  REMOVED_FROM_FAVORITES: 'Removed from favorites',
  REMOVE_FROM_FAVORITES_FAILED: 'Failed to remove from favorites',
  
  // Schedule Messages
  SCHEDULE_UPDATED_SUCCESS: 'Schedule updated successfully',
  SCHEDULE_UPDATE_FAILED: 'Failed to update schedule',
  
  // Contact Messages
  MESSAGE_SENT_SUCCESS: 'Message sent successfully!',
  MESSAGE_SEND_FAILED: 'Failed to send message. Please try again.',
  
  // Export Messages
  EXPORT_GENERATED_SUCCESS: 'Export generated successfully',
  PDF_EXPORT_GENERATED_SUCCESS: 'PDF export generated successfully',
  
  // Loading/Error Messages
  LOADING_DOCTORS_FAILED: 'Failed to load doctors',
  LOADING_DOCTOR_DETAILS_FAILED: 'Failed to load doctor details',
  LOADING_DOCTOR_PROFILE_FAILED: 'Failed to load doctor profile',
  LOADING_APPOINTMENTS_FAILED: 'Failed to load appointments',
  LOADING_PATIENTS_FAILED: 'Failed to load patients',
  LOADING_PATIENT_DETAILS_FAILED: 'Failed to load patient details',
  LOADING_REPORTS_FAILED: 'Failed to load reports',
  
  // Settings Messages
  SETTINGS_SAVED_SUCCESS: 'Settings saved successfully',
  SETTINGS_SAVE_FAILED: 'Failed to save settings',
  
  // Feature Coming Soon
  FEATURE_COMING_SOON: 'Feature coming soon',
  NOTIFICATION_FEATURE_COMING_SOON: 'Notification feature coming soon',
  SYSTEM_LOGS_FEATURE_COMING_SOON: 'System logs feature coming soon',
} as const;

// Generic Error Messages
export const ERROR_MESSAGES = {
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  OPERATION_SUCCESS: 'Operation completed successfully',
  DATA_SAVED: 'Data saved successfully',
  DATA_UPDATED: 'Data updated successfully',
  DATA_DELETED: 'Data deleted successfully',
} as const;

