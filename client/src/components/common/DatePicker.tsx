import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { THEME_COLORS } from '../../config/theme';
import './DatePicker.css';

interface DatePickerComponentProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  dateFormat?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
  filterDate?: (date: Date) => boolean;
  showTimeSelect?: boolean;
  showTimeSelectOnly?: boolean;
  timeIntervals?: number;
  timeCaption?: string;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  name?: string;
  id?: string;
  required?: boolean;
  selectsStart?: boolean;
  selectsEnd?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  excludeDates?: Date[];
  includeDates?: Date[];
  inline?: boolean;
  withPortal?: boolean;
}

export const DatePickerComponent: React.FC<DatePickerComponentProps> = ({
  selected,
  onChange,
  placeholderText = 'Select date',
  dateFormat = 'MM/dd/yyyy',
  minDate,
  maxDate,
  filterDate,
  showTimeSelect = false,
  showTimeSelectOnly = false,
  timeIntervals = 30,
  timeCaption = 'Time',
  disabled = false,
  className = '',
  wrapperClassName = '',
  name,
  id,
  required = false,
  selectsStart,
  selectsEnd,
  startDate,
  endDate,
  excludeDates,
  includeDates,
  inline = false,
  withPortal = false,
}) => {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      placeholderText={placeholderText}
      dateFormat={showTimeSelect ? `${dateFormat} h:mm aa` : dateFormat}
      minDate={minDate}
      maxDate={maxDate}
      filterDate={filterDate}
      showTimeSelect={showTimeSelect}
      showTimeSelectOnly={showTimeSelectOnly}
      timeIntervals={timeIntervals}
      timeCaption={timeCaption}
      disabled={disabled}
      className={`date-picker-input ${className}`}
      wrapperClassName={`date-picker-wrapper ${wrapperClassName}`}
      name={name}
      id={id}
      required={required}
      selectsStart={selectsStart}
      selectsEnd={selectsEnd}
      startDate={startDate}
      endDate={endDate}
      excludeDates={excludeDates}
      includeDates={includeDates}
      inline={inline}
      withPortal={withPortal}
      calendarClassName="theme-datepicker"
    />
  );
};

export default DatePickerComponent;

