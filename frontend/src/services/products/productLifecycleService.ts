/**
 * Service for managing product lifecycle events
 */

import { supabase } from '@/infrastructure/database/client';
import { 
  ProductLifecycleEvent, 
  CreateLifecycleEventRequest,
  EventStatus,
  LifecycleEventType,
  AnyProduct
} from '@/types/products';
import { ProjectType } from '@/types/projects/projectTypes';
import { debounceCreateEvent } from '@/utils/debounceCreateEvent';

export class ProductLifecycleService {
  /**
   * Creates a new lifecycle event for a product with duplicate prevention
   * @param event Event details
   * @returns Created event
   */
  async createEvent(event: CreateLifecycleEventRequest): Promise<ProductLifecycleEvent> {
    // Use debounced implementation to ensure no duplicates are created
    // This will reuse identical event creation calls that happen within a short time window
    return debounceCreateEvent(event, this._createEventImpl.bind(this));
  }
  
  /**
   * Internal implementation of event creation
   * @private
   */
  private async _createEventImpl(event: CreateLifecycleEventRequest): Promise<ProductLifecycleEvent> {
    const { productId, productType, eventType, quantity, transactionHash, actor, details } = event;
    
    // Default to current date if not provided
    const eventDate = event.eventDate || new Date();
    
    // CRITICAL: Check for existing very similar events within the last 4 seconds
    // This must be LESS than the database trigger window (5 seconds) to prevent conflicts
    const checkWindow = new Date();
    checkWindow.setSeconds(checkWindow.getSeconds() - 4); // Look back 4 seconds (under DB trigger limit)
    
    try {
      const { data: existingEvents, error: checkError } = await supabase
        .from('product_lifecycle_events')
        .select('*')
        .eq('product_id', productId)
        .eq('event_type', eventType)
        .gte('created_at', checkWindow.toISOString())
        .order('created_at', { ascending: false });
      
      if (checkError) {
        console.warn('Error checking for recent duplicates:', checkError.message);
        // Continue with create despite check error, but log for monitoring
      } else if (existingEvents && existingEvents.length > 0) {
        console.log(`Found ${existingEvents.length} potential duplicates, checking if any match...`);
        
        // Found possible duplicates, check if they're very similar
        const possibleDuplicate = existingEvents.find(e => {
          // Consider it a duplicate if critical fields match
          // Use fuzzy matching for numeric values to account for potential small differences
          const quantityMatches = 
            (quantity === null && e.quantity === null) || 
            (quantity === undefined && e.quantity === null) ||
            (e.quantity === null && quantity === null) ||
            (typeof quantity === 'number' && typeof e.quantity === 'number' && 
              Math.abs(Number(e.quantity) - Number(quantity)) < 0.001);
          
          // For non-numeric fields, just check if they're equal
          const detailsMatch = (!details && !e.details) || details === e.details;
          
          return e.product_id === productId && 
                 e.event_type === eventType && 
                 quantityMatches && 
                 detailsMatch;
        });
        
        if (possibleDuplicate) {
          console.warn(`Detected duplicate event creation attempt for event type ${eventType}`);
          return this.transformEventFromDB(possibleDuplicate);
        }
      }
    } catch (err) {
      // Log the error but continue with creation - don't block creation due to duplicate check issues
      console.error('Error in duplicate detection:', err);
    }
    
    // If we get here, no duplicates were found, so create the event
    try {
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
          status: EventStatus.PENDING
        })
        .select('*')
        .single();
      
      if (error) {
        // Check if this is a database-level duplicate detection error
        if (error.message.includes('Duplicate event detected') || 
            error.message.includes('similar event was created within the last')) {
          console.warn('Database prevented duplicate event creation, fetching existing event...');
          
          // Try to fetch the most recent similar event
          const { data: recentEvent, error: fetchError } = await supabase
            .from('product_lifecycle_events')
            .select('*')
            .eq('product_id', productId)
            .eq('event_type', eventType)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!fetchError && recentEvent) {
            console.log('Successfully retrieved existing duplicate event');
            return this.transformEventFromDB(recentEvent);
          }
          
          // If we can't fetch the duplicate, throw a more user-friendly error
          throw new Error(`Unable to create event: A similar ${eventType} event was recently created for this product. Please wait a few seconds before trying again.`);
        }
        
        throw new Error(`Failed to create lifecycle event: ${error.message}`);
      }
      
      // Transform from snake_case to camelCase
      return this.transformEventFromDB(data);
    } catch (error) {
      // Handle both database constraint errors and other errors
      if (error instanceof Error) {
        // Check if this is a database-level duplicate detection error
        if (error.message.includes('Duplicate event detected') || 
            error.message.includes('similar event was created within the last')) {
          console.warn('Database constraint prevented duplicate event creation');
          
          // Try to fetch the most recent similar event as fallback
          try {
            const { data: recentEvent, error: fetchError } = await supabase
              .from('product_lifecycle_events')
              .select('*')
              .eq('product_id', productId)
              .eq('event_type', eventType)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!fetchError && recentEvent) {
              console.log('Successfully retrieved existing duplicate event after constraint error');
              return this.transformEventFromDB(recentEvent);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch existing event after duplicate detection:', fetchErr);
          }
          
          // Throw user-friendly error message
          throw new Error(`Unable to create event: A similar ${eventType} event was recently created for this product. Please wait a few seconds before trying again.`);
        }
        
        // Re-throw other errors as-is
        throw error;
      }
      
      console.error('Error creating lifecycle event:', error);
      throw error;
    }
  }
  
  /**
   * Bulk upload lifecycle events
   * @param events Array of event requests to create
   * @returns Array of created events
   */
  async bulkUploadLifecycleEvents(events: CreateLifecycleEventRequest[]): Promise<ProductLifecycleEvent[]> {
    // Process batches of 10 events at a time to avoid exceeding request size limits
    const batchSize = 10;
    const results: ProductLifecycleEvent[] = [];
    
    // Process in batches
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      // Prepare batch for insertion
      const insertData = batch.map(event => ({
        product_id: event.productId,
        product_type: event.productType,
        event_type: event.eventType,
        event_date: event.eventDate?.toISOString() || new Date().toISOString(),
        quantity: event.quantity,
        transaction_hash: event.transactionHash,
        actor: event.actor,
        details: event.details,
        status: event.metadata?.status || EventStatus.PENDING
      }));
      
      try {
        // Insert batch
        const { data, error } = await supabase
          .from('product_lifecycle_events')
          .insert(insertData)
          .select('*');
        
        if (error) {
          console.error('Error inserting batch:', error);
          throw new Error(`Failed to insert batch: ${error.message}`);
        }
        
        // Transform and add to results
        if (data && Array.isArray(data)) {
          results.push(...data.map(this.transformEventFromDB));
        }
      } catch (error) {
        console.error('Error processing batch:', error);
        throw new Error(`Error processing batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return results;
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
   * Gets lifecycle events for a specific project
   * @param projectId Project ID
   * @param productType Product type
   * @returns Array of lifecycle events
   */
  async getEventsByProjectId(projectId: string, productType: ProjectType): Promise<ProductLifecycleEvent[]> {
    // First, get the product for this project
    const { data: productData, error: productError } = await supabase
      .from(this.getTableNameForProductType(productType))
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    if (productError) {
      throw new Error(`Failed to fetch product: ${productError.message}`);
    }
    
    if (!productData) {
      return [];
    }
    
    return this.getEventsByProductId(productData.id);
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
   * Gets events by date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of lifecycle events
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<ProductLifecycleEvent[]> {
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .select('*')
      .gte('event_date', startDate.toISOString())
      .lte('event_date', endDate.toISOString())
      .order('event_date', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch lifecycle events by date range: ${error.message}`);
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
   * Updates an existing event
   * @param eventId Event ID
   * @param updates Event updates
   * @returns Updated event
   */
  async updateEvent(eventId: string, updates: Partial<CreateLifecycleEventRequest>): Promise<ProductLifecycleEvent> {
    // Convert to snake_case for database
    const dbUpdates: Record<string, any> = {};
    
    if (updates.eventType) dbUpdates.event_type = updates.eventType;
    if (updates.eventDate) dbUpdates.event_date = updates.eventDate.toISOString();
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.transactionHash !== undefined) dbUpdates.transaction_hash = updates.transactionHash;
    if (updates.actor !== undefined) dbUpdates.actor = updates.actor;
    if (updates.details !== undefined) dbUpdates.details = updates.details;
    
    const { data, error } = await supabase
      .from('product_lifecycle_events')
      .update(dbUpdates)
      .eq('id', eventId)
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
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
   * Gets analytics for product lifecycle events
   * @param productId Product ID
   * @returns Analytics data
   */
  async getProductLifecycleAnalytics(productId: string): Promise<{
    eventCounts: Record<LifecycleEventType, number>;
    statusCounts: Record<EventStatus, number>;
    valueChanges: { date: string; value: number }[];
    recentTrends: { eventType: LifecycleEventType; count: number }[];
  }> {
    // Get all events for this product
    const events = await this.getEventsByProductId(productId);
    
    // Calculate event type counts
    const eventCounts: Partial<Record<LifecycleEventType, number>> = {};
    Object.values(LifecycleEventType).forEach(type => {
      eventCounts[type] = events.filter(e => e.eventType === type).length;
    });
    
    // Calculate status counts
    const statusCounts: Partial<Record<EventStatus, number>> = {};
    Object.values(EventStatus).forEach(status => {
      statusCounts[status] = events.filter(e => e.status === status).length;
    });
    
    // Calculate value changes over time (using quantity field)
    const valueChanges = events
      .filter(e => e.quantity !== null && e.quantity !== undefined)
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
      .map(e => ({
        date: e.eventDate.toISOString().split('T')[0],
        value: e.quantity || 0
      }));
    
    // Get recent trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(e => e.eventDate >= thirtyDaysAgo);
    const recentTrends = Object.values(LifecycleEventType)
      .map(type => ({
        eventType: type,
        count: recentEvents.filter(e => e.eventType === type).length
      }))
      .filter(trend => trend.count > 0)
      .sort((a, b) => b.count - a.count);
    
    return {
      eventCounts: eventCounts as Record<LifecycleEventType, number>,
      statusCounts: statusCounts as Record<EventStatus, number>,
      valueChanges,
      recentTrends
    };
  }
  
  /**
   * Gets the appropriate table name for a product type
   * @param productType Product type
   * @returns Table name
   */
  private getTableNameForProductType(productType: ProjectType): string {
    const tableMap: Record<ProjectType, string> = {
      [ProjectType.STRUCTURED_PRODUCTS]: 'structured_products',
      [ProjectType.EQUITY]: 'equity_products',
      [ProjectType.COMMODITIES]: 'commodities_products',
      [ProjectType.FUNDS_ETFS_ETPS]: 'fund_products',
      [ProjectType.BONDS]: 'bond_products',
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
      [ProjectType.FIAT_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.CRYPTO_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.COMMODITY_BACKED_STABLECOIN]: 'stablecoin_products',
      [ProjectType.ALGORITHMIC_STABLECOIN]: 'stablecoin_products',
      [ProjectType.REBASING_STABLECOIN]: 'stablecoin_products',
    };
    
    return tableMap[productType];
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
      updatedAt: dbEvent.updated_at ? new Date(dbEvent.updated_at) : undefined
    };
  }
}

// Singleton instance
export const lifecycleService = new ProductLifecycleService();
