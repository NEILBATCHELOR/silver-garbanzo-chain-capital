/**
 * Supabase Client for Backend Services
 * 
 * Provides Supabase client for services that need direct database access
 * Used by DeploymentAuditService and other services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  Supabase credentials not configured. Some features may not work.');
}

/**
 * Supabase client instance with service role key
 * Bypasses RLS for admin operations
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;
