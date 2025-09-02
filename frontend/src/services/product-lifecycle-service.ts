import { supabase } from '@/infrastructure/database/client';
import { 
  ProductLifecycleEvent, 
  CreateLifecycleEventRequest,
  EventStatus,
  LifecycleEventType
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';

/**
 * Service for managing product lifecycle events
 */
export class ProductLifecycleService {
  /**
   * Creates a new lifecycle event for a product
   * @param event Event details
   * @returns Created event
   */
  async createEvent(event: CreateLifecycleEventRequest): Promise<ProductLifecycleEvent> {
    const { productId, productType, eventType, quantity, transactionHash, actor, details } = event;
    
    // Default to current date if not provided
    const eventDate = new Date();
    
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .insert({
        product_id: productId,
        product_type: productType,
        event_type: eventType,
        event_date: eventDate.toISOString(),
        quantity,
        transaction_hash: transactionHash,
        actor,
        details,
        status: 'Pending' as EventStatus
      })
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Failed to create lifecycle event: ${error.message}`);
    }
    
    // Transform from snake_case to camelCase
    return this.transformEventFromDB(data);
  }
  
  /**
   * Gets all lifecycle events for a specific product
   * @param productId Product ID
   * @returns Array of lifecycle events
   */
  async getEventsByProductId(productId: string): Promise<ProductLifecycleEvent[]> {
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .select('*')
      .eq('product_id', productId)
      .order('event_date', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch lifecycle events: ${error.message}`);
    }
    
    return data.map(this.transformEventFromDB);
  }
  
  /**
   * Gets events by type across all products
   * @param eventType Type of event to filter by
   * @returns Array of matching lifecycle events
   */
  async getEventsByType(eventType: LifecycleEventType): Promise<ProductLifecycleEvent[]> {
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .select('*')
      .eq('event_type', eventType)
      .order('event_date', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch lifecycle events by type: ${error.message}`);
    }
    
    return data.map(this.transformEventFromDB);
  }
  
  /**
   * Updates the status of an event
   * @param eventId Event ID
   * @param status New status
   * @returns Updated event
   */
  async updateEventStatus(eventId: string, status: EventStatus): Promise<ProductLifecycleEvent> {
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .update({ status })
      .eq('id', eventId)
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Failed to update event status: ${error.message}`);
    }
    
    return this.transformEventFromDB(data);
  }
  
  /**
   * Deletes a lifecycle event
   * @param eventId Event ID
   * @returns Success flag
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const { error } = await supabase
      .from('product_lifecycle_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
    
    return true;
  }
  
  /**
   * Transforms a database record to a TypeScript interface
   * @param dbEvent Database record
   * @returns Transformed event
   */
  public transformEventFromDB(dbEvent: any): ProductLifecycleEvent {
    return {
      id: dbEvent.id,
      productId: dbEvent.product_id,
      productType: dbEvent.product_type as ProjectType,
      eventType: dbEvent.event_type as LifecycleEventType,
      eventDate: new Date(dbEvent.event_date),
      quantity: dbEvent.quantity,
      transactionHash: dbEvent.transaction_hash,
      actor: dbEvent.actor,
      details: dbEvent.details,
      status: dbEvent.status as EventStatus,
      createdAt: new Date(dbEvent.created_at),
      updatedAt: new Date(dbEvent.updated_at)
    };
  }
}

// Singleton instance
export const lifecycleService = new ProductLifecycleService();
