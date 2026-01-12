/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Normalizes a date to start of day (00:00:00.000)
 * Creates a new Date object to avoid mutation
 * @param {Date|string} date - Date to normalize
 * @returns {Date} - New Date object normalized to start of day
 */
export const normalizeDate = (date) => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
};

/**
 * Checks if two dates are the same day (ignoring time)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} - True if dates are the same day
 */
export const isSameDay = (date1, date2) => {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  return normalized1.getTime() === normalized2.getTime();
};

/**
 * Gets date range for a period (today, week, month)
 * @returns {Object} - Object with todayStart, todayEnd, weekStart, monthStart
 */
export const getDateRanges = () => {
  const now = new Date();
  const todayStart = normalizeDate(now);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const normalizedWeekStart = normalizeDate(weekStart);
  
  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 1);
  const normalizedMonthStart = normalizeDate(monthStart);
  
  return { todayStart, todayEnd, weekStart: normalizedWeekStart, monthStart: normalizedMonthStart, now };
};

/**
 * Checks if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is today
 */
export const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Checks if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export const isPastDate = (date) => {
  const normalizedDate = normalizeDate(date);
  const today = normalizeDate(new Date());
  return normalizedDate.getTime() < today.getTime();
};

/**
 * Creates a new Date object for appointment date queries
 * Prevents mutation of the original date
 * @param {Date|string} appointmentDate - Original appointment date
 * @param {Date|string} timeSlot - Time slot (HH:MM format)
 * @returns {Object} - Object with appointmentDateStart and appointmentDateEnd
 */
export const createAppointmentDateRange = (appointmentDate, timeSlot) => {
  const appointmentDateStart = new Date(appointmentDate);
  appointmentDateStart.setHours(0, 0, 0, 0);
  
  if (timeSlot && timeSlot.start) {
    const [hours, minutes] = timeSlot.start.split(':').map(Number);
    appointmentDateStart.setHours(hours, minutes, 0, 0);
  }
  
  const appointmentDateEnd = new Date(appointmentDateStart);
  if (timeSlot && timeSlot.end) {
    const [hours, minutes] = timeSlot.end.split(':').map(Number);
    appointmentDateEnd.setHours(hours, minutes, 0, 0);
  } else {
    appointmentDateEnd.setHours(23, 59, 59, 999);
  }
  
  return { appointmentDateStart, appointmentDateEnd };
};
