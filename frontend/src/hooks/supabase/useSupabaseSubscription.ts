import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/database/client';

type SupabaseEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type SubscriptionCallback = (payload: any) => void;
type SubscriptionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

interface SupabaseSubscriptionOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: SupabaseEvent | SupabaseEvent[];
  callback: SubscriptionCallback;
  onError?: (error: any) => void;
  pollingInterval?: number; // Fallback polling interval in ms
}

/**
 * Custom hook for Supabase real-time subscriptions with fallback polling
 * 
 * This hook will attempt to use Supabase's real-time subscriptions first,
 * and if that fails, it will fall back to polling the database at regular intervals.
 */
export function useSupabaseSubscription({
  table,
  schema = 'public',
  filter,
  event = '*',
  callback,
  onError,
  pollingInterval = 900000, // Default to 15 minutes (15 * 60 * 1000)
}: SupabaseSubscriptionOptions) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const pollingIntervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;
    let pollingIntervalId: NodeJS.Timeout | null = null;

    const setupSubscription = () => {
      try {
        // Create a unique channel name
        const channelName = `${table}:${filter || 'all'}-${Date.now()}`;
        const channel = supabase.channel(channelName);
        
        // Store reference for cleanup
        channelRef.current = channel;

        // Handle multiple events if an array is provided
        const events = Array.isArray(event) ? event : [event];
        
        // Process filter properly to prevent malformed UUIDs
        const processedFilter = processFilter(filter);
        
        events.forEach(eventType => {
          if (eventType === '*') {
            ['INSERT', 'UPDATE', 'DELETE'].forEach(specificEvent => {
              channel.on(
                'postgres_changes',
                { 
                  event: specificEvent as any, 
                  schema, 
                  table,
                  ...(processedFilter ? { filter: processedFilter } : {})
                },
                callback
              );
            });
          } else {
            channel.on(
              'postgres_changes',
              { 
                event: eventType as any, 
                schema, 
                table,
                ...(processedFilter ? { filter: processedFilter } : {})
              },
              callback
            );
          }
        });
        
        // Helper function to process filter strings safely
        function processFilter(filterString?: string): string | undefined {
          if (!filterString) return undefined;
          
          try {
            // For eq filters with UUIDs, make sure we sanitize any potential issues
            if (filterString.includes('=eq.')) {
              const [column, operatorValue] = filterString.split('=');
              // Parse the value to ensure it doesn't have trailing parts like '.undefined'
              const rawValue = operatorValue.replace('eq.', '');
              // Clean UUID or other values that might have unexpected segments
              const cleanValue = rawValue.includes('.') ? rawValue.split('.')[0] : rawValue;
              return `${column}=eq.${cleanValue}`;
            }
            
            return filterString;
          } catch (err) {
            console.error('Error processing filter:', err);
            return undefined;
          }
        }

        // Subscribe with status tracking
        // The subscribe method doesn't return a Promise in newer Supabase versions
        subscription = channel.subscribe((status: SubscriptionStatus) => {
          if (!isMountedRef.current) return; // Prevent state updates after unmount
          
          if (status === 'SUBSCRIBED') {
            console.log(`Successfully subscribed to ${table} real-time updates`);
            setIsSubscribed(true);
            setIsPolling(false);
            setError(null);
          } else {
            console.error(`Subscription ${status}`);
            setIsSubscribed(false);
            setupPolling();
            
            // Report error if the status indicates an error
            if (status === 'CHANNEL_ERROR' && onError) {
              onError(new Error(`Subscription error: ${status}`));
            }
          }
        });
        
      } catch (err) {
        console.error('Error setting up Supabase subscription:', err);
        if (isMountedRef.current) {
          setError(err);
          setIsSubscribed(false);
          setupPolling();
        }
        
        if (onError) {
          onError(err);
        }
      }
    };

    const setupPolling = () => {
      if (!pollingIntervalIdRef.current && pollingInterval > 0 && isMountedRef.current) {
        console.log(`Falling back to polling for ${table} every ${pollingInterval}ms`);
        setIsPolling(true);
        
        // This would be your fetch function
        const fetchData = async () => {
          // Skip if component unmounted
          if (!isMountedRef.current) return;
          
          try {
            const query = supabase
              .from(table)
              .select('*')
              .order('created_at', { ascending: false });
              
            // Apply filter if provided
            if (filter) {
              try {
                // Parse the filter with more robustness
                if (filter.includes('=eq.')) {
                  // Format: 'column=eq.value'
                  const [column, operatorValue] = filter.split('=');
                  // Extract just the value part, ensuring we don't include undefined
                  const value = operatorValue.replace('eq.', '');
                  // Ensure UUID values are properly formatted without any trailing parts
                  const cleanValue = value.includes('.') ? value.split('.')[0] : value;
                  query.eq(column, cleanValue);
                } else if (filter.includes('=')) {
                  // Handle other operators
                  const [column, operatorValue] = filter.split('=');
                  const [operator, value] = operatorValue.includes('.') ? 
                    [operatorValue.split('.')[0], operatorValue.split('.').slice(1).join('.')] : 
                    [operatorValue, null];
                  
                  // Ensure we have a valid value
                  if (value) {
                    // Apply raw filter
                    query.filter(column, operator, value);
                  } else {
                    // Fallback to just getting all records if filter is malformed
                    console.warn('Malformed filter:', filter);
                  }
                } else {
                  console.warn('Unsupported filter format:', filter);
                }
              } catch (err) {
                console.error('Error parsing filter:', err);
                // Continue with unfiltered query on error
              }
            }
            
            const { data, error: fetchError } = await query;
              
            if (!fetchError && data && isMountedRef.current) {
              // Process each item through the callback
              data.forEach(item => {
                callback({ new: item, eventType: 'POLL' });
              });
            } else if (fetchError) {
              console.error('Error polling data:', fetchError);
            }
          } catch (err) {
            console.error('Error polling data:', err);
          }
        };
        
        // Initial fetch
        fetchData();
        
        // Set up interval
        const intervalId = setInterval(fetchData, pollingInterval);
        pollingIntervalId = intervalId;
        pollingIntervalIdRef.current = intervalId;
      }
    };

    setupSubscription();

    // Set mounted flag
    isMountedRef.current = true;

    return () => {
      // Immediately mark component as unmounted to prevent further state updates
      isMountedRef.current = false;
      
      // Multi-layered, defensive cleanup for subscriptions
      try {
        // Step 1: Clean up the stored channel reference
        if (channelRef.current) {
          try {
            console.log('Cleaning up Supabase subscription');
            
            // First try unsubscribing from the channel - wrap in try/catch to prevent errors
            try {
              channelRef.current.unsubscribe();
            } catch (unsubError) {
              console.warn('Unsubscribe error (non-critical):', unsubError);
              // Continue with cleanup even if this fails
            }
            
            // Now try removing the channel - wrap in try/catch to prevent errors
            try {
              supabase.removeChannel(channelRef.current);
            } catch (removeError) {
              console.warn('Remove channel error (non-critical):', removeError);
              // Continue with cleanup even if this fails
            }
            
            // Clear the reference
            channelRef.current = null;
          } catch (channelError) {
            console.warn('Channel cleanup error (non-critical):', channelError);
            // Continue with cleanup even if channel removal fails
          }
        }
        
        // Step 2: Also try cleanup on the subscription variable as backup
        if (subscription) {
          try {
            // Try each cleanup method separately to ensure maximum cleanup
            try {
              subscription.unsubscribe();
            } catch (err) { /* Ignore errors, this is a backup method */ }
            
            try {
              supabase.removeChannel(subscription);
            } catch (err) { /* Ignore errors, this is a backup method */ }
            
            subscription = null;
          } catch (subError) {
            console.warn('Subscription backup cleanup error (non-critical):', subError);
            // Continue with other cleanup even if this fails
          }
        }

        // Step 3: Clean up polling interval
        if (pollingIntervalIdRef.current) {
          try {
            clearInterval(pollingIntervalIdRef.current);
            pollingIntervalIdRef.current = null;
          } catch (intervalError) {
            console.warn('Interval cleanup error (non-critical):', intervalError);
          }
        }
        
        // Step 4: Also try cleaning up with the local variable as backup
        if (pollingIntervalId) {
          try {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
          } catch (err) { /* Ignore errors, this is a backup method */ }
        }
      } catch (cleanupError) {
        // Catch-all for any other cleanup errors - critical that we don't throw during unmount
        console.warn('Error during subscription cleanup (non-critical):', cleanupError);
      }
    };
  }, [table, schema, filter, event, callback, onError, pollingInterval]);

  return { isSubscribed, isPolling, error };
}