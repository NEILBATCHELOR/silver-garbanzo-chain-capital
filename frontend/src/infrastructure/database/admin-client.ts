import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/core/supabase";

/**
 * Admin Client for Supabase Operations Requiring Service Role Privileges
 * Used for operations like auth.users deletion, which require elevated permissions
 */

// Environment variable getter with fallbacks
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

// Get environment variables
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://jrwfkxfzsnnjppogthaw.supabase.co';
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Available env keys:', Object.keys(process?.env || {}).filter(key => key.includes('SUPABASE')));
}

// Create admin client with service role key
let adminClientInstance: any = null;

function createAdminClient() {
  if (adminClientInstance) {
    return adminClientInstance;
  }
  
  console.log('🔐 Creating Supabase admin client with service role');
  
  adminClientInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        "x-client-info": "chain-capital-admin",
      },
    },
  });
  
  return adminClientInstance;
}

// Export the admin client
export const adminClient = createAdminClient();

// Utility function to check if admin client is properly configured
export const verifyAdminClient = async (): Promise<boolean> => {
  try {
    if (!serviceRoleKey) {
      console.error('❌ Service role key not available');
      return false;
    }
    
    // Test admin access by attempting to list auth users (should work with service role)
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.error('❌ Admin client verification failed:', error.message);
      return false;
    }
    
    console.log('✅ Admin client verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Admin client verification exception:', error);
    return false;
  }
};

/**
 * Safely delete a user from auth.users using admin privileges
 * @param authUserId - The auth user ID to delete
 * @returns Promise<boolean> - Success status
 */
export const deleteAuthUser = async (authUserId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Attempting to delete auth user: ${authUserId}`);
    
    // Verify admin client first
    const isAdminReady = await verifyAdminClient();
    if (!isAdminReady) {
      throw new Error('Admin client not properly configured');
    }
    
    // Delete the user from auth.users
    const { error } = await adminClient.auth.admin.deleteUser(authUserId);
    
    if (error) {
      console.error('❌ Failed to delete auth user:', error.message);
      return false;
    }
    
    console.log('✅ Successfully deleted auth user');
    return true;
  } catch (error) {
    console.error('❌ Exception during auth user deletion:', error);
    return false;
  }
};
