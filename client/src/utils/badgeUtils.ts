import { BadgeVariant } from '../components/common/Badge';
import { APPOINTMENT_STATUSES } from '../constants';

/**
 * Maps appointment status to badge variant
 */
export const getAppointmentBadgeVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case APPOINTMENT_STATUSES.PENDING.toLowerCase():
      return 'warning';
    case APPOINTMENT_STATUSES.CONFIRMED.toLowerCase():
      return 'info';
    case APPOINTMENT_STATUSES.COMPLETED.toLowerCase():
      return 'success';
    case APPOINTMENT_STATUSES.CANCELLED.toLowerCase():
      return 'danger';
    default:
      return 'default';
  }
};

/**
 * Maps user status (active/inactive) to badge variant
 */
export const getUserStatusBadgeVariant = (isActive: boolean): BadgeVariant => {
  return isActive ? 'success' : 'danger';
};

/**
 * Maps payment status to badge variant
 */
export const getPaymentStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
};

