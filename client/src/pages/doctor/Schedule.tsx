import { useState, useEffect, useRef } from 'react';
import { doctorDashboardService } from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, Trash2, X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

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

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export default function Schedule() {
  const [weeklySchedule, setWeeklySchedule] = useState<DayAvailability[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState<Set<string>>(new Set());
  const [modifiedDays, setModifiedDays] = useState<Set<string>>(new Set());
  const originalScheduleRef = useRef<DayAvailability[]>([]);

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
        <h1 className="text-3xl font-bold mb-2">Schedule Management</h1>
        <p className="text-gray-600">
          Manage your weekly availability and time slots. Each day can be saved independently.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Weekly Availability
        </h2>
        
        <div className="space-y-4">
          {weeklySchedule.map((day, dayIndex) => {
            const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day);
            const isModified = modifiedDays.has(day.day);
            const isSaving = savingDays.has(day.day);
            const canSave = day.isAvailable && isModified && !isSaving;
            
            return (
              <div
                key={day.day}
                className={`border rounded-lg p-4 transition-colors ${
                  day.isAvailable && day.timeSlots.length > 0
                    ? 'border-primary-300 bg-primary-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={() => toggleDayAvailability(dayIndex)}
                      className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                    />
                    <label className="text-lg font-semibold cursor-pointer">
                      {dayInfo?.label}
                    </label>
                    {day.isAvailable && day.timeSlots.length > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700">
                        {day.timeSlots.length} slot{day.timeSlots.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!isModified && day.isAvailable && day.timeSlots.length > 0 && (
                      <div title="Saved">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {day.isAvailable && (
                      <button
                        onClick={() => addTimeSlot(dayIndex)}
                        className="btn-secondary flex items-center space-x-1 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Slot</span>
                      </button>
                    )}
                    {canSave && (
                      <button
                        onClick={() => handleSaveDay(dayIndex)}
                        className="btn-primary flex items-center space-x-1 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    )}
                    {isSaving && (
                      <div className="flex items-center space-x-2 text-primary-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                  </div>
                </div>

                {day.isAvailable && (
                  <div className="ml-8 space-y-2">
                    {day.timeSlots.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No time slots added. Click "Add Slot" to add availability.
                      </p>
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
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${
                              isInvalid
                                ? 'bg-red-50 border-red-300'
                                : isSaved
                                ? 'bg-green-50 border-green-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <Clock className={`w-4 h-4 ${
                              isInvalid 
                                ? 'text-red-500' 
                                : isSaved 
                                ? 'text-green-600' 
                                : 'text-gray-500'
                            }`} />
                            <div className="flex items-center space-x-2 flex-1">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  updateTimeSlot(dayIndex, slotIndex, 'start', e.target.value)
                                }
                                className={`border rounded px-3 py-2 text-sm focus:ring-2 ${
                                  isInvalid
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : isSaved
                                    ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                    : 'focus:ring-primary-500 focus:border-primary-500'
                                }`}
                              />
                              <span className="text-gray-500">to</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  updateTimeSlot(dayIndex, slotIndex, 'end', e.target.value)
                                }
                                className={`border rounded px-3 py-2 text-sm focus:ring-2 ${
                                  isInvalid
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : isSaved
                                    ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                    : 'focus:ring-primary-500 focus:border-primary-500'
                                }`}
                              />
                              {isSaved && (
                                <div className="flex items-center space-x-1 text-green-600" title="Saved">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Saved</span>
                                </div>
                              )}
                            </div>
                            {isInvalid && (
                              <span className="text-xs text-red-600 flex-1">
                                {slotError}
                              </span>
                            )}
                            <button
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="ml-auto text-red-500 hover:text-red-700 p-1"
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

      {/* Blocked Dates Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          Blocked Dates
        </h2>
        {blockedDates.length === 0 ? (
          <p className="text-gray-500">No blocked dates</p>
        ) : (
          <div className="space-y-2">
            {blockedDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span>{format(date, 'MMMM d, yyyy')}</span>
                <button
                  onClick={async () => {
                    try {
                      await doctorDashboardService.unblockDates([
                        format(date, 'yyyy-MM-dd')
                      ]);
                      toast.success('Date unblocked');
                      fetchSchedule();
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Failed to unblock date');
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
        </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
