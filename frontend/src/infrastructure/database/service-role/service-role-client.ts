import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service Role Supabase Client
 * 
 * WARNING: This client has elevated privileges and should only be used server-side
 * or for specific admin operations that cannot be performed with the regular client.
 * 
 * Uses the service_role key which bypasses Row Level Security (RLS) policies.
 */
class ServiceRoleClient {
  private static instance: ServiceRoleClient;
  private client: SupabaseClient;

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required Supabase environment variables for service role client');
    }

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  public static getInstance(): ServiceRoleClient {
    if (!ServiceRoleClient.instance) {
      ServiceRoleClient.instance = new ServiceRoleClient();
    }
    return ServiceRoleClient.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Create a user in auth.users using admin privileges
   */
  async createAuthUser(userData: {
    email: string;
    password: string;
    user_metadata?: Record<string, any>;
    email_confirm?: boolean;
  }) {
    try {
      return this.client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata || {},
        email_confirm: userData.email_confirm || false,
      });
    } catch (error: any) {
      // Add more detailed error information
      if (error.message?.includes('duplicate')) {
        throw new Error(`User with email ${userData.email} already exists in auth system`);
      }
      throw error;
    }
  }

  /**
   * Delete a user from auth.users using admin privileges
   */
  async deleteAuthUser(userId: string) {
    return this.client.auth.admin.deleteUser(userId);
  }

  /**
   * Update a user in auth.users using admin privileges
   */
  async updateAuthUser(userId: string, updates: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, any>;
    email_confirm?: boolean;
  }) {
    return this.client.auth.admin.updateUserById(userId, updates);
  }

  /**
   * Get a user from auth.users using admin privileges
   */
  async getAuthUser(userId: string) {
    return this.client.auth.admin.getUserById(userId);
  }

  /**
   * Generate an invite link
   */
  async generateInviteLink(userData: {
    email: string;
    data?: Record<string, any>;
    redirectTo?: string;
  }) {
    return this.client.auth.admin.generateLink({
      type: 'invite',
      email: userData.email,
      options: {
        data: userData.data || {},
        redirectTo: userData.redirectTo,
      }
    });
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(email: string, redirectTo?: string) {
    return this.client.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo
      }
    });
  }

  /**
   * List all users in auth.users using admin privileges
   */
  async listAuthUsers() {
    return this.client.auth.admin.listUsers();
  }

  /**
   * Direct database access with service role privileges
   * CAUTION: This bypasses RLS policies
   */
  get database() {
    return this.client;
  }
}

export const serviceRoleClient = ServiceRoleClient.getInstance();
export default serviceRoleClient;
