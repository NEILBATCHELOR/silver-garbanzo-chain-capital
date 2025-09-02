import React, { useState, useEffect } from 'react';
import { X, Bell, CalendarDays, AlertTriangle, Info, Mail } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProductLifecycleEvent } from '@/types/products';
import { NotificationSettings, NotificationChannel } from '@/types/notifications';
import { notificationSettingsService } from '@/services/products/notificationSettingsService';
import { lifecycleNotificationService } from '@/services/products/lifecycleNotificationService';
import { format, differenceInCalendarDays } from 'date-fns';

interface LifecycleNotificationsProps {
  events: ProductLifecycleEvent[];
  notificationSettings?: NotificationSettings;
  onDismiss?: (eventId: string) => void;
  onDismissAll?: () => void;
  onExportToCalendar?: (event: ProductLifecycleEvent) => void;
  onSendEmail?: (event: ProductLifecycleEvent) => void;
  className?: string;
}

/**
 * Component for displaying in-app notifications for upcoming lifecycle events
 */
const LifecycleNotifications: React.FC<LifecycleNotificationsProps> = ({
  events,
  notificationSettings,
  onDismiss,
  onDismissAll,
  onExportToCalendar,
  onSendEmail,
  className = ''
}) => {
  const [upcomingEvents, setUpcomingEvents] = useState<ProductLifecycleEvent[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  useEffect(() => {
    // Get upcoming events and sort by priority
    const upcoming = lifecycleNotificationService.getUpcomingEvents(events);
    
    // Filter by notification settings if available
    const filteredEvents = notificationSettings 
      ? lifecycleNotificationService.filterEventsBySettings(upcoming, notificationSettings) 
      : upcoming;
    
    const sortedEvents = lifecycleNotificationService.sortByPriority(filteredEvents);
    setUpcomingEvents(sortedEvents);
  }, [events, notificationSettings]);
  
  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical'): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-amber-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };
  
  const getSeverityIcon = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };
  
  const handleDismiss = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(eventId);
    }
  };
  
  const handleExportToCalendar = (event: ProductLifecycleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExportToCalendar) {
      onExportToCalendar(event);
    }
  };
  
  const handleSendEmail = (event: ProductLifecycleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSendEmail) {
      onSendEmail(event);
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell with Badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Bell className="h-5 w-5" />
              {upcomingEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {upcomingEvents.length}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upcoming events: {upcomingEvents.length}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-10 w-80 sm:w-96 max-h-[400px] overflow-auto z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {upcomingEvents.length === 0 
                ? (notificationSettings?.disabled 
                    ? 'Notifications are disabled' 
                    : 'No upcoming events in the next 30 days')
                : `${upcomingEvents.length} event${upcomingEvents.length === 1 ? '' : 's'} in the next 30 days`}
              {notificationSettings && !notificationSettings.disabled && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Receiving notifications on {notificationSettings.notificationChannels.map(channel => {
                    switch(channel) {
                      case 'email': return 'Email';
                      case 'in_app': return 'In-App';
                      case 'calendar': return 'Calendar';
                      default: return channel;
                    }
                  }).join(', ')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-2">
            {upcomingEvents.map(event => {
              const severity = lifecycleNotificationService.getNotificationSeverity(event);
              const daysUntil = differenceInCalendarDays(new Date(event.eventDate), new Date());
              
              return (
                <div 
                  key={event.id} 
                  className="border rounded-md p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getSeverityColor(severity)} text-white`}
                        >
                          <span className="flex items-center">
                            {getSeverityIcon(severity)}
                            <span className="ml-1 capitalize">{severity}</span>
                          </span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {daysUntil === 0 
                            ? 'Today' 
                            : daysUntil === 1 
                              ? 'Tomorrow' 
                              : `In ${daysUntil} days`}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm font-medium">
                        {lifecycleNotificationService.formatEventType(event.eventType)}
                      </div>
                      
                      <div className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(event.eventDate), 'MMMM d, yyyy')}
                      </div>
                      
                      {event.details && (
                        <div className="mt-1 text-xs">
                          {event.details}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => handleExportToCalendar(event, e)}
                            >
                              <CalendarDays className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add to calendar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => handleSendEmail(event, e)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send email notification</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => handleDismiss(event.id, e)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Dismiss notification</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
          
          {upcomingEvents.length > 0 && (
            <CardFooter className="flex justify-end pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onDismissAll}
              >
                Dismiss All
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
};

export default LifecycleNotifications;