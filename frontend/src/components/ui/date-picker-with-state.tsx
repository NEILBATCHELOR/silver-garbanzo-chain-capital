import React from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/utils';

export interface DatePickerWithStateProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Wrapper component for DatePicker that handles state management
 * This component fixes TypeScript errors with passing setDate prop to DatePicker
 */
export const DatePickerWithState: React.FC<DatePickerWithStateProps> = ({
  date,
  setDate,
  className,
  placeholder = "Select date"
}) => {
  return (
    <div className={cn("", className)}>
      <DatePicker
        date={date}
        onSelect={setDate}
        placeholder={placeholder}
      />
    </div>
  );
};

export default DatePickerWithState;
