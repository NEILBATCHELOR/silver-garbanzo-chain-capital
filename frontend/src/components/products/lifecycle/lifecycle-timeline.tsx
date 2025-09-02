import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, FileText, AlertCircle, CheckCircle, XCircle, Loader2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DatePickerWrapper } from '@/components/ui/date-picker-wrapper';
import { Filter } from 'lucide-react';

interface FilterOptions {
  eventTypes?: LifecycleEventType[];
  startDate?: Date;
  endDate?: Date;
  status?: EventStatus[];
}

interface LifecycleTimelineProps {
  events: ProductLifecycleEvent[];
  onEventClick?: (event: ProductLifecycleEvent) => void;
  onStatusChange?: (eventId: string, newStatus: EventStatus) => Promise<void>;
  onDelete?: (eventId: string) => void;
  className?: string;
}

/**
 * Timeline component for displaying product lifecycle events
 */
const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({ 
  events,
  onEventClick,
  onStatusChange,
  onDelete,
  className 
}) => {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [filteredEvents, setFilteredEvents] = useState<ProductLifecycleEvent[]>(events);

  // Filter function
  const filterEvents = (events: ProductLifecycleEvent[], filters: FilterOptions) => {
    return events.filter(event => {
      // Filter by event type
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.eventType)) return false;
      }
      
      // Filter by date range
      if (filters.startDate && event.eventDate < filters.startDate) return false;
      if (filters.endDate && event.eventDate > filters.endDate) return false;
      
      // Filter by status
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(event.status)) return false;
      }
      
      return true;
    });
  };

  // Update filtered events when events or filters change
  useEffect(() => {
    setFilteredEvents(filterEvents(events, filters));
  }, [events, filters]);
  // Sort events by date (newest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  // Get event type display name
  const getEventTypeDisplay = (type: LifecycleEventType): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get status color based on event status
  const getStatusColor = (status: EventStatus): string => {
    switch (status) {
      case EventStatus.SUCCESS:
        return 'bg-green-500';
      case EventStatus.PENDING:
        return 'bg-amber-500';
      case EventStatus.PROCESSING:
        return 'bg-blue-500';
      case EventStatus.FAILED:
        return 'bg-red-500';
      case EventStatus.CANCELLED:
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Get status icon based on event status
  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case EventStatus.SUCCESS:
        return <CheckCircle className="w-4 h-4" />;
      case EventStatus.PENDING:
        return <AlertCircle className="w-4 h-4" />;
      case EventStatus.PROCESSING:
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case EventStatus.FAILED:
        return <XCircle className="w-4 h-4" />;
      case EventStatus.CANCELLED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Group events by date
  const eventsByDate: Record<string, ProductLifecycleEvent[]> = {};
  sortedEvents.forEach(event => {
    const dateKey = format(event.eventDate, 'yyyy-MM-dd');
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Product Lifecycle Timeline</CardTitle>
          <div className="flex space-x-2">
            <FilterControls filters={filters} setFilters={setFilters} eventTypes={Object.values(LifecycleEventType)} statuses={Object.values(EventStatus)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(eventsByDate).length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No lifecycle events recorded yet.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(eventsByDate).map(([dateKey, dateEvents], dateIndex) => (
              <div key={dateKey} className="relative">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  <h3 className="font-medium">{format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}</h3>
                </div>
                
                <div className="ml-2.5 border-l-2 border-dashed border-gray-200 pl-6 space-y-6">
                  {dateEvents.map((event, eventIndex) => (
                    <div 
                      key={event.id}
                      className={`relative ${onEventClick ? 'cursor-pointer hover:bg-gray-50 rounded-md transition-colors' : ''}`}
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      {/* Timeline marker position (no dot) */}
                      <div className="absolute -left-9 top-1.5"></div>
                      
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{getEventTypeDisplay(event.eventType)}</span>
                          <span className="text-sm text-muted-foreground ml-3">
                            {format(event.eventDate, 'h:mm a')}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {onStatusChange && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const dropdown = document.getElementById(`timeline-status-dropdown-${event.id}`);
                                if (dropdown) dropdown.classList.toggle('hidden');
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Change Status"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(event.id);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(event.status)} text-white`}
                          >
                            <span className="flex items-center">
                              {getStatusIcon(event.status)}
                              <span className="ml-1">{event.status}</span>
                            </span>
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Hidden dropdown for status change */}
                      {onStatusChange && (
                        <div 
                          id={`timeline-status-dropdown-${event.id}`} 
                          className="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-1">
                            {Object.values(EventStatus).map((status) => (
                              <button
                                key={status}
                                disabled={event.status === status}
                                className={`block w-full text-left px-4 py-2 text-sm ${event.status === status ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (onStatusChange) {
                                    await onStatusChange(event.id, status);
                                    const dropdown = document.getElementById(`timeline-status-dropdown-${event.id}`);
                                    if (dropdown) dropdown.classList.add('hidden');
                                  }
                                }}
                              >
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                                  {status}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {event.quantity !== undefined && event.quantity !== null && (
                        <div className="text-sm mb-1">
                          <span className="text-muted-foreground">Quantity:</span> {event.quantity.toLocaleString()}
                        </div>
                      )}
                      
                      {event.actor && (
                        <div className="text-sm mb-1">
                          <span className="text-muted-foreground">Actor:</span> {event.actor}
                        </div>
                      )}
                      
                      {event.details && (
                        <div className="text-sm text-muted-foreground mt-1 italic">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {event.details}
                        </div>
                      )}
                      
                      {event.transactionHash && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  Tx: {event.transactionHash.substring(0, 8)}...{event.transactionHash.substring(event.transactionHash.length - 8)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{event.transactionHash}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Filter controls component
interface FilterControlsProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  eventTypes: LifecycleEventType[];
  statuses: EventStatus[];
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, setFilters, eventTypes, statuses }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Event Types</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {eventTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filters.eventTypes?.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          eventTypes: [...(prev.eventTypes || []), type]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          eventTypes: prev.eventTypes?.filter(t => t !== type)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                    {type.split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Status</h4>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status?.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          status: [...(prev.status || []), status]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status?.filter(s => s !== status)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Date Range</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                  <DatePickerWrapper
                    date={filters.startDate || new Date()}
                    setDate={(date) => setFilters(prev => ({ ...prev, startDate: date || undefined }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm">End Date</Label>
                  <DatePickerWrapper
                    date={filters.endDate || new Date()}
                    setDate={(date) => setFilters(prev => ({ ...prev, endDate: date || undefined }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})}
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={() => document.dispatchEvent(new Event('click'))}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LifecycleTimeline;
