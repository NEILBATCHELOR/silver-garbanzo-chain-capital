import React, { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/database/client';
import { useSupabaseSubscription } from '@/hooks/supabase';
import { useUser } from '@/hooks/auth/user/useUser';
import BulkUploadLifecycleEvents from './bulk-upload-lifecycle-events';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, FileText, BarChart3, Bell, Clock, Upload, Settings, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  ProductLifecycleEvent, 
  CreateLifecycleEventRequest, 
  EventStatus, 
  LifecycleEventType 
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { NotificationSettings, NotificationChannel, EmailTemplate } from '@/types/notifications/notificationSettings';
import { lifecycleService } from '@/services/products/productLifecycleService';
import { lifecycleNotificationService, CalendarEvent } from '@/services/products/lifecycleNotificationService';
import { notificationSettingsService } from '@/services/products/notificationSettingsService';
import LifecycleEventCard from './lifecycle-event-card';
import LifecycleTimeline from './lifecycle-timeline';
import LifecycleEventForm from './lifecycle-event-form';
import LifecycleAnalytics from './lifecycle-analytics';
import LifecycleReport from './lifecycle-report';
import LifecycleNotifications from './lifecycle-notifications';
import EmailNotification from './email-notification';
import CalendarExport from './calendar-export';
import NotificationSettingsForm from './notification-settings-form';

interface ProductLifecycleManagerProps {
  productId: string;
  productType: ProjectType;
  className?: string;
}

/**
 * Fixed Product Lifecycle Manager component that properly validates products
 * instead of trying to validate product IDs against the projects table
 */
const ProductLifecycleManager: React.FC<ProductLifecycleManagerProps> = ({
  productId,
  productType,
  className
}) => {
  const [events, setEvents] = useState<ProductLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProductLifecycleEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedEvent, setSelectedEvent] = useState<ProductLifecycleEvent | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(900000); // Default to 15 minutes
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [productExists, setProductExists] = useState<boolean | null>(null);
  
  // Get the current user
  const { user } = useUser();
  
  const { toast } = useToast();

  // Connection status tracking
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'polling' | 'disconnected'>('disconnected');

  // Map project types to their corresponding product table names
  const getProductTableName = (projectType: ProjectType): string => {
    const tableMap: Record<ProjectType, string> = {
      [ProjectType.FIAT_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.CRYPTO_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.COMMODITY_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.ALGORITHMIC_STABLECOIN]: 'stablecoin_products',
      [ProjectType.REBASING_STABLECOIN]: 'stablecoin_products',
      [ProjectType.EQUITY]: 'equity_products',
      [ProjectType.BONDS]: 'bond_products',
      [ProjectType.FUNDS_ETFS_ETPS]: 'fund_products',
      [ProjectType.COMMODITIES]: 'commodities_products',
      [ProjectType.QUANTITATIVE_INVESTMENT_STRATEGIES]: 'quantitative_investment_strategies_products',
      [ProjectType.PRIVATE_EQUITY]: 'private_equity_products',
      [ProjectType.PRIVATE_DEBT]: 'private_debt_products',
      [ProjectType.REAL_ESTATE]: 'real_estate_products',
      [ProjectType.ENERGY]: 'energy_products',
      [ProjectType.SOLAR_WIND_CLIMATE]: 'energy_products',
      [ProjectType.INFRASTRUCTURE]: 'infrastructure_products',
      [ProjectType.COLLECTIBLES]: 'collectibles_products',
      [ProjectType.RECEIVABLES]: 'asset_backed_products',
      [ProjectType.DIGITAL_TOKENISED_FUND]: 'digital_tokenized_fund_products',
      [ProjectType.STRUCTURED_PRODUCTS]: 'structured_products',
    };
    
    return tableMap[projectType] || 'products'; // fallback to generic products table
  };

  // Fixed product validation - validate against the correct product table
  useEffect(() => {
    const validateProduct = async () => {
      if (!productId || typeof productId !== 'string' || productId.trim() === '') {
        setProductExists(false);
        setError('Invalid product ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get the correct product table name based on product type
        const tableName = getProductTableName(productType);
        
        // First, try to validate the product exists in the appropriate product table
        const { data: productData, error: productError } = await supabase
          .from(tableName)
          .select('id, project_id')
          .eq('id', productId.trim())
          .single();

        if (productError && productError.code !== 'PGRST116') {
          console.error('Error validating product:', productError);
          // If product table validation fails, check if lifecycle events exist as fallback
          const { data: eventsData, error: eventsError } = await supabase
            .from('product_lifecycle_events')
            .select('id')
            .eq('product_id', productId.trim())
            .limit(1);
          
          if (!eventsError && eventsData && eventsData.length > 0) {
            // Product doesn't exist in table but has lifecycle events - allow it
            setProductExists(true);
            console.log('Product validated via existing lifecycle events');
            return;
          }
          
          setProductExists(false);
          setError('Error validating product. Please try again.');
          return;
        }
        
        setProductExists(!!productData);
        if (!productData) {
          // Product doesn't exist in product table, check if lifecycle events exist
          const { data: eventsData, error: eventsError } = await supabase
            .from('product_lifecycle_events')
            .select('id')
            .eq('product_id', productId.trim())
            .limit(1);
          
          if (!eventsError && eventsData && eventsData.length > 0) {
            // No product record but has lifecycle events - allow it (orphaned events)
            setProductExists(true);
            console.log('Product validated via existing lifecycle events (orphaned)');
          } else {
            setError(`Product with ID ${productId} does not exist. The product may have been deleted or moved.`);
          }
        } else {
          console.log('Product validated via product table:', tableName);
        }
      } catch (err) {
        console.error('Error validating product:', err);
        setProductExists(false);
        setError('Failed to validate product. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    validateProduct();
  }, [productId, productType]);

  // Use our custom hook for realtime subscriptions with fallback polling
  const { isSubscribed, isPolling, error: subscriptionError } = useSupabaseSubscription({
    table: 'product_lifecycle_events',
    // Set up subscription for lifecycle events regardless of product existence status
    filter: productId && typeof productId === 'string' && productId.trim() !== '' ? 
      `product_id=eq.${productId.trim()}` : undefined,
    callback: (payload) => {
      // Skip processing if we're in the middle of submitting a form
      if (submitting) {
        console.log('Ignoring subscription update during form submission');
        return;
      }
      
      // Handle payload safely - always check if it exists and has expected properties
      if (!payload) {
        console.warn('Received empty payload from subscription');
        return;
      }
      
      // For polling results, we'll get a complete refresh
      if (payload.eventType === 'POLL') {
        // Just use the fetch function instead of direct updates
        fetchEvents();
        return;
      }
      
      try {
        // Keep track of event IDs we've already processed to prevent duplicates
        const eventId = payload.new?.id || payload.old?.id;
        
        // Skip processing if we don't have a valid ID
        if (!eventId) {
          console.warn('Received payload without valid ID');
          return;
        }
        
        // Handle real-time events
        if (payload.eventType === 'INSERT' && payload.new) {
          // Check if we already have this event in our state
          setEvents(current => {
            // Check if we already have this event
            if (current.some(e => e.id === eventId)) {
              console.log(`Event ${eventId} already exists, skipping update`);
              return current;
            }
            return [lifecycleService.transformEventFromDB(payload.new), ...current];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setEvents(current => 
            current.map(event => 
              event.id === eventId
                ? lifecycleService.transformEventFromDB(payload.new) 
                : event
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setEvents(current => current.filter(event => event.id !== eventId));
        }
      } catch (error) {
        console.warn('Error processing realtime payload:', error);
        // Fallback to full refresh on error
        fetchEvents();
      }
    },
    onError: (err) => {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Subscription error:', err);
      }
      setRealtimeStatus('polling');
      
      // Only show toast for the first error to avoid spamming
      if (realtimeStatus !== 'polling') {
        toast({
          title: "Real-time updates unavailable",
          description: "Falling back to periodic updates. You may need to refresh for the latest data.",
        });
      }
    },
    pollingInterval: refreshInterval, // User-configurable refresh interval
  });

  // Update status based on subscription state with error handling
  useEffect(() => {
    try {
      if (isSubscribed) {
        setRealtimeStatus('connected');
      } else if (isPolling) {
        setRealtimeStatus('polling');
      } else {
        setRealtimeStatus('disconnected');
      }
    } catch (err) {
      console.warn('Error updating realtime status:', err);
      // Fallback to safest option
      setRealtimeStatus('disconnected');
    }
  }, [isSubscribed, isPolling]);
  
  // Update polling when refresh interval changes
  useEffect(() => {
    // Only re-fetch if we're already polling (not on first render)
    if (isPolling) {
      // Cancel existing subscription and re-fetch with new interval
      fetchEvents();
      
      // Show toast notification about interval change
      toast({
        title: "Refresh interval updated",
        description: `Data will now refresh every ${refreshInterval / 60000} minute${refreshInterval === 60000 ? '' : 's'}.`,
      });
    }
  }, [refreshInterval]);
  
  // Initial data fetch - fetch events regardless of product existence validation
  useEffect(() => {
    if (productId && typeof productId === 'string' && productId.trim() !== '') {
      fetchEvents();
    }
  }, [productId]);
  
  // Load notification settings - enhanced with product validation
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      setLoadingSettings(true);
      try {
        // Pass undefined as projectId since we're dealing with product lifecycle, not project lifecycle
        const settings = await notificationSettingsService.getOrCreateDefaultSettings(
          user.id,
          undefined // Product lifecycle events don't need project-specific settings
        );
        setNotificationSettings(settings);
      } catch (error) {
        console.error('Error loading notification settings:', error);
        // Fallback to default settings in memory if DB fetch fails
        setNotificationSettings({
          id: 'default',
          userId: user.id,
          projectId: undefined,
          eventTypes: [],
          notificationChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          emailRecipients: [],
          emailTemplate: EmailTemplate.DEFAULT,
          advanceNoticeDays: [1, 7, 30],
          disabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } finally {
        setLoadingSettings(false);
      }
    };
    
    if (user) {
      loadSettings();
    }
  }, [user, productId]);

  // Fetch analytics data when tab changes to analytics
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData && productExists) {
      fetchAnalytics();
    }
  }, [activeTab, productExists]);

  // Enhanced fetch events function that works regardless of product table existence
  const fetchEvents = async () => {
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      console.warn('Attempted to fetch events with invalid product ID');
      setError('Invalid product ID provided');
      setEvents([]);
      setLoading(false);
      return;
    }

    // Use a local variable to track if the component is still mounted
    // This prevents state updates after unmounting
    let isMounted = true;
    
    try {
      setLoading(true);
      setError(null);
      
      const events = await lifecycleService.getEventsByProductId(productId);
      
      // Only update state if component is still mounted
      if (isMounted) {
        // Check if events is an array before setting state
        if (Array.isArray(events)) {
          setEvents(events);
          
          // If we found events but product validation failed, set product as existing
          if (events.length > 0 && productExists === false) {
            setProductExists(true);
            console.log('Product existence confirmed via lifecycle events');
          }
        } else {
          console.warn('Received non-array events data:', events);
          setEvents([]);
          setError('Received invalid event data format. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      // Only update state if component is still mounted
      if (isMounted) {
        setError('Failed to load lifecycle events. Please try again.');
        // Ensure we don't leave events in an undefined state
        setEvents([]);
      }
    } finally {
      // Only update state if component is still mounted
      if (isMounted) {
        setLoading(false);
      }
    }
    
    // Cleanup function for the async operation
    return () => {
      isMounted = false;
    };
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!productExists) return;
    
    try {
      const data = await lifecycleService.getProductLifecycleAnalytics(productId);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  // Enhanced event creation that works regardless of product table existence
  const handleCreateEvent = async (eventData: CreateLifecycleEventRequest) => {
    try {
      setSubmitting(true);
      
      // Create the event but avoid calling fetchEvents() which can cause duplicates
      // when combined with the real-time subscription
      const createdEvent = await lifecycleService.createEvent(eventData);
      
      // Close the form immediately to prevent double submissions
      setShowForm(false);
      setEditingEvent(null);
      
      // The real-time subscription should update the UI automatically
      // If we're not connected via real-time, manually update the events list
      if (realtimeStatus !== 'connected') {
        setEvents(prevEvents => [createdEvent, ...prevEvents]);
      }
      
      // If this was the first event and product wasn't validated, set it as existing
      if (productExists === false) {
        setProductExists(true);
      }
      
      // Show success toast
      toast({
        title: "Event Created",
        description: "The lifecycle event has been successfully created.",
      });
    } catch (err) {
      console.error('Error creating event:', err);
      
      // Handle duplicate event errors more gracefully
      if (err instanceof Error && 
          (err.message.includes('similar event was recently created') ||
           err.message.includes('Duplicate event detected'))) {
        
        // For duplicates, show a warning instead of error and close the form
        setShowForm(false);
        setEditingEvent(null);
        
        toast({
          title: "Event Already Exists",
          description: "A similar event was already created recently. The form has been closed to prevent duplicates.",
          variant: "default", // Use default instead of destructive for duplicates
        });
        
        // Don't set error state for duplicates since this is expected behavior
        return;
      }
      
      // For other errors, show the standard error handling
      setError('Failed to create lifecycle event. Please try again.');
      
      toast({
        title: "Error Creating Event",
        description: "There was a problem creating the lifecycle event.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle event update
  const handleUpdateEvent = async (eventData: CreateLifecycleEventRequest) => {
    if (!editingEvent) return;
    
    try {
      setSubmitting(true);
      
      // Update the event but avoid calling fetchEvents() which can cause duplicates
      // when combined with the real-time subscription
      const updatedEvent = await lifecycleService.updateEvent(editingEvent.id, eventData);
      
      // Close the form immediately to prevent double submissions
      setShowForm(false);
      setEditingEvent(null);
      
      // The real-time subscription should update the UI automatically
      // If we're not connected via real-time, manually update the events list
      if (realtimeStatus !== 'connected') {
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === updatedEvent.id ? updatedEvent : event
          )
        );
      }
      
      // Show success toast
      toast({
        title: "Event Updated",
        description: "The lifecycle event has been successfully updated.",
      });
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update lifecycle event. Please try again.');
      
      // Show error toast
      toast({
        title: "Error Updating Event",
        description: "There was a problem updating the lifecycle event.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      await lifecycleService.deleteEvent(eventId);
      await fetchEvents();
      
      // Show success toast
      toast({
        title: "Event Deleted",
        description: "The lifecycle event has been successfully deleted.",
      });
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete lifecycle event. Please try again.');
      
      // Show error toast
      toast({
        title: "Error Deleting Event",
        description: "There was a problem deleting the lifecycle event.",
        variant: "destructive",
      });
    }
  };

  // Handle status change
  const handleStatusChange = async (eventId: string, newStatus: EventStatus) => {
    try {
      await lifecycleService.updateEventStatus(eventId, newStatus);
      
      // The real-time subscription should update the UI automatically
      // If we're not connected via real-time, manually update the events list
      if (realtimeStatus !== 'connected') {
        await fetchEvents();
      }
      
      // Show success toast
      toast({
        title: "Status Updated",
        description: `Event status has been changed to ${newStatus}.`,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update event status. Please try again.');
      
      // Show error toast
      toast({
        title: "Error Updating Status",
        description: "There was a problem updating the event status.",
        variant: "destructive",
      });
    }
  };

  // Handle edit event
  const handleEditEvent = (event: ProductLifecycleEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };
  
  // Handle notification dismissal with proper state management
  const handleDismissNotification = (eventId: string) => {
    if (!eventId) {
      console.warn('Attempted to dismiss notification with undefined eventId');
      return;
    }
    
    setDismissedNotifications(prev => {
      // Check if already dismissed to prevent duplicates
      if (prev.includes(eventId)) return prev;
      return [...prev, eventId];
    });
    
    // Show toast
    toast({
      title: "Notification Dismissed",
      description: "The notification has been dismissed.",
    });
  };
  
  // Handle dismissing all notifications
  const handleDismissAllNotifications = () => {
    const upcomingEvents = lifecycleNotificationService.getUpcomingEvents(events);
    const eventIds = upcomingEvents.map(event => event.id);
    setDismissedNotifications(eventIds);
    
    // Show toast
    toast({
      title: "All Notifications Dismissed",
      description: "All notifications have been dismissed.",
    });
  };
  
  // Handle sending email notification
  const handleSendEmail = async (
    eventToNotify: ProductLifecycleEvent,
    recipients: string[], 
    subject: string, 
    body: string
  ) => {
    // In a real application, this would send an actual email
    // For now, we'll just show a toast notification
    
    console.log('Sending email notification:', {
      event: eventToNotify,
      recipients,
      subject,
      body
    });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success toast
    toast({
      title: "Email Sent",
      description: `Notification email sent to ${recipients.length} recipient(s).`,
    });
    
    return true;
  };
  
  // Handle exporting to calendar
  const handleExportToCalendar = async (
    eventToExport: ProductLifecycleEvent,
    calendarEvent: CalendarEvent, 
    calendarType: string
  ) => {
    // In a real application, this would create calendar events in the selected calendar
    // For now, we'll just show a toast and generate an ICS file for download
    
    console.log('Exporting to calendar:', {
      event: eventToExport,
      calendarEvent,
      calendarType
    });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (calendarType === 'ical') {
      // Generate ICS file content
      const icsContent = generateICSFile(calendarEvent);
      
      // Create downloadable link
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event_${eventToExport.id}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For other calendar types, we'd need to use their APIs
      // For now, just show a toast
      toast({
        title: "Calendar Export",
        description: `Event exported to ${calendarType.charAt(0).toUpperCase() + calendarType.slice(1)} Calendar.`,
      });
    }
    
    return true;
  };
  
  // Generate ICS file content
  const generateICSFile = (calendarEvent: CalendarEvent): string => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Chain Capital//Lifecycle Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Math.random().toString(36).substring(2)}@chaincapital.com
DTSTAMP:${formatDate(new Date().toISOString())}
DTSTART:${formatDate(calendarEvent.start.dateTime)}
DTEND:${formatDate(calendarEvent.end.dateTime)}
SUMMARY:${calendarEvent.summary}
DESCRIPTION:${calendarEvent.description.replace(/\n/g, '\\n')}
${calendarEvent.location ? `LOCATION:${calendarEvent.location}` : ''}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder
TRIGGER:-PT${calendarEvent.reminders.overrides[0].minutes}M
END:VALARM
END:VEVENT
END:VCALENDAR`;
  };
  
  // Filter events for notifications
  const filterEventsForNotifications = () => {
    // Filter out dismissed notifications
    const nonDismissed = events.filter(event => !dismissedNotifications.includes(event.id));
    
    // Apply notification settings if available
    if (notificationSettings) {
      return lifecycleNotificationService.filterEventsBySettings(nonDismissed, notificationSettings);
    }
    
    return nonDismissed;
  };

  // Get title based on whether adding or editing
  const formTitle = editingEvent ? 'Edit Lifecycle Event' : 'Add Lifecycle Event';

  // Enhanced component state management
  const canManageEvents = productId && typeof productId === 'string' && productId.trim() !== '';
  const shouldShowEvents = events.length > 0;
  const isValidProductId = productId && typeof productId === 'string' && productId.trim() !== '';

  // If still validating product or initial loading, show loading state
  if ((loading && !events.length) || productExists === null) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle>Product Lifecycle Management</CardTitle>
          <CardDescription>Loading product lifecycle events...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If product doesn't exist and no events, show error state with option to create anyway
  if (productExists === false && !shouldShowEvents) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Product Not Found</CardTitle>
          </div>
          <CardDescription>
            The requested product (ID: {productId}) does not exist in the product tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to find this product in the database. You can still create lifecycle events for this product ID 
              if you believe it should exist.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
            {isValidProductId && (
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Events Anyway
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add Lifecycle Event</DialogTitle>
                    <DialogDescription>
                      Add a lifecycle event for this product ID. This will create the event even though 
                      the product record may not exist in the database.
                    </DialogDescription>
                  </DialogHeader>
                  <LifecycleEventForm
                    productId={productId}
                    productType={productType}
                    onSubmit={handleCreateEvent}
                    onCancel={() => setShowForm(false)}
                    isSubmitting={submitting}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render - product exists or has events
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Product Lifecycle Management</CardTitle>
            <CardDescription>
              Track and manage the lifecycle events for this product
              {realtimeStatus === 'polling' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  <span className="h-2 w-2 mr-1 bg-yellow-400 rounded-full"></span>
                  Updates every {refreshInterval / 60000} minute{refreshInterval === 60000 ? '' : 's'}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {/* Notifications Component */}
            <LifecycleNotifications 
              events={filterEventsForNotifications()}
              onDismiss={handleDismissNotification}
              onDismissAll={handleDismissAllNotifications}
              onExportToCalendar={(event) => {
                setSelectedEvent(event);
                // The actual export is handled by the CalendarExport component
              }}
              onSendEmail={(event) => {
                setSelectedEvent(event);
                // The actual email sending is handled by the EmailNotification component
              }}
            />
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {refreshInterval === 60000 ? "1 min" :
                     refreshInterval === 300000 ? "5 mins" :
                     refreshInterval === 600000 ? "10 mins" : "15 mins"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setRefreshInterval(60000)}>Refresh every 1 minute</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRefreshInterval(300000)}>Refresh every 5 minutes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRefreshInterval(600000)}>Refresh every 10 minutes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRefreshInterval(900000)}>Refresh every 15 minutes</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchEvents}
                disabled={!canManageEvents}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowBulkUpload(true)}
                disabled={!canManageEvents}
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Dialog open={showForm} onOpenChange={(open) => {
                // Only allow closing if we're not submitting
                if (!submitting) {
                  setShowForm(open);
                  // Clear editing state when dialog is closed
                  if (!open) {
                    setEditingEvent(null);
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!canManageEvents}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{formTitle}</DialogTitle>
                    <DialogDescription>
                      {editingEvent ? "Update the details of this lifecycle event." : "Add a new lifecycle event to track product milestones."}
                    </DialogDescription>
                  </DialogHeader>
                  <LifecycleEventForm
                    productId={productId}
                    productType={productType}
                    initialEvent={editingEvent || undefined}
                    onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingEvent(null);
                    }}
                    isSubmitting={submitting}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Hidden email notification component (triggered by notifications) */}
        {selectedEvent && (
          <div className="hidden">
            <EmailNotification
              key={`email-${selectedEvent.id}`}
              event={selectedEvent}
              onSend={(recipients, subject, body) => {
                // Make a copy of the event to prevent issues with state changes during async operation
                const eventCopy = {...selectedEvent};
                return handleSendEmail(eventCopy, recipients, subject, body);
              }}
              defaultRecipients={['team@example.com']}
            />
            <CalendarExport
              key={`calendar-${selectedEvent.id}`}
              event={selectedEvent}
              onExport={(calendarEvent, calendarType) => {
                // Make a copy of the event to prevent issues with state changes during async operation
                const eventCopy = {...selectedEvent};
                return handleExportToCalendar(eventCopy, calendarEvent, calendarType);
              }}
            />
          </div>
        )}
        
        <Tabs 
          defaultValue="timeline" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Notification Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline">
            {loading ? (
              <div className="text-center py-8">Loading timeline...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">
                  No lifecycle events recorded yet.
                </div>
                {canManageEvents ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Event
                  </Button>
                ) : (
                  <div className="text-sm text-gray-500">
                    Unable to create events - invalid product configuration.
                  </div>
                )}
              </div>
            ) : (
              <LifecycleTimeline
                events={events}
                onEventClick={handleEditEvent}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteEvent}
              />
            )}
          </TabsContent>
          
          <TabsContent value="cards">
            {loading ? (
              <div className="text-center py-8">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">
                  No lifecycle events recorded yet.
                </div>
                {canManageEvents ? (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Event
                  </Button>
                ) : (
                  <div className="text-sm text-gray-500">
                    Unable to create events - invalid product configuration.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => (
                  <div key={event.id} className="relative">
                    <LifecycleEventCard
                      event={event}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteEvent}
                      onEdit={handleEditEvent}
                      productType={productType}
                    />
                    {/* Add notification buttons to each card */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-white"
                        onClick={() => {
                          setSelectedEvent(event);
                          // The EmailNotification component will handle this
                          document.getElementById(`email-btn-${event.id}`)?.click();
                        }}
                      >
                        <span className="sr-only">Send email notification</span>
                        <Bell className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Hidden buttons to trigger the dialogs */}
                    <button
                      id={`email-btn-${event.id}`}
                      className="hidden"
                      onClick={() => {
                        setSelectedEvent(event);
                        handleSendEmail(
                          event,
                          ['team@example.com'],
                          lifecycleNotificationService.generateEmailSubject(event),
                          generateEmailBody(event)
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics">
            <LifecycleAnalytics 
              productId={productId} 
              events={events} 
              analyticsData={analyticsData}
              isLoading={loading}
              onRefresh={fetchAnalytics}
            />
          </TabsContent>
          
          <TabsContent value="reports">
            <LifecycleReport
              productId={productId}
              productType={productType}
              events={events}
              isLoading={loading}
            />
          </TabsContent>
          
          <TabsContent value="settings">
            {user ? (
              <NotificationSettingsForm
                projectId={undefined} // Product lifecycle events don't need project-specific settings
                projectType={productType}
                className="mt-4"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                You need to be signed in to manage notification settings.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Bulk upload dialog */}
      <BulkUploadLifecycleEvents 
        productId={productId}
        productType={productType}
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onUploadComplete={(newEvents) => {
          // If we're connected via real-time, let the subscription handle the updates
          // Otherwise, add the new events to the state
          if (realtimeStatus !== 'connected') {
            setEvents(prevEvents => [...newEvents, ...prevEvents]);
          }
          setShowBulkUpload(false);
        }}
        bulkUploadLifecycleEvents={lifecycleService.bulkUploadLifecycleEvents.bind(lifecycleService)}
      />
    </Card>
  );
};

// Helper function to generate email body for event
function generateEmailBody(event: ProductLifecycleEvent): string {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  
  const eventType = event.eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `Hello,

This is a notification about an upcoming financial product lifecycle event.

Event Type: ${eventType}
Date: ${formatDate(new Date(event.eventDate))}
${event.quantity ? `Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(event.quantity)}` : ''}
${event.details ? `Details: ${event.details}` : ''}

Please review the details and take appropriate action as needed.

Regards,
Chain Capital Team`;
}

export default ProductLifecycleManager;
