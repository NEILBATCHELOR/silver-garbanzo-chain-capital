/**
 * Calendar Events List Component
 * Displays redemption events in a structured list format
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  Calendar as CalendarIcon,
  Building,
  CheckCircle,
  AlertTriangle,
  CircleDot,
  X
} from 'lucide-react';
import type { RedemptionCalendarEvent } from '../services';

interface CalendarEventsListProps {
  events: RedemptionCalendarEvent[];
  isLoading: boolean;
  compactView?: boolean;
}

export const CalendarEventsList: React.FC<CalendarEventsListProps> = ({
  events,
  isLoading,
  compactView = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-lg mb-2 text-gray-600">No redemption events found</p>
          <p className="text-sm text-gray-500">
            Create redemption windows and rules to see events in the calendar
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group events by month
  const eventsByMonth = events.reduce((acc, event) => {
    const monthKey = event.startDate.toLocaleString('default', { 
      year: 'numeric', 
      month: 'long' 
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, RedemptionCalendarEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(eventsByMonth).map(([month, monthEvents]: [string, RedemptionCalendarEvent[]]) => (
        <div key={month}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {month}
          </h3>
          <div className="space-y-3">
            {monthEvents.map((event: RedemptionCalendarEvent) => (
              <EventCard 
                key={event.id} 
                event={event} 
                compactView={compactView}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Individual Event Card Component
const EventCard: React.FC<{ 
  event: RedemptionCalendarEvent; 
  compactView: boolean;
}> = ({ event, compactView }) => {
  const getStatusIcon = (status: RedemptionCalendarEvent['status']) => {
    switch (status) {
      case 'upcoming':
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: RedemptionCalendarEvent['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-50 border-blue-200';
      case 'active': return 'bg-green-50 border-green-200';
      case 'completed': return 'bg-gray-50 border-gray-200';
      case 'cancelled': return 'bg-red-50 border-red-200';
    }
  };

  const getEventTypeLabel = (eventType: RedemptionCalendarEvent['eventType']) => {
    const labels = {
      submission_open: 'Submissions Open',
      submission_close: 'Submissions Close',
      processing_start: 'Processing Begins',
      processing_end: 'Processing Complete',
      rule_open: 'Redemptions Available',
      lockup_end: 'Lockup Period Ends'
    };
    return labels[eventType] || eventType;
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`transition-all hover:shadow-md ${getStatusColor(event.status)}`}>
      <CardContent className={`${compactView ? 'p-4' : 'p-6'}`}>
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-1">
            {getStatusIcon(event.status)}
          </div>

          {/* Event Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {event.title}
                </h4>
                
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatEventDate(event.startDate)}
                  </span>
                  
                  {event.projectName && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {event.projectName}
                    </span>
                  )}
                </div>

                {!compactView && (
                  <p className="text-sm text-gray-700 mb-3">
                    {event.description}
                  </p>
                )}

                {/* Event Metadata */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getEventTypeLabel(event.eventType)}
                  </Badge>
                  
                  <Badge variant="outline" className="text-xs">
                    {event.source === 'window' ? 'Window' : 'Rule'}
                  </Badge>
                  
                  {event.redemptionType && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {event.redemptionType}
                    </Badge>
                  )}


                </div>
              </div>

              {/* Status Badge */}
              <Badge 
                variant={
                  event.status === 'active' ? 'default' :
                  event.status === 'upcoming' ? 'secondary' :
                  event.status === 'cancelled' ? 'destructive' : 'outline'
                }
                className="flex-shrink-0"
              >
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
