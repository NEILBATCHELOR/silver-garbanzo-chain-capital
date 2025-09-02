import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/core/supabase";
import { unifiedAuditCoordinator } from '@/services/audit/UnifiedAuditCoordinator';

// IMPROVED AUDIT LOGGING: Event-based approach instead of proxies
// This prevents duplicate records while maintaining audit trail

// Use environment variables with fallbacks for different environments
const getEnv = (key: string): string => {
  // Handle Vite's environment variables
  // @ts-ignore - Ignore import.meta TypeScript errors
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore - Ignore import.meta TypeScript errors
    const value = import.meta.env[key] || '';
    if (value) {
      console.log(`Found ${key} in import.meta.env`);
    }
    return value;
  }
  // Handle Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key] || '';
    if (value) {
      console.log(`Found ${key} in process.env`);
    }
    return value;
  }
  return '';
};

// Hardcoded fallbacks for development only - in production, use environment variables
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jrwfkxfzsnnjppogthaw.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjA1MjAsImV4cCI6MjA1NjMzNjUyMH0.KN_T8V314VlXMLfV7ul0NSeOYW0cDVU5UESGfYQMtek';

// Log environment variables availability (without exposing full values)
console.log("Supabase configuration:", {
  urlAvailable: !!supabaseUrl,
  anonKeyAvailable: !!supabaseAnonKey,
  partialUrl: supabaseUrl.slice(0, 15) + '...',
  partialKey: supabaseAnonKey ? supabaseAnonKey.slice(0, 10) + '...' : '',
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: any = null;

// Create original Supabase client (singleton)
function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  console.log('Creating new Supabase client instance');
  
  const originalSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "x-client-info": "chain-capital-app",
      },
      // Add fetch options to help with resource limitations
      fetch: (url, options) => {
        const fetchOptions = {
          ...options,
          // Set timeout to avoid hanging connections
          signal: AbortSignal.timeout(20000), // 20 second timeout
        };
        // Use the enhanced fetch function with improved options
        return fetch(url, fetchOptions);
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 5, // Reduce from 10 to lower resource consumption
      },
    },
  });
  
  supabaseInstance = originalSupabase;
  return originalSupabase;
}

// Get current user ID for audit tracking (moved to audit-free-client.ts to prevent circular import)

// Helper function to extract record ID from data
function extractRecordId(data: any): string {
  if (!data) return 'unknown';
  
  // Try common ID patterns
  if (data.id) return String(data.id);
  if (data.uuid) return String(data.uuid);
  if (data.user_id) return String(data.user_id);
  if (data.project_id) return String(data.project_id);
  if (data.investor_id) return String(data.investor_id);
  
  // For arrays, get first item's ID
  if (Array.isArray(data) && data.length > 0) {
    return extractRecordId(data[0]);
  }
  
  // Fallback to stringified data (truncated)
  return JSON.stringify(data).substring(0, 50);
}

// Event-based audit logging functions that don't interfere with the original operations
const auditLogger = {
  // Log database operations after they complete successfully
  logOperation: async (tableName: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', data: any, details: any = {}) => {
    try {
      const recordId = operation === 'DELETE' ? 'deleted_record' : extractRecordId(data);
      
      // Use a timeout to ensure this happens outside the main execution path
      setTimeout(async () => {
        try {
          await unifiedAuditCoordinator.logDatabaseOperation(
            tableName,
            operation,
            recordId,
            data,
            {
              ...details,
              tracked_at: new Date().toISOString(),
              user_agent: typeof navigator !== 'undefined' ? navigator?.userAgent : 'server',
            }
          );
        } catch (error) {
          console.warn(`⚠️ Audit logging failed for ${operation} on ${tableName}:`, error);
        }
      }, 0);
    } catch (error) {
      // Silently fail - audit should never break main functionality
      console.warn(`⚠️ Audit preparation failed for ${operation} on ${tableName}:`, error);
    }
  }
};

// Export the direct Supabase client (singleton)
export const supabase = createSupabaseClient();

// Enhanced database operation helpers with audit logging
export const enhancedOperations = {
  // Insert with audit logging
  async insert<T = any>(tableName: string, data: any, options: any = {}): Promise<{ data: T | null; error: any }> {
    // Perform the actual database operation
    const result = await supabase.from(tableName).insert(data, options);
    
    // If operation was successful, log it for audit (outside the main execution path)
    if (result.data && !result.error) {
      auditLogger.logOperation(tableName, 'CREATE', result.data, {
        method: 'insert',
        operation_type: 'INSERT'
      });
    }
    
    return result;
  },
  
  // Update with audit logging
  async update<T = any>(tableName: string, data: any, query: any): Promise<{ data: T | null; error: any }> {
    // First construct the query
    let queryBuilder = supabase.from(tableName);
    
    // Apply filters
    if (query.eq) {
      Object.entries(query.eq).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    if (query.in) {
      Object.entries(query.in).forEach(([key, values]) => {
        queryBuilder = queryBuilder.in(key, values as any[]);
      });
    }
    
    // Execute the update
    const result = await queryBuilder.update(data);
    
    // If operation was successful, log it for audit
    if (result.data && !result.error) {
      auditLogger.logOperation(tableName, 'UPDATE', result.data, {
        method: 'update',
        operation_type: 'UPDATE'
      });
    }
    
    return result;
  },
  
  // Upsert with audit logging
  async upsert<T = any>(tableName: string, data: any, options: any = {}): Promise<{ data: T | null; error: any }> {
    const result = await supabase.from(tableName).upsert(data, options);
    
    if (result.data && !result.error) {
      auditLogger.logOperation(tableName, 'UPDATE', result.data, {
        method: 'upsert',
        operation_type: 'UPSERT'
      });
    }
    
    return result;
  },
  
  // Delete with audit logging
  async delete<T = any>(tableName: string, query: any): Promise<{ data: T | null; error: any }> {
    // Construct the query
    let queryBuilder = supabase.from(tableName);
    
    // Apply filters
    if (query.eq) {
      Object.entries(query.eq).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    if (query.in) {
      Object.entries(query.in).forEach(([key, values]) => {
        queryBuilder = queryBuilder.in(key, values as any[]);
      });
    }
    
    // Execute the delete
    const result = await queryBuilder.delete();
    
    // Log the delete operation for audit
    if (!result.error) {
      auditLogger.logOperation(tableName, 'DELETE', { table: tableName, query }, {
        method: 'delete',
        operation_type: 'DELETE'
      });
    }
    
    return result;
  },
  
  // Select (read) operations don't need audit logging in most cases
  select: supabase.from.bind(supabase)
};

// Keep all other existing functions unchanged
const MAX_RETRIES = 8; // Increased from 5
const INITIAL_BACKOFF_MS = 800; // Increased from 500
const MAX_BACKOFF_MS = 15000; // 15 seconds

/**
 * Executes a Supabase query with enhanced retry logic
 * @param operation Function that returns a Supabase query or any other promise
 * @param retries Number of retries remaining (defaults to MAX_RETRIES)
 * @param backoff Current backoff time in ms (defaults to INITIAL_BACKOFF_MS)
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T> | T,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF_MS
): Promise<T> {
  try {
    const result = operation();
    // Handle both Promise and non-Promise results
    return result instanceof Promise ? await result : result;
  } catch (error: any) {
    const errorMsg = error?.message || '';
    const isResourceError = errorMsg.includes('ERR_INSUFFICIENT_RESOURCES');
    const isConnectionError = 
      errorMsg.includes('Failed to fetch') || 
      errorMsg.includes('ERR_CONNECTION_CLOSED') || 
      errorMsg.includes('network error') ||
      errorMsg.includes('NetworkError') ||
      isResourceError;
    
    // If we're out of retries or this isn't a connection error, rethrow
    if (retries <= 0 || !isConnectionError) {
      console.error('Supabase operation failed after retries:', error);
      throw error;
    }

    // Use longer backoff for resource errors
    const nextBackoff = isResourceError 
      ? Math.min(backoff * 3, MAX_BACKOFF_MS) // More aggressive backoff for resource errors
      : Math.min(backoff * 2, MAX_BACKOFF_MS); // Normal exponential backoff with cap

    console.warn(
      `Supabase operation failed (${isResourceError ? 'RESOURCE ERROR' : 'CONNECTION ERROR'}), ` +
      `retrying in ${backoff}ms... (${retries} retries left)`, 
      error
    );
    
    // Wait for the backoff period
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Retry with exponential backoff
    return executeWithRetry(operation, retries - 1, nextBackoff);
  }
}

// Enhanced debug function to check connection
export const checkSupabaseConnection = async () => {
  try {
    console.log("Testing Supabase connection...");
    // Cast to any to bypass type checking for tables not defined in the Database type
    const result = await executeWithRetry(() => 
      (supabase as any).from("projects").select("count")
    );
    
    const { data, error } = result;
    
    if (error) {
      console.error("Supabase connection error:", error);
      return { success: false, error };
    }
    console.log("Supabase connection successful:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Supabase connection exception:", err);
    return { success: false, error: err };
  }
};

// Enhanced debug function to log queries with detailed information
export const debugQuery = async (
  tableName: string,
  projectId?: string | null,
  options?: { detailed?: boolean },
) => {
  try {
    console.log(`Querying ${tableName} with projectId: ${projectId || "none"}`);
    // Cast to any to bypass type checking for tables not defined in the Database type
    let query = (supabase as any).from(tableName).select("*");

    // Only add project_id filter if projectId is provided AND we're not querying certain tables
    // that might not have project_id column
    if (
      projectId &&
      tableName !== "investors" &&
      tableName !== "cap_table_investors" &&
      tableName !== "users" &&
      tableName !== "compliance_checks" &&
      tableName !== "token_allocations"
    ) {
      query = query.eq("project_id", projectId);
    }

    const startTime = performance.now();
    
    // Use retry mechanism
    const { data, error } = await executeWithRetry(() => query);
    
    const endTime = performance.now();
    const queryTime = endTime - startTime;

    if (error) {
      console.error(`Error querying ${tableName}:`, error);

      // If the error is about a missing column, try to determine which columns exist
      if (error.code === "42703") {
        console.log(
          `Column error in ${tableName}, attempting to get table structure...`,
        );
        try {
          // Just get one row to see the structure
          const { data: sampleData } = await executeWithRetry(() => 
            (supabase as any).from(tableName).select().limit(1)
          );
          
          if (sampleData && sampleData.length > 0) {
            console.log(
              `Available columns in ${tableName}:`,
              Object.keys(sampleData[0]),
            );

            // If we're looking for project_id but it doesn't exist, check for alternative columns
            if (error.message && error.message.includes("project_id")) {
              const columns = Object.keys(sampleData[0]);
              const possibleProjectIdColumns = columns.filter(
                (col) =>
                  col.includes("project") ||
                  col.includes("project_id") ||
                  col === "pid",
              );

              if (possibleProjectIdColumns.length > 0) {
                console.log(
                  `Possible alternative project ID columns: ${possibleProjectIdColumns.join(", ")}`,
                );
              }
            }
          }
        } catch (structErr) {
          console.error(
            `Failed to get table structure for ${tableName}:`,
            structErr,
          );
        }
      }

      return { success: false, error, queryTime };
    }

    console.log(
      `Found ${data?.length || 0} records in ${tableName} (${queryTime.toFixed(2)}ms)`,
    );

    if (options?.detailed && data && data.length > 0) {
      console.log(`Sample data from ${tableName}:`, data[0]);
    }

    return { success: true, data, count: data?.length || 0, queryTime };
  } catch (err) {
    console.error(`Exception querying ${tableName}:`, err);
    return { success: false, error: err };
  }
};

// === Mocked Auth Logic ===
export async function getUserRoles() {
  return [{ role: "admin" }]; // Mock: always admin
}

export async function logAction() {
  // Mock: no-op
  return;
}

// === Active Storage Logic ===
export async function uploadDocument(file: File, path: string) {
  return executeWithRetry(async () => {
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(path, file);
    if (error) throw error;
    return data;
  });
}

// Helper functions to safely access protected properties
export function getSupabaseUrl() {
  return supabaseUrl;
}

export function getSupabaseKey() {
  return supabaseAnonKey;
}

export async function getPublicUrl(filePath: string) {
  return executeWithRetry(async () => {
    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    return data.publicUrl;
  });
}

export async function removeDocument(filePath: string) {
  return executeWithRetry(async () => {
    const { error } = await supabase.storage.from("documents").remove([filePath]);
    if (error) throw error;
    return true;
  });
}