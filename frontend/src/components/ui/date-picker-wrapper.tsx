import * as React from "react";
import { DateRange } from "react-day-picker";
import { DatePicker, DatePickerWithRange } from "./date-picker";

interface DatePickerWrapperProps {
  date: Date;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerWrapper({
  date,
  setDate,
  className,
  placeholder,
}: DatePickerWrapperProps) {
  return (
    <DatePicker
      date={date}
      onSelect={setDate}
      className={className}
      placeholder={placeholder}
    />
  );
}

interface DatePickerWithRangeWrapperProps {
  date: DateRange;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerWithRangeWrapper({
  date,
  setDate,
  className,
  placeholder,
}: DatePickerWithRangeWrapperProps) {
  return (
    <DatePickerWithRange
      date={date}
      onDateChange={setDate}
      className={className}
      placeholder={placeholder}
    />
  );
}
