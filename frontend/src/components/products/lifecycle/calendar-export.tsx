import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ArrowDown, Download } from 'lucide-react';
import { ProductLifecycleEvent } from '@/types/products';
import { 
  lifecycleNotificationService, 
  CalendarEvent 
} from '@/services/products/lifecycleNotificationService';
import { format, addHours } from 'date-fns';

interface CalendarExportProps {
  event: ProductLifecycleEvent;
  onExport: (calendarEvent: CalendarEvent, calendarType: string) => Promise<boolean>;
  className?: string;
}

/**
 * Component for exporting lifecycle events to calendar applications
 */
const CalendarExport: React.FC<CalendarExportProps> = ({
  event,
  onExport,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [calendarType, setCalendarType] = useState<string>('google');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Initialize calendar event from lifecycle event
  const defaultCalendarEvent = lifecycleNotificationService.createCalendarEvent(event);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent>(defaultCalendarEvent);
  
  // Date state for popover calendars
  const [startDate, setStartDate] = useState<Date>(new Date(defaultCalendarEvent.start.dateTime));
  const [endDate, setEndDate] = useState<Date>(new Date(defaultCalendarEvent.end.dateTime));
  
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // Keep the same time
    const newDate = new Date(date);
    const currentStart = new Date(calendarEvent.start.dateTime);
    newDate.setHours(currentStart.getHours());
    newDate.setMinutes(currentStart.getMinutes());
    
    setStartDate(newDate);
    setCalendarEvent({
      ...calendarEvent,
      start: {
        ...calendarEvent.start,
        dateTime: newDate.toISOString()
      }
    });
    
    // Ensure end date is after start date
    const currentEnd = new Date(calendarEvent.end.dateTime);
    if (currentEnd <= newDate) {
      const newEndDate = addHours(newDate, 1);
      setEndDate(newEndDate);
      setCalendarEvent({
        ...calendarEvent,
        start: {
          ...calendarEvent.start,
          dateTime: newDate.toISOString()
        },
        end: {
          ...calendarEvent.end,
          dateTime: newEndDate.toISOString()
        }
      });
    }
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // Keep the same time
    const newDate = new Date(date);
    const currentEnd = new Date(calendarEvent.end.dateTime);
    newDate.setHours(currentEnd.getHours());
    newDate.setMinutes(currentEnd.getMinutes());
    
    setEndDate(newDate);
    setCalendarEvent({
      ...calendarEvent,
      end: {
        ...calendarEvent.end,
        dateTime: newDate.toISOString()
      }
    });
  };
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    const [hours, minutes] = timeString.split(':').map(Number);
    
    const newDate = new Date(startDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    
    setStartDate(newDate);
    setCalendarEvent({
      ...calendarEvent,
      start: {
        ...calendarEvent.start,
        dateTime: newDate.toISOString()
      }
    });
    
    // Ensure end date is after start date
    const currentEnd = new Date(calendarEvent.end.dateTime);
    if (currentEnd <= newDate) {
      const newEndDate = addHours(newDate, 1);
      setEndDate(newEndDate);
      setCalendarEvent({
        ...calendarEvent,
        start: {
          ...calendarEvent.start,
          dateTime: newDate.toISOString()
        },
        end: {
          ...calendarEvent.end,
          dateTime: newEndDate.toISOString()
        }
      });
    }
  };
  
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    const [hours, minutes] = timeString.split(':').map(Number);
    
    const newDate = new Date(endDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    
    setEndDate(newDate);
    setCalendarEvent({
      ...calendarEvent,
      end: {
        ...calendarEvent.end,
        dateTime: newDate.toISOString()
      }
    });
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    const success = await onExport(calendarEvent, calendarType);
    setIsExporting(false);
    
    if (success) {
      setIsOpen(false);
    }
  };
  
  const formatTimeForInput = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Add to Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export to Calendar</DialogTitle>
          <DialogDescription>
            Configure the event details to add to your calendar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Calendar Type</Label>
            <Select value={calendarType} onValueChange={setCalendarType}>
              <SelectTrigger>
                <SelectValue placeholder="Select calendar type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Calendar</SelectItem>
                <SelectItem value="outlook">Outlook Calendar</SelectItem>
                <SelectItem value="apple">Apple Calendar</SelectItem>
                <SelectItem value="ical">iCalendar (.ics file)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input 
              value={calendarEvent.summary}
              onChange={(e) => setCalendarEvent({
                ...calendarEvent,
                summary: e.target.value
              })}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={calendarEvent.description}
              onChange={(e) => setCalendarEvent({
                ...calendarEvent,
                description: e.target.value
              })}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Location</Label>
            <Input 
              value={calendarEvent.location}
              onChange={(e) => setCalendarEvent({
                ...calendarEvent,
                location: e.target.value
              })}
              placeholder="Optional"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={formatTimeForInput(startDate)}
                  onChange={handleStartTimeChange}
                  className="w-24"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(endDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={formatTimeForInput(endDate)}
                  onChange={handleEndTimeChange}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Reminders</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select 
                  value={calendarEvent.reminders.overrides[0].minutes.toString()}
                  onValueChange={(value) => {
                    const overrides = [...calendarEvent.reminders.overrides];
                    overrides[0] = { ...overrides[0], minutes: parseInt(value) };
                    setCalendarEvent({
                      ...calendarEvent,
                      reminders: {
                        ...calendarEvent.reminders,
                        overrides
                      }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="120">2 hours before</SelectItem>
                    <SelectItem value="1440">1 day before</SelectItem>
                    <SelectItem value="10080">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select 
                  value={calendarEvent.reminders.overrides[0].method}
                  onValueChange={(value: 'email' | 'popup') => {
                    const overrides = [...calendarEvent.reminders.overrides];
                    overrides[0] = { ...overrides[0], method: value };
                    setCalendarEvent({
                      ...calendarEvent,
                      reminders: {
                        ...calendarEvent.reminders,
                        overrides
                      }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reminder method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {calendarEvent.reminders.overrides.length > 1 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <Select 
                    value={calendarEvent.reminders.overrides[1].minutes.toString()}
                    onValueChange={(value) => {
                      const overrides = [...calendarEvent.reminders.overrides];
                      overrides[1] = { ...overrides[1], minutes: parseInt(value) };
                      setCalendarEvent({
                        ...calendarEvent,
                        reminders: {
                          ...calendarEvent.reminders,
                          overrides
                        }
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reminder time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                      <SelectItem value="10080">1 week before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select 
                    value={calendarEvent.reminders.overrides[1].method}
                    onValueChange={(value: 'email' | 'popup') => {
                      const overrides = [...calendarEvent.reminders.overrides];
                      overrides[1] = { ...overrides[1], method: value };
                      setCalendarEvent({
                        ...calendarEvent,
                        reminders: {
                          ...calendarEvent.reminders,
                          overrides
                        }
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reminder method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export to {calendarType === 'ical' ? 'iCalendar' : `${calendarType.charAt(0).toUpperCase()}${calendarType.slice(1)} Calendar`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarExport;