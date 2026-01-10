import { BadgeVariant } from '../components/common/Badge';
import { APPOINTMENT_STATUSES } from '../constants';

/**
 * Converts status string to title case
 */
export const toTitleCase = (status: string): string => {
  if (!status) return '';
  
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Maps appointment status to badge variant with distinct colors for each status
 */
export const getAppointmentBadgeVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case APPOINTMENT_STATUSES.PENDING.toLowerCase():
      return 'warning'; // Amber/Yellow - waiting for confirmation
    case APPOINTMENT_STATUSES.CONFIRMED.toLowerCase():
      return 'info'; // Blue - confirmed and ready
    case APPOINTMENT_STATUSES.RESCHEDULE_REQUESTED.toLowerCase():
      return 'orange'; // Orange - needs attention/rescheduling
    case APPOINTMENT_STATUSES.RESCHEDULED_BY_ADMIN.toLowerCase():
      return 'purple'; // Purple - rescheduled by admin
    case APPOINTMENT_STATUSES.COMPLETED.toLowerCase():
      return 'success'; // Green - successfully completed
    case APPOINTMENT_STATUSES.CANCELLED.toLowerCase():
      return 'danger'; // Red - cancelled
    default:
      return 'default'; // Gray - unknown/default
  }
};

/**
 * Maps user status (active/inactive) to badge variant
 */
export const getUserStatusBadgeVariant = (isActive: boolean): BadgeVariant => {
  return isActive ? 'success' : 'danger';
};

/**
 * Maps payment status to badge variant with distinct colors
 */
export const getPaymentStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
      return 'success'; // Green - payment successful
    case 'pending':
      return 'warning'; // Amber - waiting for payment
    case 'refunded':
      return 'purple'; // Purple - refunded
    case 'failed':
    case 'cancelled':
      return 'danger'; // Red - payment failed/cancelled
    default:
      return 'default'; // Gray - unknown/default
  }
};

