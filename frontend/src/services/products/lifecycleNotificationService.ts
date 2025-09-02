import { 
  ProductLifecycleEvent, 
  EventStatus, 
  LifecycleEventType
} from '@/types/products';
import { NotificationSettings, NotificationChannel } from '@/types/notifications';
import { notificationSettingsService } from './notificationSettingsService';
import { ProjectType } from '@/types/projects/projectTypes';
import { formatCurrency } from '@/utils/formatters';
import { format, addDays, differenceInCalendarDays, isWithinInterval, startOfDay } from 'date-fns';

/**
 * Service for managing lifecycle event notifications
 */
class LifecycleNotificationService {
  /**
   * Check for upcoming events that require notifications
   * @param events Array of lifecycle events
   * @param daysThreshold Number of days to look ahead for upcoming events
   * @returns Array of events that need notifications
   */
  public getUpcomingEvents(
    events: ProductLifecycleEvent[],
    daysThreshold = 30
  ): ProductLifecycleEvent[] {
    const today = new Date();
    const futureDate = addDays(today, daysThreshold);
    
    // Filter events that are:
    // 1. In the future
    // 2. Within the threshold
    // 3. In Pending status (not already processed)
    return events.filter(event => {
      const eventDate = new Date(event.eventDate);
      return (
        eventDate > today &&
        eventDate <= futureDate &&
        event.status === EventStatus.PENDING
      );
    });
  }

  /**
   * Sort upcoming events by priority
   * @param events Array of upcoming events
   * @returns Sorted array of events
   */
  public sortByPriority(events: ProductLifecycleEvent[]): ProductLifecycleEvent[] {
    return [...events].sort((a, b) => {
      // First sort by date (closer dates have higher priority)
      const dateA = new Date(a.eventDate);
      const dateB = new Date(b.eventDate);
      
      // Then sort by event type priority
      if (dateA.getTime() === dateB.getTime()) {
        return this.getEventTypePriority(b.eventType) - this.getEventTypePriority(a.eventType);
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Get priority score for different event types
   * @param eventType The type of event
   * @returns Priority score (higher = more important)
   */
  private getEventTypePriority(eventType: LifecycleEventType): number {
    switch (eventType) {
      case LifecycleEventType.MATURITY:
      case LifecycleEventType.REDEMPTION:
      case LifecycleEventType.CALL:
      case LifecycleEventType.LIQUIDATION:
      case LifecycleEventType.DEPEG:
        return 10; // Highest priority events
      
      case LifecycleEventType.COUPON_PAYMENT:
      case LifecycleEventType.DIVIDEND_PAYMENT:
      case LifecycleEventType.REBASE:
        return 8; // High priority events
      
      case LifecycleEventType.VALUATION:
      case LifecycleEventType.AUDIT:
        return 5; // Medium priority events
      
      case LifecycleEventType.ISSUANCE:
      case LifecycleEventType.REBALANCE:
      case LifecycleEventType.UPGRADE:
        return 3; // Lower priority events
      
      default:
        return 1; // Lowest priority
    }
  }

  /**
   * Generate notification message for an event
   * @param event The lifecycle event
   * @returns Formatted notification message
   */
  public generateNotificationMessage(event: ProductLifecycleEvent): string {
    const daysUntil = differenceInCalendarDays(new Date(event.eventDate), new Date());
    const dateStr = format(new Date(event.eventDate), 'MMMM d, yyyy');
    const productType = this.formatProductType(event.productType);
    const eventType = this.formatEventType(event.eventType);
    
    let message = `Upcoming ${eventType} for ${productType} on ${dateStr}`;
    
    // Add days until info
    if (daysUntil <= 7) {
      message += ` (${daysUntil} day${daysUntil === 1 ? '' : 's'} from now)`;
    }
    
    // Add amount if available
    if (event.quantity) {
      message += `: ${formatCurrency(event.quantity, 'USD')}`;
    }
    
    // Add any additional details
    if (event.details) {
      message += `. ${event.details}`;
    }
    
    return message;
  }
  
  /**
   * Generate email subject for an event notification
   * @param event The lifecycle event
   * @returns Formatted email subject
   */
  public generateEmailSubject(event: ProductLifecycleEvent): string {
    const daysUntil = differenceInCalendarDays(new Date(event.eventDate), new Date());
    const eventType = this.formatEventType(event.eventType);
    const productType = this.formatProductType(event.productType);
    
    if (daysUntil <= 3) {
      return `URGENT: ${eventType} for ${productType} in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    } else if (daysUntil <= 7) {
      return `REMINDER: ${eventType} for ${productType} next week`;
    } else {
      return `Upcoming ${eventType} for ${productType}`;
    }
  }
  
  /**
   * Format product type for display
   * @param productType The product type
   * @returns Formatted product type
   */
  formatProductType(productType: ProjectType): string {
    return productType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Format event type for display
   * @param eventType The event type
   * @returns Formatted event type
   */
  formatEventType(eventType: LifecycleEventType): string {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Check if a notification should be sent based on user settings
   * @param event The lifecycle event
   * @param settings User notification settings
   * @returns Boolean indicating whether to send the notification
   */
  public shouldSendNotification(
    event: ProductLifecycleEvent,
    settings: NotificationSettings
  ): boolean {
    // Check if notifications are disabled
    if (settings.disabled) return false;
    
    // Check if the event type is included in the settings
    // If event types array is empty, all events are included
    if (settings.eventTypes.length > 0 && !settings.eventTypes.includes(event.eventType)) {
      return false;
    }
    
    // Check advance notice days
    const daysUntil = differenceInCalendarDays(new Date(event.eventDate), new Date());
    if (!settings.advanceNoticeDays.includes(daysUntil)) {
      return false;
    }
    
    return true;
  }

  /**
   * Filter events based on user notification settings
   * @param events Array of events
   * @param settings User notification settings
   * @returns Filtered array of events
   */
  public filterEventsBySettings(
    events: ProductLifecycleEvent[],
    settings: NotificationSettings
  ): ProductLifecycleEvent[] {
    if (settings.disabled) return [];
    
    return events.filter(event => this.shouldSendNotification(event, settings));
  }
  
  /**
   * Filter events by date range
   * @param events Array of events
   * @param startDate Start date for filtering
   * @param endDate End date for filtering
   * @returns Filtered array of events
   */
  public filterEventsByDateRange(
    events: ProductLifecycleEvent[],
    startDate: Date,
    endDate: Date
  ): ProductLifecycleEvent[] {
    return events.filter(event => {
      const eventDate = new Date(event.eventDate);
      return isWithinInterval(eventDate, { start: startOfDay(startDate), end: endDate });
    });
  }
  
  /**
   * Filter events by type
   * @param events Array of events
   * @param eventTypes Array of event types to include
   * @returns Filtered array of events
   */
  public filterEventsByType(
    events: ProductLifecycleEvent[],
    eventTypes: LifecycleEventType[]
  ): ProductLifecycleEvent[] {
    if (!eventTypes.length) return events;
    return events.filter(event => eventTypes.includes(event.eventType));
  }
  
  /**
   * Filter events by status
   * @param events Array of events
   * @param statuses Array of statuses to include
   * @returns Filtered array of events
   */
  public filterEventsByStatus(
    events: ProductLifecycleEvent[],
    statuses: EventStatus[]
  ): ProductLifecycleEvent[] {
    if (!statuses.length) return events;
    return events.filter(event => statuses.includes(event.status));
  }
  
  /**
   * Apply multiple filters to events
   * @param events Array of events
   * @param filters Object containing filter criteria
   * @returns Filtered array of events
   */
  public applyFilters(
    events: ProductLifecycleEvent[],
    filters: {
      eventTypes?: LifecycleEventType[];
      statuses?: EventStatus[];
      startDate?: Date;
      endDate?: Date;
      settings?: NotificationSettings;
    }
  ): ProductLifecycleEvent[] {
    let filteredEvents = [...events];
    
    // Apply settings filter
    if (filters.settings) {
      filteredEvents = this.filterEventsBySettings(filteredEvents, filters.settings);
    }
    
    // Apply event type filter
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filteredEvents = this.filterEventsByType(filteredEvents, filters.eventTypes);
    }
    
    // Apply status filter
    if (filters.statuses && filters.statuses.length > 0) {
      filteredEvents = this.filterEventsByStatus(filteredEvents, filters.statuses);
    }
    
    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      filteredEvents = this.filterEventsByDateRange(
        filteredEvents,
        filters.startDate,
        filters.endDate
      );
    }
    
    return filteredEvents;
  }

  /**
   * Check if a notification channel is enabled
   * @param settings User notification settings
   * @param channel Channel to check
   * @returns Boolean indicating if the channel is enabled
   */
  public isChannelEnabled(
    settings: NotificationSettings,
    channel: NotificationChannel
  ): boolean {
    return settings.notificationChannels.includes(channel);
  }
  
  /**
   * Get severity level for notification
   * @param event The lifecycle event
   * @returns Severity level: 'low', 'medium', 'high', or 'critical'
   */
  public getNotificationSeverity(event: ProductLifecycleEvent): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntil = differenceInCalendarDays(new Date(event.eventDate), new Date());
    const priority = this.getEventTypePriority(event.eventType);
    
    if (daysUntil <= 1 && priority >= 8) {
      return 'critical';
    } else if (daysUntil <= 3 && priority >= 5) {
      return 'high';
    } else if (daysUntil <= 7 || priority >= 8) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Create a calendar event object for integration with external calendars
   * @param event The lifecycle event
   * @returns Calendar event object (compatible with iCal/Google Calendar)
   */
  public createCalendarEvent(event: ProductLifecycleEvent): CalendarEvent {
    const eventDate = new Date(event.eventDate);
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1); // Default to 1-hour event
    
    const productType = this.formatProductType(event.productType);
    const eventType = this.formatEventType(event.eventType);
    
    return {
      summary: `${eventType} - ${productType}`,
      description: event.details || `${eventType} for ${productType}`,
      location: '',
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 30 } // 30 minutes before
        ]
      }
    };
  }
}

/**
 * Interface for calendar event
 */
export interface CalendarEvent {
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export const lifecycleNotificationService = new LifecycleNotificationService();