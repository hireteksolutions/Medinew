# Schedule Management System - Low Level Design (LLD)

## Overview
Comprehensive schedule management system for doctors that handles both recurring weekly schedules and date-specific overrides.

## Architecture

### Two-Tier Schedule System

1. **Recurring Weekly Schedule** (Doctor.availability)
   - Base schedule that repeats every week
   - Stored in Doctor model
   - Format: Array of day-based availability
   - Example: Monday 9 AM - 5 PM, Tuesday 10 AM - 6 PM

2. **Date-Specific Overrides** (AvailabilitySchedule)
   - Overrides for specific dates
   - Takes precedence over weekly schedule
   - Can block dates or modify time slots
   - Stored in separate collection

### Data Models

#### Doctor.availability Schema
```javascript
{
  day: 'monday' | 'tuesday' | ... | 'sunday',
  timeSlots: [
    {
      start: 'HH:MM',
      end: 'HH:MM',
      isAvailable: boolean
    }
  ],
  isAvailable: boolean
}
```

#### AvailabilitySchedule Schema
```javascript
{
  doctorId: ObjectId,
  date: Date,
  dayOfWeek: string,
  timeSlots: [TimeSlot],
  isAvailable: boolean,
  isBlocked: boolean,
  reason: string
}
```

## API Endpoints

### 1. Get Schedule
- **GET** `/api/doctor/schedule`
- Returns: Weekly schedule + upcoming date-specific overrides

### 2. Update Weekly Schedule
- **PUT** `/api/doctor/schedule/weekly`
- Body: `{ availability: [...] }`
- Updates recurring weekly schedule

### 3. Get Date-Specific Schedules
- **GET** `/api/doctor/schedule/dates?startDate=&endDate=`
- Returns: Date-specific schedules in range

### 4. Create/Update Date-Specific Schedule
- **POST** `/api/doctor/schedule/dates`
- **PUT** `/api/doctor/schedule/dates/:id`
- Body: `{ date, timeSlots, isAvailable, isBlocked, reason }`

### 5. Block Dates
- **POST** `/api/doctor/schedule/block-dates`
- Body: `{ dates: [...], reason: string }`

### 6. Unblock Dates
- **DELETE** `/api/doctor/schedule/block-dates`
- Body: `{ dates: [...] }`

### 7. Bulk Update Schedules
- **POST** `/api/doctor/schedule/bulk`
- Body: `{ schedules: [...] }`

## Business Logic

### Schedule Resolution Priority
1. Check AvailabilitySchedule for specific date
2. If not found, use Doctor.availability for day of week
3. Check blockedDates in Doctor model
4. Return available slots

### Validation Rules
- Time slots must be valid (start < end)
- No overlapping time slots
- Date must be in future (for blocking)
- Cannot block dates with existing appointments
- Time slots must be within valid hours (e.g., 6 AM - 11 PM)

### Conflict Detection
- Check existing appointments before blocking
- Warn if blocking dates with pending appointments
- Validate time slot availability before update

## Implementation Plan

1. Create comprehensive schedule controller
2. Add validation middleware
3. Implement conflict checking
4. Add helper functions for schedule resolution
5. Update client-side API service
6. Create frontend UI components

