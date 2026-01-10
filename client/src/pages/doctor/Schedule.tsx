import { useState, useEffect, useRef } from 'react';
import { doctorDashboardService } from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, Trash2, X, Save, AlertCircle, CheckCircle, Ban, CalendarDays, CalendarX } from 'lucide-react';
import { format, isToday, isTomorrow, addDays, getDay, startOfWeek, addDays as addDaysToDate } from 'date-fns';
import DatePickerComponent from '../../components/common/DatePicker';
import { DATE_FORMATS } from '../../constants';

interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
}

interface DayAvailability {
  day: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
}

interface BlockedTimeSlot {
  date: string | Date;
  timeSlot: {
    start: string;
    end: string;
  };
  reason?: string;
  blockedAt?: string | Date;
  _id?: string;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

// Tab configuration - can be extended in the future
const SCHEDULE_TABS = [
  { id: 'availability', label: 'Availability', icon: Calendar },
  { id: 'blocked-dates', label: 'Blocked Dates', icon: AlertCircle },
  { id: 'blocked-slots', label: 'Blocked Time Slots', icon: Ban },
];

export default function Schedule() {
  const [activeTab, setActiveTab] = useState<string>('availability');
  const [weeklySchedule, setWeeklySchedule] = useState<DayAvailability[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState<Set<string>>(new Set());
  const [modifiedDays, setModifiedDays] = useState<Set<string>>(new Set());
  const originalScheduleRef = useRef<DayAvailability[]>([]);
  
  // Form state for blocking dates
  const [blockDateSelected, setBlockDateSelected] = useState<Date | null>(null);
  const [blockingDate, setBlockingDate] = useState(false);
  
  // State for blocking specific date slots
  const [selectedDateForSlot, setSelectedDateForSlot] = useState<Date | null>(null);
  const [blockingSlot, setBlockingSlot] = useState<{ [key: string]: boolean }>({});
  const [unblockingSlot, setUnblockingSlot] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await doctorDashboardService.getSchedule();
      // Server returns { success: true, data: { weeklySchedule: [...], ... } }
      const scheduleData = response.data?.data || response.data;
      
      // Initialize weekly schedule with all days
      const initializedSchedule: DayAvailability[] = DAYS_OF_WEEK.map(day => {
        const existingDay = scheduleData.weeklySchedule?.find(
          (avail: DayAvailability) => avail.day === day.value
        );
        if (existingDay) {
          // Ensure timeSlots array exists and is properly formatted
          return {
            day: day.value,
            timeSlots: existingDay.timeSlots || [],
            isAvailable: existingDay.isAvailable || false
          };
        }
        return {
          day: day.value,
          timeSlots: [],
          isAvailable: false
        };
      });
      
      // Sort slots by start time for each day
      initializedSchedule.forEach(day => {
        if (day.timeSlots.length > 0) {
          day.timeSlots.sort((a, b) => {
            const [aHours, aMins] = a.start.split(':').map(Number);
            const [bHours, bMins] = b.start.split(':').map(Number);
            return (aHours * 60 + aMins) - (bHours * 60 + bMins);
          });
        }
      });
      
      setWeeklySchedule(initializedSchedule);
      // Deep clone for original reference
      originalScheduleRef.current = JSON.parse(JSON.stringify(initializedSchedule));
      setBlockedDates(
        scheduleData.blockedDates?.map((date: string | Date) => {
          return date instanceof Date ? date : new Date(date);
        }) || []
      );
      // Process blocked time slots - handle different date formats
      const blockedSlots = (scheduleData.blockedTimeSlots || []).map((slot: any) => {
        let slotDate: Date;
        if (slot.date instanceof Date) {
          slotDate = slot.date;
        } else if (typeof slot.date === 'string') {
          slotDate = new Date(slot.date);
        } else {
          // Fallback for other formats
          slotDate = new Date(slot.date);
        }
        
        return {
          ...slot,
          date: slotDate,
          timeSlot: slot.timeSlot || { start: '', end: '' },
          reason: slot.reason,
          blockedAt: slot.blockedAt ? (slot.blockedAt instanceof Date ? slot.blockedAt : new Date(slot.blockedAt)) : undefined,
          _id: slot._id
        };
      }).filter((slot: BlockedTimeSlot) => slot.date instanceof Date && !isNaN(slot.date.getTime()));
      
      setBlockedTimeSlots(blockedSlots);
      setModifiedDays(new Set());
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to load schedule');
      // Initialize with empty schedule if fetch fails
      const emptySchedule = DAYS_OF_WEEK.map(day => ({
        day: day.value,
        timeSlots: [],
        isAvailable: false
      }));
      setWeeklySchedule(emptySchedule);
      originalScheduleRef.current = JSON.parse(JSON.stringify(emptySchedule));
      setModifiedDays(new Set());
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get day name from date
  const getDayNameFromDate = (date: Date): string => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getDay()];
  };
  
  // Get available slots for a selected date
  const getAvailableSlotsForDate = (date: Date): TimeSlot[] => {
    if (!date) return [];
    
    const dayName = getDayNameFromDate(date);
    const daySchedule = weeklySchedule.find(day => day.day === dayName);
    
    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.timeSlots.length) {
      return [];
    }
    
    // Check if date is already blocked
    const dateStr = format(date, DATE_FORMATS.API);
    const isDateBlocked = blockedDates.some(blockedDate =>
      format(blockedDate, DATE_FORMATS.API) === dateStr
    );
    
    if (isDateBlocked) return [];
    
    // Get already blocked time slots for this date
    const blockedSlotsForDate = (blockedTimeSlots || []).filter((slot: BlockedTimeSlot) => {
      const slotDateStr = slot.date instanceof Date 
        ? format(slot.date, DATE_FORMATS.API)
        : format(new Date(slot.date), DATE_FORMATS.API);
      return slotDateStr === dateStr;
    });
    
    const blockedSlotStarts = blockedSlotsForDate.map(slot => slot.timeSlot?.start);
    
    // Filter out already blocked slots
    return daySchedule.timeSlots.filter(slot => 
      !blockedSlotStarts.includes(slot.start)
    );
  };
  
  // Check if a slot is already blocked
  const isSlotBlocked = (date: Date, slotStart: string): boolean => {
    if (!date) return false;
    const dateStr = format(date, DATE_FORMATS.API);
    return (blockedTimeSlots || []).some(slot => {
      const slotDateStr = slot.date instanceof Date
        ? format(slot.date, DATE_FORMATS.API)
        : format(new Date(slot.date), DATE_FORMATS.API);
      return slotDateStr === dateStr && slot.timeSlot?.start === slotStart;
    });
  };

  // Check if a slot time has passed for the same day (today)
  const isSlotTimePassed = (date: Date, slotStart: string): boolean => {
    if (!date || !slotStart) return false;
    
    const today = new Date();
    const selectedDate = new Date(date);
    
    // Only check for today's date
    const todayStr = format(today, DATE_FORMATS.API);
    const selectedDateStr = format(selectedDate, DATE_FORMATS.API);
    
    if (todayStr !== selectedDateStr) {
      // Not today, so it's either future or past date
      // If it's a past date, all slots are passed
      // If it's a future date, no slots are passed
      return selectedDate < today;
    }
    
    // It's today - check if the slot time has passed
    const currentTime = today.getHours() * 60 + today.getMinutes(); // Current time in minutes
    const [slotHours, slotMins] = slotStart.split(':').map(Number);
    const slotTime = slotHours * 60 + slotMins; // Slot time in minutes
    
    return slotTime <= currentTime; // Slot time has passed if it's less than or equal to current time
  };
  
  // Block a slot from weekly availability
  const handleBlockSlot = async (date: Date, slot: TimeSlot, reason?: string) => {
    const slotKey = `${format(date, DATE_FORMATS.API)}-${slot.start}`;
    
    // Validate slot is not already blocked
    if (isSlotBlocked(date, slot.start)) {
      toast.error('This slot is already blocked');
      return;
    }
    
    // Validate slot time has not passed for today
    if (isSlotTimePassed(date, slot.start)) {
      toast.error('Cannot block past time slots. Please select a future time slot.', {
        duration: 5000,
      });
      return;
    }
    
    try {
      setBlockingSlot(prev => ({ ...prev, [slotKey]: true }));
      
      const response = await doctorDashboardService.markTimeSlotUnavailable({
        appointmentDate: format(date, DATE_FORMATS.API),
        timeSlot: {
          start: slot.start,
          end: slot.end
        },
        reason: reason || undefined
      });
      
      toast.success(response.data?.message || 'Time slot blocked successfully');
      await fetchSchedule();
    } catch (error: any) {
      // Handle different error scenarios
      if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || 'Invalid request. Cannot block this time slot.', {
          duration: 5000,
        });
      } else if (error.response?.status === 404) {
        toast.error(error.response?.data?.message || 'Doctor profile not found.', {
          duration: 5000,
        });
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later or contact support.', {
          duration: 5000,
        });
      } else if (error.message === 'Network Error') {
        toast.error('Network error. Please check your connection and try again.', {
          duration: 5000,
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to block time slot. Please try again.', {
          duration: 5000,
        });
      }
    } finally {
      setBlockingSlot(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    }
  };

  // Unblock a slot
  const handleUnblockSlot = async (slot: BlockedTimeSlot) => {
    if (!slot.date || !slot.timeSlot || !slot.timeSlot.start || !slot.timeSlot.end) {
      toast.error('Invalid slot data');
      return;
    }

    const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
    const slotKey = `${format(slotDate, DATE_FORMATS.API)}-${slot.timeSlot.start}`;

    try {
      setUnblockingSlot(prev => ({ ...prev, [slotKey]: true }));

      await doctorDashboardService.unblockTimeSlot({
        appointmentDate: format(slotDate, DATE_FORMATS.API),
        timeSlot: {
          start: slot.timeSlot.start,
          end: slot.timeSlot.end
        }
      });

      toast.success('Time slot unblocked successfully');
      await fetchSchedule();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unblock time slot');
      await fetchSchedule();
    } finally {
      setUnblockingSlot(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    }
  };

  const checkIfDayModified = (dayIndex: number) => {
    const currentDay = weeklySchedule[dayIndex];
    const originalDay = originalScheduleRef.current[dayIndex];
    
    if (!originalDay) return false;
    
    // Check if availability changed
    if (currentDay.isAvailable !== originalDay.isAvailable) {
      return true;
    }
    
    // Check if time slots changed
    if (currentDay.timeSlots.length !== originalDay.timeSlots.length) {
      return true;
    }
    
    // Check if any time slot values changed
    for (let i = 0; i < currentDay.timeSlots.length; i++) {
      const currentSlot = currentDay.timeSlots[i];
      const originalSlot = originalDay.timeSlots[i];
      
      if (!originalSlot || 
          currentSlot.start !== originalSlot.start || 
          currentSlot.end !== originalSlot.end) {
        return true;
      }
    }
    
    return false;
  };

  const updateModifiedDays = () => {
    const modified = new Set<string>();
    weeklySchedule.forEach((day, index) => {
      if (checkIfDayModified(index)) {
        modified.add(day.day);
      }
    });
    setModifiedDays(modified);
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if two time slots overlap
  const slotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
    const start1 = timeToMinutes(slot1.start);
    const end1 = timeToMinutes(slot1.end);
    const start2 = timeToMinutes(slot2.start);
    const end2 = timeToMinutes(slot2.end);
    
    // Check if slots overlap (one starts before the other ends)
    return (start1 < end2 && start2 < end1);
  };

  // Validate time slot doesn't overlap with existing slots
  const validateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    newSlot: TimeSlot
  ): string | null => {
    const day = weeklySchedule[dayIndex];
    
    if (!newSlot.start || !newSlot.end) {
      return 'Time slot must have start and end times';
    }
    
    const startTime = timeToMinutes(newSlot.start);
    const endTime = timeToMinutes(newSlot.end);
    
    if (startTime >= endTime) {
      return 'Start time must be before end time';
    }
    
    // Check for overlaps with other slots (excluding the current slot being edited)
    for (let i = 0; i < day.timeSlots.length; i++) {
      if (i === slotIndex) continue; // Skip the slot being edited
      
      const existingSlot = day.timeSlots[i];
      if (slotsOverlap(newSlot, existingSlot)) {
        return `Overlaps with slot (${existingSlot.start} - ${existingSlot.end})`;
      }
    }
    
    return null;
  };

  // Get validation error for a specific slot (for display)
  const getSlotValidationError = (dayIndex: number, slotIndex: number): string | null => {
    const day = weeklySchedule[dayIndex];
    if (slotIndex >= day.timeSlots.length) return null;
    
    const slot = day.timeSlots[slotIndex];
    return validateTimeSlot(dayIndex, slotIndex, slot);
  };

  // Check if a specific slot is saved (matches original)
  const isSlotSaved = (dayIndex: number, slotIndex: number): boolean => {
    const currentDay = weeklySchedule[dayIndex];
    const originalDay = originalScheduleRef.current[dayIndex];
    
    // If no original day or current day is not available, slot is not saved
    if (!originalDay || !currentDay) return false;
    if (!currentDay.isAvailable || !originalDay.isAvailable) return false;
    if (slotIndex >= currentDay.timeSlots.length) return false;
    
    const currentSlot = currentDay.timeSlots[slotIndex];
    
    // If original day has no slots, current slot is not saved
    if (!originalDay.timeSlots || originalDay.timeSlots.length === 0) return false;
    
    // Check if this exact slot exists in the original schedule
    // Match by time values rather than position (in case slots were reordered)
    const matchingOriginalSlot = originalDay.timeSlots.find(
      (originalSlot) =>
        originalSlot &&
        originalSlot.start === currentSlot.start &&
        originalSlot.end === currentSlot.end
    );
    
    return matchingOriginalSlot !== undefined;
  };

  const toggleDayAvailability = (dayIndex: number) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].isAvailable = !updated[dayIndex].isAvailable;
    if (!updated[dayIndex].isAvailable) {
      updated[dayIndex].timeSlots = [];
    }
    setWeeklySchedule(updated);
    setTimeout(updateModifiedDays, 0);
  };

  const addTimeSlot = (dayIndex: number) => {
    const updated = [...weeklySchedule];
    const day = updated[dayIndex];
    
    // Find the next available time slot (after the last slot or default to 09:00)
    let defaultStart = '09:00';
    let defaultEnd = '10:00';
    
    if (day.timeSlots.length > 0) {
      // Sort slots by start time
      const sortedSlots = [...day.timeSlots].sort((a, b) => 
        timeToMinutes(a.start) - timeToMinutes(b.start)
      );
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const lastEnd = timeToMinutes(lastSlot.end);
      
      // Set default start to 1 hour after last slot ends
      const nextStartMinutes = lastEnd;
      const nextStartHours = Math.floor(nextStartMinutes / 60);
      const nextStartMins = nextStartMinutes % 60;
      defaultStart = `${String(nextStartHours).padStart(2, '0')}:${String(nextStartMins).padStart(2, '0')}`;
      
      // Set default end to 1 hour after start
      const nextEndMinutes = nextStartMinutes + 60;
      const nextEndHours = Math.floor(nextEndMinutes / 60);
      const nextEndMins = nextEndMinutes % 60;
      defaultEnd = `${String(nextEndHours).padStart(2, '0')}:${String(nextEndMins).padStart(2, '0')}`;
      
      // If it goes past 23:59, set to a reasonable default
      if (nextEndHours >= 24) {
        defaultStart = '09:00';
        defaultEnd = '10:00';
      }
    }
    
    updated[dayIndex].timeSlots.push({
      start: defaultStart,
      end: defaultEnd,
      isAvailable: true
    });
    
    // Sort slots by start time
    updated[dayIndex].timeSlots.sort((a, b) => 
      timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    
    setWeeklySchedule(updated);
    setTimeout(updateModifiedDays, 0);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].timeSlots.splice(slotIndex, 1);
    setWeeklySchedule(updated);
    setTimeout(updateModifiedDays, 0);
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const updated = [...weeklySchedule];
    const day = updated[dayIndex];
    const slot = { ...day.timeSlots[slotIndex], [field]: value };
    
    // Validate the updated slot
    const validationError = validateTimeSlot(dayIndex, slotIndex, slot);
    if (validationError) {
      toast.error(validationError);
      return; // Don't update if validation fails
    }
    
    updated[dayIndex].timeSlots[slotIndex][field] = value;
    
    // Sort slots by start time after update
    updated[dayIndex].timeSlots.sort((a, b) => 
      timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    
    setWeeklySchedule(updated);
    setTimeout(updateModifiedDays, 0);
  };

  const validateDaySchedule = (day: DayAvailability): string | null => {
    if (day.isAvailable && day.timeSlots.length === 0) {
      return `Please add at least one time slot for ${DAYS_OF_WEEK.find(d => d.value === day.day)?.label}`;
    }
    
    // Validate each slot
    for (let i = 0; i < day.timeSlots.length; i++) {
      const slot = day.timeSlots[i];
      const error = validateTimeSlot(
        weeklySchedule.findIndex(d => d.day === day.day),
        i,
        slot
      );
      if (error) {
        return error;
      }
    }
    
    // Sort slots and check for chronological order
    const sortedSlots = [...day.timeSlots].sort((a, b) => 
      timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    
    // Check if slots are in order (no slot should start before previous ends)
    for (let i = 1; i < sortedSlots.length; i++) {
      const prevEnd = timeToMinutes(sortedSlots[i - 1].end);
      const currStart = timeToMinutes(sortedSlots[i].start);
      
      if (currStart < prevEnd) {
        return 'Time slots must be in chronological order and not overlap';
      }
    }
    
    return null;
  };

  const handleSaveDay = async (dayIndex: number) => {
    const day = weeklySchedule[dayIndex];
    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day);
    
    // Validate the day
    const validationError = validateDaySchedule(day);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingDays(prev => new Set(prev).add(day.day));
      
      // Build the complete schedule array
      // Use current UI state for all days (to preserve any unsaved changes)
      // But we're only marking this day as saved
      const scheduleToSave = weeklySchedule
        .filter(d => d.isAvailable) // Only include days that are available
        .map(d => ({
          day: d.day,
          timeSlots: d.timeSlots.map(slot => ({
            start: slot.start,
            end: slot.end,
            isAvailable: slot.isAvailable !== undefined ? slot.isAvailable : true
          })),
          isAvailable: true // Always true since we filtered
        }));
      
      console.log('Saving complete schedule:', JSON.stringify(scheduleToSave, null, 2));
      console.log('Day being saved:', day);
      
      const response = await doctorDashboardService.updateWeeklySchedule(scheduleToSave);
      console.log('Save response:', response.data);
      
      // Refresh schedule from database to get the saved state
      const refreshResponse = await doctorDashboardService.getSchedule();
      console.log('Refresh response:', refreshResponse.data);
      
      // Server returns { success: true, data: { weeklySchedule: [...], ... } }
      const refreshData = refreshResponse.data?.data || refreshResponse.data;
      console.log('Refresh data:', refreshData);
      console.log('Weekly schedule from refresh:', refreshData.weeklySchedule);
      
      const savedSchedule = refreshData.weeklySchedule || [];
      console.log('Saved schedule:', savedSchedule);
      
      // Update the weekly schedule with saved data
      const updatedSchedule: DayAvailability[] = DAYS_OF_WEEK.map(dayOfWeek => {
        const saved = savedSchedule.find((avail: DayAvailability) => avail.day === dayOfWeek.value);
        if (saved) {
          // Ensure timeSlots array exists and is properly formatted
          const daySchedule = {
            day: dayOfWeek.value,
            timeSlots: saved.timeSlots || [],
            isAvailable: saved.isAvailable || false
          };
          // Sort slots by start time
          if (daySchedule.timeSlots.length > 0) {
            daySchedule.timeSlots.sort((a: TimeSlot, b: TimeSlot) => {
              const [aHours, aMins] = a.start.split(':').map(Number);
              const [bHours, bMins] = b.start.split(':').map(Number);
              return (aHours * 60 + aMins) - (bHours * 60 + bMins);
            });
          }
          return daySchedule;
        }
        return {
          day: dayOfWeek.value,
          timeSlots: [],
          isAvailable: false
        };
      });
      
      setWeeklySchedule(updatedSchedule);
      
      // Update original reference to match saved state (deep clone)
      originalScheduleRef.current = JSON.parse(JSON.stringify(updatedSchedule));
      
      // Remove from modified days
      setModifiedDays(prev => {
        const newSet = new Set(prev);
        newSet.delete(day.day);
        return newSet;
      });
      
      toast.success(`${dayInfo?.label} schedule saved successfully!`);
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || `Failed to save ${dayInfo?.label} schedule`);
    } finally {
      setSavingDays(prev => {
        const newSet = new Set(prev);
        newSet.delete(day.day);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <span className="ml-4 text-gray-600">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
        <p className="text-gray-600">
          Manage your weekly availability, time slots, and blocked dates. Each day can be saved independently.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200">
          <nav className="flex flex-wrap gap-1.5 px-3 sm:px-4 py-1.5" aria-label="Tabs">
            {SCHEDULE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Count badges for each tab
              const getTabCount = () => {
                if (tab.id === 'blocked-dates') return blockedDates.length;
                if (tab.id === 'blocked-slots') return blockedTimeSlots.length;
                if (tab.id === 'availability') {
                  const availableDays = weeklySchedule.filter(day => day.isAvailable).length;
                  return availableDays > 0 ? availableDays : null;
                }
                return null;
              };
              
              const count = getTabCount();
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200
                    transform hover:scale-[1.02] active:scale-[0.98]
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-200/50 border border-primary-400'
                        : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:border-gray-300 shadow-sm'
                    }
                  `}
                >
                  {/* Active indicator line */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary-300 rounded-full"></div>
                  )}
                  
                  {/* Icon with better styling */}
                  <div className={`
                    p-0.5 rounded-md transition-all duration-200
                    ${isActive 
                      ? 'bg-white/20' 
                      : 'bg-gray-100'
                    }
                  `}>
                    <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isActive ? 'scale-105' : ''
                    }`} />
                  </div>
                  
                  {/* Label */}
                  <span className="relative whitespace-nowrap">{tab.label}</span>
                  
                  {/* Count badge */}
                  {count !== null && count > 0 && (
                    <span className={`
                      px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-200 min-w-[18px] text-center
                      ${
                        isActive
                          ? 'bg-white/30 text-white'
                          : 'bg-primary-100 text-primary-700'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                  
                  {/* Active glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-400/15 to-primary-600/15 rounded-lg blur-sm -z-10"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
          {activeTab === 'availability' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-6 h-6 mr-3 text-primary-500" />
                    Weekly Availability
                  </h2>
                  <p className="text-gray-600 text-sm mt-1 ml-9">Set your available days and time slots for the week</p>
                </div>
              </div>
              
              {/* Weekly Schedule */}
              <div className="space-y-4">
          {weeklySchedule.map((day, dayIndex) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day);
            const isModified = modifiedDays.has(day.day);
            const isSaving = savingDays.has(day.day);
            const canSave = day.isAvailable && isModified && !isSaving;
            
            return (
              <div
                key={day.day}
                className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                  day.isAvailable && day.timeSlots.length > 0
                    ? 'border-primary-400 bg-gradient-to-br from-primary-50 via-primary-50 to-white shadow-lg'
                    : day.isAvailable
                    ? 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                } ${isModified ? 'ring-2 ring-yellow-400 ring-opacity-75 shadow-yellow-100' : ''}`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={day.isAvailable}
                        onChange={() => toggleDayAvailability(dayIndex)}
                        className="w-6 h-6 text-primary-500 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer transition-all"
                      />
                    </div>
                    <label className="text-xl font-bold text-gray-900 cursor-pointer flex items-center gap-3">
                      {dayInfo?.label}
                      {day.isAvailable && day.timeSlots.length > 0 && (
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-primary-500 text-white shadow-md">
                          {day.timeSlots.length} slot{day.timeSlots.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {!isModified && day.isAvailable && day.timeSlots.length > 0 && (
                        <div title="Saved">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                      {isModified && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-400 text-yellow-900 animate-pulse shadow-sm">
                          Unsaved Changes
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    {day.isAvailable && (
                      <button
                        onClick={() => addTimeSlot(dayIndex)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Slot</span>
                      </button>
                    )}
                    {canSave && (
                      <button
                        onClick={() => handleSaveDay(dayIndex)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-all shadow-md hover:shadow-lg"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    )}
                    {isSaving && (
                      <div className="flex items-center space-x-2 text-primary-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        <span className="text-sm font-medium">Saving...</span>
                      </div>
                    )}
                  </div>
                </div>

                {day.isAvailable && (
                  <div className="ml-10 space-y-3">
                    {day.timeSlots.length === 0 ? (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm font-medium">
                          No time slots added. Click "Add Slot" to add availability.
                        </p>
                      </div>
                    ) : (
                      day.timeSlots.map((slot, slotIndex) => {
                        // Check if this slot has validation errors
                        const slotError = getSlotValidationError(dayIndex, slotIndex);
                        const isInvalid = slotError !== null;
                        // Check if slot is saved - compare with original schedule
                        const isSaved = isSlotSaved(dayIndex, slotIndex);
                        
                        return (
                          <div
                            key={slotIndex}
                            className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                              isInvalid
                                ? 'bg-red-50 border-red-300 shadow-sm'
                                : isSaved
                                ? 'bg-green-50 border-green-300 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
                            }`}
                          >
                            <Clock className={`w-5 h-5 flex-shrink-0 ${
                              isInvalid 
                                ? 'text-red-500' 
                                : isSaved 
                                ? 'text-green-600' 
                                : 'text-primary-500'
                            }`} />
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="flex items-center space-x-2">
                                <label className="text-xs font-medium text-gray-600">From</label>
                                <div className="flex flex-col">
                                  <input
                                    type="time"
                                    value={slot.start}
                                    onChange={(e) =>
                                      updateTimeSlot(dayIndex, slotIndex, 'start', e.target.value)
                                    }
                                    className={`border-2 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                      isInvalid
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-white'
                                        : isSaved
                                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-white'
                                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-400'
                                    }`}
                                  />
                                  <span className="text-xs text-gray-500 mt-1 text-center">
                                    {format(new Date(`2000-01-01T${slot.start}`), DATE_FORMATS.TIME_12H)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-gray-400 font-medium">→</span>
                              <div className="flex items-center space-x-2">
                                <label className="text-xs font-medium text-gray-600">To</label>
                                <div className="flex flex-col">
                                  <input
                                    type="time"
                                    value={slot.end}
                                    onChange={(e) =>
                                      updateTimeSlot(dayIndex, slotIndex, 'end', e.target.value)
                                    }
                                    className={`border-2 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:outline-none transition-all ${
                                      isInvalid
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-white'
                                        : isSaved
                                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-white'
                                        : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-400'
                                    }`}
                                  />
                                  <span className="text-xs text-gray-500 mt-1 text-center">
                                    {format(new Date(`2000-01-01T${slot.end}`), DATE_FORMATS.TIME_12H)}
                                  </span>
                                </div>
                              </div>
                              {isSaved && (
                                <div className="flex items-center space-x-1 text-green-600 ml-2" title="Saved">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-semibold">Saved</span>
                                </div>
                              )}
                            </div>
                            {isInvalid && (
                              <div className="flex items-center space-x-2 flex-1">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span className="text-xs text-red-600 font-medium">
                                  {slotError}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="ml-auto p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                              disabled={isSaving}
                              title="Remove slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </div>
          )}

          {activeTab === 'blocked-dates' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <AlertCircle className="w-6 h-6 mr-3 text-red-500" />
                    Blocked Dates
                  </h2>
                  <p className="text-gray-600 text-sm mt-1 ml-9">
                    Manage dates when you're unavailable for appointments. Blocked dates will prevent patients from booking appointments on those days.
                  </p>
                </div>
              </div>

              {/* Add Blocked Date */}
              <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-bold text-gray-900 flex items-center">
                    <CalendarDays className="w-6 h-6 mr-2 text-primary-500" />
                    Block a New Date
                  </label>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Entire day unavailable
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      selected={blockDateSelected}
                      onChange={(date) => setBlockDateSelected(date)}
                      placeholderText="Click to select date"
                      dateFormat={DATE_FORMATS.DISPLAY}
                      minDate={new Date()}
                      className="w-full"
                      wrapperClassName="w-full"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!blockDateSelected) {
                        toast.error('Please select a date to block');
                        return;
                      }
                      try {
                        setBlockingDate(true);
                        await doctorDashboardService.blockDates([format(blockDateSelected, DATE_FORMATS.API)]);
                        toast.success('Date blocked successfully');
                        setBlockDateSelected(null);
                        await fetchSchedule();
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || 'Failed to block date');
                      } finally {
                        setBlockingDate(false);
                      }
                    }}
                    disabled={blockingDate || !blockDateSelected}
                    className="inline-flex items-center gap-2 px-6 py-3 mt-7 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
                  >
                    {blockingDate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Blocking...</span>
                      </>
                    ) : (
                      <>
                        <CalendarX className="w-4 h-4" />
                        <span>Block Date</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Blocked Dates List */}
              {blockedDates.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 font-semibold text-lg mb-1">No blocked dates</p>
                  <p className="text-gray-500 text-sm">All dates are available for appointments</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Blocked Dates ({blockedDates.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blockedDates
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((date, index) => {
                        const dateStr = format(date, DATE_FORMATS.API);
                        const todayStr = format(new Date(), DATE_FORMATS.API);
                        const isDateToday = dateStr === todayStr;
                        const isDatePast = date < new Date();
                        const isDateTomorrow = dateStr === format(addDays(new Date(), 1), DATE_FORMATS.API);

                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all group ${
                              isDatePast
                                ? 'bg-gray-100 border-gray-300 opacity-75'
                                : isDateToday
                                ? 'bg-gradient-to-br from-red-100 to-red-200 border-red-400 shadow-md ring-2 ring-red-300'
                                : isDateTomorrow
                                ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 hover:shadow-lg'
                                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:shadow-lg hover:border-red-400'
                            }`}
                          >
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`p-3 rounded-xl shadow-md ${
                                isDatePast 
                                  ? 'bg-gray-400' 
                                  : isDateToday 
                                  ? 'bg-red-600 ring-2 ring-red-400' 
                                  : 'bg-red-500'
                              }`}>
                                <CalendarDays className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className={`font-bold text-base ${isDatePast ? 'text-gray-600' : 'text-gray-900'}`}>
                                  {format(date, DATE_FORMATS.DISPLAY_LONG)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-gray-600 font-medium">{format(date, 'EEEE')}</p>
                                  {isDateToday && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                      Today
                                    </span>
                                  )}
                                  {isDateTomorrow && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full">
                                      Tomorrow
                                    </span>
                                  )}
                                  {isDatePast && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-gray-400 text-white rounded-full">
                                      Past
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await doctorDashboardService.unblockDates([
                                    format(date, DATE_FORMATS.API)
                                  ]);
                                  toast.success('Date unblocked successfully');
                                  await fetchSchedule();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || 'Failed to unblock date');
                                }
                              }}
                              className="p-2.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all group-hover:scale-110 shadow-sm hover:shadow-md"
                              title="Unblock this date"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })
                      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'blocked-slots' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Ban className="w-6 h-6 mr-3 text-red-500" />
                    Blocked Time Slots
                  </h2>
                  <p className="text-gray-600 text-sm mt-1 ml-9">
                    Manage your blocked time slots. You can block or unblock slots at any time. Select a date to block new slots or manage existing blocked slots from the list below.
                  </p>
                </div>
              </div>

              {/* Quick Actions Section */}
              <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-bold text-gray-900 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-primary-500" />
                    Block or Unblock Time Slots
                  </label>
                  {blockedTimeSlots && blockedTimeSlots.length > 0 && (
                    <span className="px-3 py-1 text-sm font-semibold bg-red-100 text-red-700 rounded-full">
                      {blockedTimeSlots.length} Blocked Slot{blockedTimeSlots.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date to Manage Slots <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      selected={selectedDateForSlot}
                      onChange={(date) => setSelectedDateForSlot(date)}
                      placeholderText="Click to select a date"
                      dateFormat={DATE_FORMATS.DISPLAY_FULL}
                      minDate={new Date()}
                      className="w-full"
                      wrapperClassName="w-full"
                    />
                  </div>
                  <div className="flex items-end">
                    {selectedDateForSlot && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200 w-full">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Selected Date:</p>
                        <p className="text-base font-bold text-primary-600">
                          {format(selectedDateForSlot, DATE_FORMATS.DISPLAY_FULL)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{format(selectedDateForSlot, 'EEEE')}</p>
                      </div>
                    )}
                  </div>
                </div>
                {selectedDateForSlot && (
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> All available slots for this date will be shown below. You can block or unblock any slot at any time.
                    </p>
                  </div>
                )}
              </div>

              {/* Blocked Time Slots List - Show prominently at top if there are blocked slots */}
              {blockedTimeSlots && blockedTimeSlots.length > 0 && (
                <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Ban className="w-5 h-5 mr-2 text-red-500" />
                      Currently Blocked Time Slots ({blockedTimeSlots.length})
                    </h3>
                    <span className="px-3 py-1 text-sm font-semibold bg-red-100 text-red-700 rounded-full">
                      {blockedTimeSlots.filter(slot => {
                        if (!slot.date) return false;
                        const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
                        return slotDate >= new Date();
                      }).length} Upcoming
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blockedTimeSlots
                      .sort((a, b) => {
                        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
                        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
                        if (dateA !== dateB) return dateA - dateB;
                        return (a.timeSlot?.start || '').localeCompare(b.timeSlot?.start || '');
                      })
                      .map((slot, index) => {
                        // Ensure date is a proper Date object
                        let slotDate: Date;
                        if (slot.date instanceof Date) {
                          slotDate = slot.date;
                        } else if (typeof slot.date === 'string') {
                          slotDate = new Date(slot.date);
                        } else {
                          slotDate = new Date(slot.date);
                        }
                        
                        // Skip invalid dates
                        if (isNaN(slotDate.getTime())) {
                          console.warn('Invalid date in blocked slot:', slot);
                          return null;
                        }
                        
                        const isPast = slotDate < new Date();
                        const dateStr = format(slotDate, DATE_FORMATS.API);
                        const todayStr = format(new Date(), DATE_FORMATS.API);
                        const isDateToday = dateStr === todayStr;
                        const isDateTomorrow = dateStr === format(addDays(new Date(), 1), DATE_FORMATS.API);
                        
                        // Calculate duration - handle missing timeSlot gracefully
                        if (!slot.timeSlot || !slot.timeSlot.start || !slot.timeSlot.end) {
                          console.warn('Missing timeSlot in blocked slot:', slot);
                          return null;
                        }
                        
                        const [startHours, startMins] = (slot.timeSlot.start || '00:00').split(':').map(Number);
                        const [endHours, endMins] = (slot.timeSlot.end || '00:00').split(':').map(Number);
                        const duration = (endHours * 60 + endMins) - (startHours * 60 + startMins);
                        const durationHours = Math.floor(duration / 60);
                        const durationMins = duration % 60;

                        return (
                          <div
                            key={slot._id || `${slotDate.getTime()}-${slot.timeSlot?.start}-${slot.timeSlot?.end}-${index}`}
                            className={`flex flex-col p-4 rounded-xl border-2 transition-all group hover:scale-[1.02] ${
                              isPast
                                ? 'bg-gray-100 border-gray-300 opacity-75'
                                : isDateToday
                                ? 'bg-gradient-to-br from-red-50 via-red-100 to-red-50 border-red-400 shadow-lg ring-2 ring-red-300'
                                : isDateTomorrow
                                ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 hover:shadow-xl'
                                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:shadow-xl hover:border-red-400'
                            }`}
                          >
                            {/* Header with Date */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-2 flex-1">
                                <div className={`p-2 rounded-lg shadow-sm ${
                                  isPast 
                                    ? 'bg-gray-400' 
                                    : isDateToday 
                                    ? 'bg-red-600 ring-2 ring-red-400' 
                                    : 'bg-red-500'
                                }`}>
                                  <CalendarDays className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-bold text-sm ${isPast ? 'text-gray-600' : 'text-gray-900'} truncate`}>
                                    {format(slotDate, DATE_FORMATS.DISPLAY)}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <p className="text-xs text-gray-600 font-medium">{format(slotDate, 'EEEE')}</p>
                                    {isDateToday && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                        Today
                                      </span>
                                    )}
                                    {isDateTomorrow && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                                        Tomorrow
                                      </span>
                                    )}
                                    {isPast && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-400 text-white rounded-full">
                                        Past
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Time Slot */}
                            <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="p-1.5 bg-primary-100 rounded-lg">
                                    <Clock className="w-4 h-4 text-primary-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-bold text-gray-900">
                                        {format(new Date(`2000-01-01T${slot.timeSlot.start}`), DATE_FORMATS.TIME_12H)}
                                      </span>
                                      <span className="text-gray-400 text-xs">→</span>
                                      <span className="text-sm font-bold text-gray-900">
                                        {format(new Date(`2000-01-01T${slot.timeSlot.end}`), DATE_FORMATS.TIME_12H)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {durationHours > 0 ? `${durationHours}h ${durationMins > 0 ? `${durationMins}m` : ''}` : `${durationMins}m`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Reason */}
                            {slot.reason && (
                              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-700 italic line-clamp-2">
                                    "{slot.reason}"
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Unblock Button */}
                            <button
                              onClick={() => handleUnblockSlot(slot)}
                              disabled={unblockingSlot[`${format(slotDate, DATE_FORMATS.API)}-${slot.timeSlot.start}`] || false}
                              className="w-full py-2 px-3 rounded-lg text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                            >
                              {unblockingSlot[`${format(slotDate, DATE_FORMATS.API)}-${slot.timeSlot.start}`] ? (
                                <>
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                  <span>Unblocking...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Unblock Slot</span>
                                </>
                              )}
                            </button>

                            {/* Footer */}
                            {slot.blockedAt && (
                              <p className="text-xs text-gray-500 mt-2 text-center">
                                Blocked: {format(new Date(slot.blockedAt), 'MMM d, h:mm a')}
                              </p>
                            )}
                          </div>
                        );
                      })
                      .filter((slot): slot is NonNullable<typeof slot> => slot !== null)}
                  </div>
                </div>
              )}

              {/* Available Slots List from Weekly Availability - Only show when date is selected */}
              {selectedDateForSlot && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-green-600" />
                    Manage Slots for {format(selectedDateForSlot, DATE_FORMATS.DISPLAY_FULL)}
                  </h3>
                  
                  {(() => {
                    const dayName = getDayNameFromDate(selectedDateForSlot);
                    const daySchedule = weeklySchedule.find(day => day.day === dayName);
                    const dateStr = format(selectedDateForSlot, DATE_FORMATS.API);
                    const isDateBlocked = blockedDates.some(blockedDate => 
                      format(blockedDate, DATE_FORMATS.API) === dateStr
                    );
                    const availableSlots = getAvailableSlotsForDate(selectedDateForSlot);
                    
                    // Get all slots for this day (both available and blocked)
                    const allDaySlots = daySchedule && daySchedule.isAvailable ? daySchedule.timeSlots : [];
                    const blockedSlotsForDate = (blockedTimeSlots || []).filter(slot => {
                      const slotDateStr = slot.date instanceof Date
                        ? format(slot.date, DATE_FORMATS.API)
                        : format(new Date(slot.date), DATE_FORMATS.API);
                      return slotDateStr === dateStr;
                    });
                    
                    if (isDateBlocked) {
                      return (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                          <p className="text-gray-700 font-semibold">This entire date is already blocked</p>
                          <p className="text-gray-500 text-sm mt-1">You cannot block individual slots when the date is fully blocked</p>
                        </div>
                      );
                    }
                    
                    if (!daySchedule || !daySchedule.isAvailable || allDaySlots.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-700 font-semibold">No availability set for {format(selectedDateForSlot, 'EEEE')}</p>
                          <p className="text-gray-500 text-sm mt-1">Set up your weekly availability first in the Availability tab</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allDaySlots.map((slot, index) => {
                          const slotKey = `${format(selectedDateForSlot, DATE_FORMATS.API)}-${slot.start}`;
                          const isBlocking = blockingSlot[slotKey] || false;
                          
                          // Find the blocked slot for unblocking (match both start and end time)
                          const blockedSlotForDate = blockedSlotsForDate.find(blockedSlot => 
                            blockedSlot.timeSlot?.start === slot.start &&
                            blockedSlot.timeSlot?.end === slot.end
                          );
                          
                          // Check if slot is already blocked
                          const isAlreadyBlocked = !!blockedSlotForDate;
                          
                          // Calculate duration
                          const [startHours, startMins] = slot.start.split(':').map(Number);
                          const [endHours, endMins] = slot.end.split(':').map(Number);
                          const duration = (endHours * 60 + endMins) - (startHours * 60 + startMins);
                          const durationHours = Math.floor(duration / 60);
                          const durationMins = duration % 60;

                          // Check if slot time has passed for today
                          const isSlotPast = isSlotTimePassed(selectedDateForSlot, slot.start);
                          const canBlockSlot = !isAlreadyBlocked && !isSlotPast;

                          return (
                            <div
                              key={`${slot.start}-${slot.end}-${index}`}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                isAlreadyBlocked
                                  ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300 hover:border-orange-400 hover:shadow-md'
                                  : isSlotPast
                                  ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 opacity-75'
                                  : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300 hover:border-green-400 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-2 rounded-lg ${
                                    isAlreadyBlocked 
                                      ? 'bg-orange-100' 
                                      : isSlotPast
                                      ? 'bg-gray-200'
                                      : 'bg-green-100'
                                  }`}>
                                    <Clock className={`w-5 h-5 ${
                                      isAlreadyBlocked 
                                        ? 'text-orange-600' 
                                        : isSlotPast
                                        ? 'text-gray-500'
                                        : 'text-green-600'
                                    }`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-base font-bold ${
                                        isAlreadyBlocked 
                                          ? 'text-orange-900' 
                                          : isSlotPast
                                          ? 'text-gray-600'
                                          : 'text-gray-900'
                                      }`}>
                                        {format(new Date(`2000-01-01T${slot.start}`), DATE_FORMATS.TIME_12H)}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                      <span className={`text-base font-bold ${
                                        isAlreadyBlocked 
                                          ? 'text-orange-900' 
                                          : isSlotPast
                                          ? 'text-gray-600'
                                          : 'text-gray-900'
                                      }`}>
                                        {format(new Date(`2000-01-01T${slot.end}`), DATE_FORMATS.TIME_12H)}
                                      </span>
                                    </div>
                                    {isAlreadyBlocked ? (
                                      <p className="text-xs mt-1 text-orange-600 font-semibold flex items-center gap-1">
                                        <Ban className="w-3 h-3" />
                                        Blocked
                                      </p>
                                    ) : isSlotPast ? (
                                      <p className="text-xs mt-1 text-gray-500 font-semibold flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Past Slot
                                      </p>
                                    ) : (
                                      <p className="text-xs mt-1 text-gray-500">
                                        {durationHours > 0 ? `${durationHours}h ${durationMins > 0 ? `${durationMins}m` : ''}` : `${durationMins}m`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {isAlreadyBlocked ? (
                                <button
                                  onClick={() => blockedSlotForDate && handleUnblockSlot(blockedSlotForDate)}
                                  disabled={unblockingSlot[slotKey] || !blockedSlotForDate}
                                  className="w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {unblockingSlot[slotKey] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Unblocking...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Unblock Slot</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockSlot(selectedDateForSlot, slot)}
                                  disabled={isBlocking || isSlotPast}
                                  className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                                    isBlocking
                                      ? 'bg-yellow-400 text-yellow-900 cursor-wait'
                                      : isSlotPast
                                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-60'
                                      : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg'
                                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                                  title={isSlotPast ? 'Cannot block past time slots. Please select a future time slot.' : 'Block this time slot'}
                                >
                                  {isBlocking ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-900"></div>
                                      <span>Blocking...</span>
                                    </>
                                  ) : isSlotPast ? (
                                    <>
                                      <AlertCircle className="w-4 h-4" />
                                      <span>Past Slot</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="w-4 h-4" />
                                      <span>Block This Slot</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Empty State - Show when no blocked slots and no date selected */}
              {(!blockedTimeSlots || blockedTimeSlots.length === 0) && !selectedDateForSlot && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <Ban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 font-semibold text-lg mb-1">No blocked time slots</p>
                  <p className="text-gray-500 text-sm mb-4">Select a date above to block time slots</p>
                  <button
                    onClick={() => setSelectedDateForSlot(new Date())}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Select Date to Start</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
