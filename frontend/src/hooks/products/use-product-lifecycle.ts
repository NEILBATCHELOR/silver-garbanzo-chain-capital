import { useState, useEffect } from 'react';
import { 
  ProductLifecycleEvent, 
  CreateLifecycleEventRequest,
  EventStatus
} from '@/types/products';
import { lifecycleService } from '@/services/products/productLifecycleService';

/**
 * Hook for managing product lifecycle events
 * @param productId Product ID
 * @returns Object with lifecycle events and methods for managing them
 */
export function useProductLifecycle(productId: string) {
  const [events, setEvents] = useState<ProductLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchEvents();
    }
  }, [productId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEvents = await lifecycleService.getEventsByProductId(productId);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load lifecycle events');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const data = await lifecycleService.getProductLifecycleAnalytics(productId);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const createEvent = async (eventData: CreateLifecycleEventRequest) => {
    try {
      await lifecycleService.createEvent(eventData);
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create lifecycle event');
      return false;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<CreateLifecycleEventRequest>) => {
    try {
      await lifecycleService.updateEvent(eventId, updates);
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update lifecycle event');
      return false;
    }
  };

  const updateEventStatus = async (eventId: string, status: EventStatus) => {
    try {
      await lifecycleService.updateEventStatus(eventId, status);
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error updating event status:', err);
      setError('Failed to update event status');
      return false;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await lifecycleService.deleteEvent(eventId);
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete lifecycle event');
      return false;
    }
  };

  return {
    events,
    loading,
    error,
    analyticsData,
    analyticsLoading,
    fetchEvents,
    fetchAnalytics,
    createEvent,
    updateEvent,
    updateEventStatus,
    deleteEvent,
  };
}
