/**
 * Wallet Audit Service
 * 
 * Provides logging and monitoring for wallet access operations.
 * Works with the wallet_access_logs table and log_wallet_access function.
 */

import { supabase } from '@/infrastructure/database/client';

export interface WalletAccessLogParams {
  walletId: string;
  accessedBy: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'decrypt' | 'encrypt' | 'sign_transaction' | 'export';
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface WalletAccessLog {
  id: string;
  wallet_id: string;
  accessed_by: string;
  action: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export class WalletAuditService {
  /**
   * Log a wallet access operation
   */
  static async logAccess(params: WalletAccessLogParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_wallet_access', {
        p_wallet_id: params.walletId,
        p_accessed_by: params.accessedBy,
        p_action: params.action,
        p_success: params.success,
        p_error_message: params.errorMessage || null,
        p_ip_address: params.ipAddress || null,
        p_user_agent: params.userAgent || null,
        p_metadata: params.metadata || null
      });

      if (error) {
        console.error('Failed to log wallet access:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Error logging wallet access:', error);
      return null;
    }
  }

  /**
   * Get access logs for a specific wallet
   */
  static async getWalletLogs(
    walletId: string,
    limit: number = 50
  ): Promise<WalletAccessLog[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_access_logs')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch wallet logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching wallet logs:', error);
      return [];
    }
  }

  /**
   * Get access logs for a specific user
   */
  static async getUserLogs(
    userId: string,
    limit: number = 50
  ): Promise<WalletAccessLog[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_access_logs')
        .select('*')
        .eq('accessed_by', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch user logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }
  }

  /**
   * Get failed access attempts
   */
  static async getFailedAttempts(
    walletId: string,
    since?: Date
  ): Promise<WalletAccessLog[]> {
    try {
      let query = supabase
        .from('wallet_access_logs')
        .select('*')
        .eq('wallet_id', walletId)
        .eq('success', false)
        .order('created_at', { ascending: false });

      if (since) {
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch failed attempts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching failed attempts:', error);
      return [];
    }
  }

  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_wallet_activity')
        .select('*');

      if (error) {
        console.error('Failed to check suspicious activity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return [];
    }
  }

  /**
   * Get wallet access summary
   */
  static async getAccessSummary(walletId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('wallet_access_summary')
        .select('*')
        .eq('wallet_id', walletId)
        .single();

      if (error) {
        console.error('Failed to fetch access summary:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching access summary:', error);
      return null;
    }
  }
}

export default WalletAuditService;
