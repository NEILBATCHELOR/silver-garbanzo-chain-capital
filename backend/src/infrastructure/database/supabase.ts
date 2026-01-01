/**
 * Supabase Client for Backend Services
 * 
 * Provides Supabase client for services that need direct database access
 * Used by DeploymentAuditService and other services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../../config/env';

// Check if credentials are configured
const isConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!isConfigured) {
  console.warn('⚠️  Supabase credentials not configured. Supabase client will not be available.');
  console.warn('    SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.warn('    SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
}

/**
 * Supabase client instance with service role key
 * Bypasses RLS for admin operations
 * Returns null if credentials are not configured
 */
export const supabase: SupabaseClient | null = isConfigured 
  ? createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

/**
 * Get Supabase client with error handling
 * Throws error if client is not available
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabase;
}

export default supabase;
