/* debounceCreateEvent.ts - Bulletproof debounce implementation for event creation */

import { CreateLifecycleEventRequest, ProductLifecycleEvent } from '@/types/products';

// Global event memory - persists even between component mounts
type EventHash = string;
interface EventMemory {
  eventHash: EventHash;
  timestamp: number;
  promise: Promise<ProductLifecycleEvent>;
}

// Keep track of recent events to deduplicate
const recentEvents = new Map<EventHash, EventMemory>();

// Duration to keep events in memory (6 seconds - slightly longer than DB trigger)
const MEMORY_DURATION = 6 * 1000;

/**
 * Generate a consistent hash for an event to identify duplicates
 * Matches the database trigger criteria: productId + eventType
 */
function generateEventHash(event: CreateLifecycleEventRequest): EventHash {
  // Create a deterministic hash matching database trigger logic
  // Database trigger checks: product_id AND event_type within 5 seconds
  const { productId, eventType } = event;
  return `${productId}-${eventType}`;
}

/**
 * Clean up old events from memory
 */
function cleanupOldEvents() {
  const now = Date.now();
  for (const [hash, memory] of recentEvents.entries()) {
    if (now - memory.timestamp > MEMORY_DURATION) {
      recentEvents.delete(hash);
    }
  }
}

/**
 * Debounced event creation function - prevents duplicate events
 * by reusing the same promise for identical events within the memory window
 * Aligns with database trigger constraints (5-second duplicate prevention)
 */
export async function debounceCreateEvent(
  event: CreateLifecycleEventRequest,
  createFn: (event: CreateLifecycleEventRequest) => Promise<ProductLifecycleEvent>
): Promise<ProductLifecycleEvent> {
  // Generate a hash for this event (matching database trigger criteria)
  const eventHash = generateEventHash(event);
  
  // Clean up old events occasionally
  cleanupOldEvents();
  
  // Check if we already have a recent identical event
  const existingEvent = recentEvents.get(eventHash);
  if (existingEvent) {
    // Calculate time since last attempt
    const timeSinceLastAttempt = Date.now() - existingEvent.timestamp;
    console.log(`Deduplicating event creation: ${eventHash} (${timeSinceLastAttempt}ms ago, using cached promise)`);
    return existingEvent.promise;
  }
  
  // Create a new promise for this event
  const promise = createFn(event);
  
  // Store it in memory
  recentEvents.set(eventHash, {
    eventHash,
    timestamp: Date.now(),
    promise
  });
  
  try {
    // Wait for the promise to resolve
    const result = await promise;
    console.log(`Successfully created event: ${eventHash}`);
    return result;
  } catch (error) {
    // Handle database duplicate constraint errors gracefully
    if (error instanceof Error && 
        (error.message.includes('Duplicate event detected') || 
         error.message.includes('similar event was created within the last'))) {
      console.warn(`Database prevented duplicate: ${eventHash}, error handled by service`);
      // Don't remove from memory immediately for database constraint errors
      // Let the memory cleanup handle it after the timeout
    } else {
      // For other errors, remove from memory so we can try again
      recentEvents.delete(eventHash);
      console.error(`Event creation failed: ${eventHash}`, error);
    }
    throw error;
  }
}
