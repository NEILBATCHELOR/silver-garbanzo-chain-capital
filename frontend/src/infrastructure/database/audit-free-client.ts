import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/core/supabase";

// AUDIT-FREE SUPABASE CLIENT
// This client is used specifically for audit operations to prevent circular dependencies
// It does NOT have the audit proxy enabled

// Use environment variables with fallbacks for different environments
const getEnv = (key: string): string => {
  // Handle Vite's environment variables
  // @ts-ignore - Ignore import.meta TypeScript errors
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore - Ignore import.meta TypeScript errors
    const value = import.meta.env[key] || '';
    return value;
  }
  // Handle Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key] || '';
    return value;
  }
  return '';
};

// Hardcoded fallbacks for development only - in production, use environment variables
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jrwfkxfzsnnjppogthaw.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2ZreGZ6c25uanBwb2d0aGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjA1MjAsImV4cCI6MjA1NjMzNjUyMH0.KN_T8V314VlXMLfV7ul0NSeOYW0cDVU5UESGfYQMtek';

// Singleton pattern for audit-free client
let auditFreeSupabaseInstance: any = null;

// Create audit-free Supabase client (singleton, no audit proxy)
function createAuditFreeSupabaseClient() {
  if (auditFreeSupabaseInstance) {
    return auditFreeSupabaseInstance;
  }
  
  console.log('Creating audit-free Supabase client instance');
  
  auditFreeSupabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        "x-client-info": "chain-capital-audit-service",
      },
      // Add fetch options to help with resource limitations
      fetch: (url, options) => {
        const fetchOptions = {
          ...options,
          // Set timeout to avoid hanging connections
          signal: AbortSignal.timeout(20000), // 20 second timeout
        };
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
  
  return auditFreeSupabaseInstance;
}

// Export the audit-free Supabase client (NO AUDIT PROXY)
export const auditFreeSupabase = createAuditFreeSupabaseClient();

// Get current user ID for audit tracking
export async function getCurrentUserId(): Promise<string | undefined> {
  try {
    const { data: { user } } = await auditFreeSupabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}
